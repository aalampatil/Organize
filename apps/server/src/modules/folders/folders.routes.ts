import type { FastifyInstance } from 'fastify';
import { folderInputSchema, folderUpdateSchema, idSchema } from '@organize/contracts';
import type { Database } from '../../db/connection.js';
import { createFolderService } from './folders.service.js';

export function registerFolderRoutes(app: FastifyInstance, db: Database) {
  const service = createFolderService(db);
  app.get('/v1/folders', (request) => service.list(request.user.id));
  app.post('/v1/folders', async (request, reply) =>
    reply
      .code(201)
      .send(await service.create(request.user.id, folderInputSchema.parse(request.body))),
  );
  app.patch<{ Params: { id: string } }>('/v1/folders/:id', (request) =>
    service.update(
      request.user.id,
      idSchema.parse(request.params.id),
      folderUpdateSchema.parse(request.body),
    ),
  );
  app.delete<{ Params: { id: string } }>('/v1/folders/:id', async (request, reply) => {
    await service.remove(request.user.id, idSchema.parse(request.params.id));
    return reply.code(204).send();
  });
}
