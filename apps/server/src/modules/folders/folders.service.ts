import { and, asc, count, eq, sql } from 'drizzle-orm';
import type { FolderInput, FolderUpdate } from '@organize/contracts';
import type { Database, DatabaseExecutor, Transaction } from '../../db/connection.js';
import { folders, items } from '../../db/schema.js';
import { AppError, notFound } from '../../lib/errors.js';

export async function assertFolder(db: DatabaseExecutor, userId: string, folderId: string | null) {
  if (!folderId) return;
  const [folder] = await db
    .select({ id: folders.id })
    .from(folders)
    .where(and(eq(folders.id, folderId), eq(folders.userId, userId)));
  if (!folder) throw new AppError(400, 'Choose a folder from your library.', 'INVALID_FOLDER');
}
const lockTree = (tx: Transaction, userId: string) =>
  tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${'folders:' + userId}, 0))`);
async function validateParent(
  tx: Transaction,
  userId: string,
  parentId: string | null,
  movingId?: string,
) {
  let cursor = parentId;
  const visited = new Set<string>();
  while (cursor) {
    if (cursor === movingId || visited.has(cursor))
      throw new AppError(400, 'A folder cannot be moved inside itself.', 'FOLDER_CYCLE');
    visited.add(cursor);
    if (visited.size >= 32)
      throw new AppError(400, 'Folders support up to 32 levels of nesting.', 'FOLDER_DEPTH');
    const [parent] = await tx
      .select({ parentId: folders.parentId })
      .from(folders)
      .where(and(eq(folders.id, cursor), eq(folders.userId, userId)));
    if (!parent)
      throw new AppError(400, 'Choose a parent folder from your library.', 'INVALID_FOLDER');
    cursor = parent.parentId;
  }
  return visited.size;
}

export function createFolderService(db: Database) {
  return {
    list: (userId: string) =>
      db
        .select()
        .from(folders)
        .where(eq(folders.userId, userId))
        .orderBy(asc(folders.name), asc(folders.id)),
    create: (userId: string, input: FolderInput) =>
      db.transaction(async (tx) => {
        await lockTree(tx, userId);
        const [total] = await tx
          .select({ count: count() })
          .from(folders)
          .where(eq(folders.userId, userId));
        if ((total?.count ?? 0) >= 1000)
          throw new AppError(
            400,
            'Your library has reached the 1,000 folder limit.',
            'FOLDER_LIMIT',
          );
        await validateParent(tx, userId, input.parentId);
        const [folder] = await tx
          .insert(folders)
          .values({ ...input, userId })
          .returning();
        if (!folder) throw new Error('Folder could not be created');
        return folder;
      }),
    update: (userId: string, id: string, input: FolderUpdate) =>
      db.transaction(async (tx) => {
        await lockTree(tx, userId);
        const [current] = await tx
          .select()
          .from(folders)
          .where(and(eq(folders.id, id), eq(folders.userId, userId)));
        if (!current) throw notFound();
        if (input.parentId !== undefined) {
          const parentDepth = await validateParent(tx, userId, input.parentId, id);
          const subtree = await tx.execute<{ depth: number }>(sql`
            with recursive descendants as (
              select id, 1 as depth from folders where id = ${id} and user_id = ${userId}
              union all
              select child.id, descendants.depth + 1
              from folders child join descendants on child.parent_id = descendants.id
              where child.user_id = ${userId} and descendants.depth <= 32
            ) select coalesce(max(depth), 1)::int as depth from descendants
          `);
          if (parentDepth + (subtree.rows[0]?.depth ?? 1) > 32) {
            throw new AppError(400, 'This move would exceed 32 levels of nesting.', 'FOLDER_DEPTH');
          }
        }
        const [folder] = await tx
          .update(folders)
          .set({ ...input, updatedAt: new Date() })
          .where(and(eq(folders.id, id), eq(folders.userId, userId)))
          .returning();
        return folder;
      }),
    remove: (userId: string, id: string) =>
      db.transaction(async (tx) => {
        await lockTree(tx, userId);
        const [current] = await tx
          .select()
          .from(folders)
          .where(and(eq(folders.id, id), eq(folders.userId, userId)))
          .for('update');
        if (!current) throw notFound();
        const [child] = await tx
          .select({ id: folders.id })
          .from(folders)
          .where(and(eq(folders.parentId, id), eq(folders.userId, userId)))
          .limit(1);
        const [item] = await tx
          .select({ id: items.id })
          .from(items)
          .where(and(eq(items.folderId, id), eq(items.userId, userId)))
          .limit(1);
        if (child || item)
          throw new AppError(
            409,
            'Move this folder’s items and subfolders before deleting it. Check Trash too.',
            'FOLDER_NOT_EMPTY',
          );
        await tx.delete(folders).where(and(eq(folders.id, id), eq(folders.userId, userId)));
      }),
  };
}
