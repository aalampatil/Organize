import { z } from 'zod';

export const idSchema = z.uuid();
export const nameSchema = z.string().trim().min(1, 'A title is required').max(180);
export const tagsSchema = z
  .array(
    z
      .string()
      .trim()
      .toLowerCase()
      .min(1)
      .max(40)
      .regex(/^[\p{L}\p{N} _-]+$/u, 'Use letters, numbers, spaces, hyphens, or underscores'),
  )
  .max(20)
  .transform((tags) => [...new Set(tags)]);
export const noteInputSchema = z
  .object({
    title: nameSchema,
    body: z.string().max(200_000).default(''),
    folderId: idSchema.nullable().default(null),
    tags: tagsSchema.default([]),
  })
  .strict();
export const itemUpdateSchema = z
  .object({
    title: nameSchema.optional(),
    body: z.string().max(200_000).optional(),
    folderId: idSchema.nullable().optional(),
    tags: tagsSchema.optional(),
    favorite: z.boolean().optional(),
    trashed: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one change');
export const folderInputSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    parentId: idSchema.nullable().default(null),
    color: z.enum(['sage', 'blue', 'amber', 'rose', 'lavender']).default('sage'),
  })
  .strict();
export const folderUpdateSchema = folderInputSchema
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one change');
export const uploadMetadataSchema = z
  .object({
    title: nameSchema.optional(),
    folderId: idSchema.nullable().default(null),
    tags: tagsSchema.default([]),
  })
  .strict();
// Device paths, permissions, bookmarks, handles, and file contents stay on the device.
export const referenceFileSchema = z
  .object({
    filename: z
      .string()
      .trim()
      .min(1)
      .max(255)
      .regex(/^[^/\\\u0000]+$/, 'Use a filename, not a path'),
    mimeType: z.string().trim().min(1).max(255),
    bytes: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  })
  .strict();
export const referenceInputSchema = referenceFileSchema.extend(uploadMetadataSchema.shape).strict();
const queryBoolean = z.enum(['true', 'false']).transform((value) => value === 'true');
export const libraryQuerySchema = z
  .object({
    q: z.string().trim().max(200).default(''),
    kind: z.enum(['note', 'file', 'image', 'pdf']).optional(),
    folderId: z.union([idSchema, z.literal('root')]).optional(),
    tag: z.string().trim().toLowerCase().max(40).optional(),
    favorite: queryBoolean.optional(),
    trash: queryBoolean.default(false),
    sort: z.enum(['recent', 'oldest', 'title']).default('recent'),
    limit: z.coerce.number().int().min(1).max(50).default(30),
    offset: z.coerce.number().int().min(0).max(100_000).default(0),
  })
  .strict();
export const folderSchema = z.object({
  id: idSchema,
  name: z.string(),
  parentId: idSchema.nullable(),
  color: folderInputSchema.shape.color,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export const itemSchema = z.object({
  id: idSchema,
  kind: z.enum(['note', 'file']),
  title: z.string(),
  body: z.string(),
  excerpt: z.string(),
  folderId: idSchema.nullable(),
  tags: z.array(z.string()),
  favorite: z.boolean(),
  trashedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  file: z
    .object({
      filename: z.string(),
      mimeType: z.string(),
      bytes: z.number(),
      source: z.enum(['upload', 'reference']),
      extractionStatus: z.enum(['ready', 'unsupported', 'failed']),
    })
    .nullable(),
});
export const libraryPageSchema = z.object({
  items: z.array(itemSchema),
  total: z.number(),
  nextOffset: z.number().nullable(),
});
export const tagFacetSchema = z.object({ name: z.string(), count: z.number() });
export const statsSchema = z.object({
  total: z.number(),
  notes: z.number(),
  files: z.number(),
  favorites: z.number(),
  bytes: z.number(),
});
export const downloadSchema = z.object({ url: z.url(), expiresAt: z.iso.datetime() });
export type NoteInput = z.infer<typeof noteInputSchema>;
export type ItemUpdate = z.infer<typeof itemUpdateSchema>;
export type FolderInput = z.infer<typeof folderInputSchema>;
export type FolderUpdate = z.infer<typeof folderUpdateSchema>;
export type UploadMetadata = z.infer<typeof uploadMetadataSchema>;
export type ReferenceFile = z.infer<typeof referenceFileSchema>;
export type ReferenceInput = z.infer<typeof referenceInputSchema>;
export type LibraryQuery = z.infer<typeof libraryQuerySchema>;
export type Folder = z.infer<typeof folderSchema>;
export type Item = z.infer<typeof itemSchema>;
export type LibraryPage = z.infer<typeof libraryPageSchema>;
export type LibraryStats = z.infer<typeof statsSchema>;
export type TagFacet = z.infer<typeof tagFacetSchema>;
