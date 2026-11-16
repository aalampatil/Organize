import type { FastifyInstance } from 'fastify';
import { idSchema, uploadMetadataSchema } from '@organize/contracts';
import type { Database } from '../../db/connection.js';
import { AppError } from '../../lib/errors.js';
import type { StorageGateway } from '../../providers/storage.js';
import { createFileService } from './files.service.js';

export function registerFileRoutes(
  app: FastifyInstance,
  db: Database,
  storage: StorageGateway,
  maxBytes: number,
) {
  const service = createFileService(db, storage);
  app.post(
    '/v1/files',
    { config: { rateLimit: { max: 15, timeWindow: '1 minute' } } },
    async (request, reply) => {
      let file: { filename: string; mime: string; data: Buffer } | undefined;
      let metadata: unknown = {};
      for await (const part of request.parts({
        limits: { fileSize: maxBytes, files: 1, fields: 1, fieldSize: 4096, parts: 2 },
      })) {
        if (part.type === 'file') {
          if (part.fieldname !== 'file')
            throw new AppError(400, 'Use the file upload field.', 'INVALID_UPLOAD');
          const data = await part.toBuffer();
          if (part.file.truncated)
            throw new AppError(413, 'The file exceeds the upload limit.', 'FILE_TOO_LARGE');
          file = { filename: part.filename, mime: part.mimetype, data };
        } else {
          if (
            part.fieldname !== 'metadata' ||
            part.valueTruncated ||
            typeof part.value !== 'string'
          )
            throw new AppError(400, 'Upload metadata is invalid.', 'INVALID_UPLOAD');
          try {
            metadata = JSON.parse(part.value);
          } catch {
            throw new AppError(400, 'Upload metadata must be valid JSON.', 'INVALID_UPLOAD');
          }
        }
      }
      if (!file) throw new AppError(400, 'Choose a file to upload.', 'FILE_REQUIRED');
      return reply
        .code(201)
        .send(
          await service.upload(
            request.user.id,
            file.filename,
            file.mime,
            file.data,
            uploadMetadataSchema.parse(metadata),
          ),
        );
    },
  );
  app.get<{ Params: { id: string } }>('/v1/items/:id/download', (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    return service.download(request.user.id, idSchema.parse(request.params.id));
  });
  app.delete<{ Params: { id: string } }>('/v1/items/:id', async (request, reply) => {
    await service.remove(request.user.id, idSchema.parse(request.params.id));
    return reply.code(204).send();
  });
}
