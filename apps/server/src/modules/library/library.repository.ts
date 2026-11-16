import {
  and,
  arrayContains,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  ilike,
  isNotNull,
  isNull,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import type { LibraryQuery } from '@organize/contracts';
import type { Database } from '../../db/connection.js';
import { items } from '../../db/schema.js';
import { escapeLike } from '../../lib/security.js';
import { toItem } from './library.mapper.js';

export function libraryWhere(userId: string, query: LibraryQuery) {
  const conditions: SQL[] = [
    eq(items.userId, userId),
    query.trash ? isNotNull(items.trashedAt) : isNull(items.trashedAt),
  ];
  if (query.kind === 'note' || query.kind === 'file') conditions.push(eq(items.kind, query.kind));
  if (query.kind === 'image') conditions.push(ilike(items.mimeType, 'image/%'));
  if (query.kind === 'pdf') conditions.push(eq(items.mimeType, 'application/pdf'));
  if (query.folderId)
    conditions.push(
      query.folderId === 'root' ? isNull(items.folderId) : eq(items.folderId, query.folderId),
    );
  if (query.tag) conditions.push(arrayContains(items.tags, [query.tag]));
  if (query.favorite !== undefined) conditions.push(eq(items.favorite, query.favorite));
  if (query.q)
    conditions.push(
      or(
        sql`${items.searchVector} @@ websearch_to_tsquery('simple', ${query.q})`,
        ilike(items.searchText, `%${escapeLike(query.q)}%`),
      )!,
    );
  return and(...conditions);
}
export function createLibraryRepository(db: Database) {
  return {
    async list(userId: string, query: LibraryQuery) {
      const where = libraryWhere(userId, query);
      const {
        searchText: _searchText,
        searchVector: _vector,
        storageId: _storage,
        ...columns
      } = getTableColumns(items);
      const order: SQL[] = [];
      if (query.q)
        order.push(
          sql`ts_rank_cd(${items.searchVector}, websearch_to_tsquery('simple', ${query.q})) desc`,
        );
      order.push(
        query.sort === 'title'
          ? asc(items.title)
          : query.sort === 'oldest'
            ? asc(items.updatedAt)
            : desc(items.updatedAt),
        asc(items.id),
      );
      // One snapshot keeps count and page consistent when another request saves an item.
      return db.transaction(
        async (tx) => {
          const [summary] = await tx.select({ total: count() }).from(items).where(where);
          const rows = await tx
            .select({
              ...columns,
              body: sql<string>`left(${items.body}, 240)`,
              extractedText: sql<string>`left(${items.extractedText}, 240)`,
            })
            .from(items)
            .where(where)
            .orderBy(...order)
            .limit(query.limit)
            .offset(query.offset);
          const total = summary?.total ?? 0;
          return {
            items: rows.map(toItem),
            total,
            nextOffset: query.offset + rows.length < total ? query.offset + rows.length : null,
          };
        },
        { isolationLevel: 'repeatable read', accessMode: 'read only' },
      );
    },
    async stats(userId: string) {
      const [result] = await db
        .select({
          total: count(),
          notes: sql<number>`count(*) filter (where kind = 'note')`.mapWith(Number),
          files: sql<number>`count(*) filter (where kind = 'file')`.mapWith(Number),
          favorites: sql<number>`count(*) filter (where favorite)`.mapWith(Number),
          bytes: sql<number>`coalesce(sum(bytes), 0)`.mapWith(Number),
        })
        .from(items)
        .where(and(eq(items.userId, userId), isNull(items.trashedAt)));
      return result ?? { total: 0, notes: 0, files: 0, favorites: 0, bytes: 0 };
    },
    async tags(userId: string) {
      const result = await db.execute<{ name: string; count: number }>(
        sql`select unnest(tags) as name, count(*)::int as count from items where user_id = ${userId} and trashed_at is null group by name order by count desc, name asc limit 200`,
      );
      return result.rows;
    },
  };
}
