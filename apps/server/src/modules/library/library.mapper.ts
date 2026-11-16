import type { Item } from '@organize/contracts';
import type { ItemRow } from '../../db/schema.js';

export function toItem(row: Omit<ItemRow, 'searchText' | 'searchVector' | 'storageId'>): Item {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    excerpt: (row.body || row.extractedText).replace(/\s+/g, ' ').trim().slice(0, 220),
    folderId: row.folderId,
    tags: row.tags,
    favorite: row.favorite,
    trashedAt: row.trashedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    file:
      row.kind === 'file'
        ? {
            filename: row.filename!,
            mimeType: row.mimeType!,
            bytes: row.bytes!,
            extractionStatus: row.extractionStatus!,
          }
        : null,
  };
}
