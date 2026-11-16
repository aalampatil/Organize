import { and, eq } from 'drizzle-orm';
import type { UploadMetadata } from '@organize/contracts';
import type { Database } from '../../db/connection.js';
import { items } from '../../db/schema.js';
import { AppError, notFound } from '../../lib/errors.js';
import type { StorageGateway } from '../../providers/contracts.js';
import { extractText } from '../../providers/extraction/extract.js';
import { assertFolder } from '../folders/folders.service.js';
import { toItem } from '../library/library.mapper.js';
import { detectMimeType, filenameSchema } from './files.validation.js';

export function createFileService(db: Database, storage: StorageGateway) {
  return {
    async upload(
      userId: string,
      rawFilename: string,
      declaredMime: string,
      data: Buffer,
      metadata: UploadMetadata,
    ) {
      const filename = filenameSchema.parse(rawFilename);
      const mimeType = detectMimeType(data, declaredMime, filename);
      await assertFolder(db, userId, metadata.folderId);
      const extraction = await extractText(data, filename, mimeType);
      const asset = await storage.upload(userId, filename, data);
      try {
        const [item] = await db
          .insert(items)
          .values({
            userId,
            kind: 'file',
            title: metadata.title ?? filename,
            folderId: metadata.folderId,
            tags: metadata.tags,
            filename,
            mimeType,
            bytes: data.length,
            storageId: asset.storageId,
            extractionStatus: extraction.status,
            extractedText: extraction.text,
          })
          .returning();
        if (!item) throw new Error('File metadata could not be saved');
        return toItem(item);
      } catch (error) {
        try {
          await storage.remove(asset.storageId);
        } catch {
          throw new AppError(
            502,
            'File metadata could not be saved and storage cleanup needs attention. Contact the server administrator.',
            'UPLOAD_CLEANUP_FAILED',
          );
        }
        throw error;
      }
    },
    async download(userId: string, id: string) {
      const [item] = await db
        .select()
        .from(items)
        .where(and(eq(items.id, id), eq(items.userId, userId)));
      if (!item || item.trashedAt || !item.storageId) throw notFound();
      return storage.download(item.storageId);
    },
    remove: (userId: string, id: string) =>
      db.transaction(async (tx) => {
        const [item] = await tx
          .select()
          .from(items)
          .where(and(eq(items.id, id), eq(items.userId, userId)))
          .for('update');
        if (!item) throw notFound();
        if (!item.trashedAt)
          throw new AppError(
            409,
            'Move the item to Trash before deleting it permanently.',
            'TRASH_FIRST',
          );
        if (item.storageId) await storage.remove(item.storageId);
        await tx.delete(items).where(and(eq(items.id, id), eq(items.userId, userId)));
      }),
  };
}
