import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  bigint,
  index,
  unique,
  foreignKey,
  customType,
  check,
} from 'drizzle-orm/pg-core';

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const vector = customType<{ data: string }>({ dataType: () => 'tsvector' });

export const users = pgTable('users', {
  id: uuid().primaryKey().defaultRandom(),
  email: text().notNull().unique(),
  createdAt: createdAt(),
});
export const otpChallenges = pgTable('otp_challenges', {
  email: text().primaryKey(),
  codeHash: text('code_hash').notNull(),
  attempts: integer().notNull().default(0),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
});
export const sessions = pgTable(
  'sessions',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index('sessions_user_idx').on(table.userId),
    index('sessions_expiry_idx').on(table.expiresAt),
  ],
);
export const folders = pgTable(
  'folders',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id'),
    name: text().notNull(),
    color: text().notNull().default('sage'),
    createdAt: createdAt(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('folders_id_owner_unique').on(table.id, table.userId),
    foreignKey({
      columns: [table.parentId, table.userId],
      foreignColumns: [table.id, table.userId],
      name: 'folders_parent_owner_fk',
    }),
    check('folders_not_self_parent', sql`${table.id} <> ${table.parentId}`),
    index('folders_owner_parent_idx').on(table.userId, table.parentId),
  ],
);
export const items = pgTable(
  'items',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: text().$type<'note' | 'file'>().notNull(),
    title: text().notNull(),
    body: text().notNull().default(''),
    extractedText: text('extracted_text').notNull().default(''),
    folderId: uuid('folder_id'),
    tags: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    favorite: boolean().notNull().default(false),
    trashedAt: timestamp('trashed_at', { withTimezone: true }),
    filename: text(),
    mimeType: text('mime_type'),
    bytes: bigint({ mode: 'number' }),
    storageId: text('storage_id'),
    extractionStatus: text('extraction_status').$type<'ready' | 'unsupported' | 'failed'>(),
    searchText: text('search_text').notNull().default(''),
    searchVector: vector('search_vector')
      .notNull()
      .default(sql`''::tsvector`),
    createdAt: createdAt(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.folderId, table.userId],
      foreignColumns: [folders.id, folders.userId],
      name: 'items_folder_owner_fk',
    }),
    index('items_owner_recent_idx').on(table.userId, table.updatedAt),
    index('items_owner_folder_idx').on(table.userId, table.folderId),
    index('items_search_vector_idx').using('gin', table.searchVector),
    index('items_tags_idx').using('gin', table.tags),
    check('items_kind_check', sql`${table.kind} in ('note', 'file')`),
    check(
      'items_file_metadata_check',
      sql`${table.kind} = 'note' or (${table.filename} is not null and ${table.mimeType} is not null and ${table.bytes} > 0 and ${table.storageId} is not null and ${table.extractionStatus} is not null)`,
    ),
  ],
);
export type ItemRow = typeof items.$inferSelect;
