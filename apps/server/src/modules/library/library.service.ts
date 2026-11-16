import { and, eq } from 'drizzle-orm';
import type { ItemUpdate, NoteInput } from '@organize/contracts';
import type { Database } from '../../db/connection.js';
import { items } from '../../db/schema.js';
import { AppError, notFound } from '../../lib/errors.js';
import { assertFolder } from '../folders/folders.service.js';
import { toItem } from './library.mapper.js';

export function createLibraryService(db: Database) {
  return {
    async get(userId: string, id: string) {
      const [item] = await db
        .select()
        .from(items)
        .where(and(eq(items.id, id), eq(items.userId, userId)));
      if (!item) throw notFound();
      return toItem(item);
    },
    createNote: (userId: string, input: NoteInput) =>
      db.transaction(async (tx) => {
        await assertFolder(tx, userId, input.folderId);
        const [item] = await tx
          .insert(items)
          .values({ ...input, userId, kind: 'note' })
          .returning();
        if (!item) throw new Error('Note could not be created');
        return toItem(item);
      }),
    update: (userId: string, id: string, input: ItemUpdate) =>
      db.transaction(async (tx) => {
        const [current] = await tx
          .select()
          .from(items)
          .where(and(eq(items.id, id), eq(items.userId, userId)))
          .for('update');
        if (!current) throw notFound();
        if (input.body !== undefined && current.kind !== 'note')
          throw new AppError(400, 'Only notes have an editable body.', 'NOT_A_NOTE');
        if (current.trashedAt && (Object.keys(input).length !== 1 || input.trashed !== false))
          throw new AppError(400, 'Restore this item before editing it.', 'ITEM_IN_TRASH');
        if (input.folderId !== undefined) await assertFolder(tx, userId, input.folderId);
        const { trashed, ...fields } = input;
        const [item] = await tx
          .update(items)
          .set({
            ...fields,
            updatedAt: new Date(),
            ...(trashed !== undefined ? { trashedAt: trashed ? new Date() : null } : {}),
          })
          .where(and(eq(items.id, id), eq(items.userId, userId)))
          .returning();
        if (!item) throw notFound();
        return toItem(item);
      }),
  };
}
