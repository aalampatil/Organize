import type { FastifyInstance } from 'fastify';
import {
  idSchema,
  itemUpdateSchema,
  libraryQuerySchema,
  noteInputSchema,
  referenceInputSchema,
  referenceFileSchema,
} from '@organize/contracts';
import type { Database } from '../../db/connection.js';
import { createLibraryRepository } from './library.repository.js';
import { createLibraryService } from './library.service.js';

export function registerLibraryRoutes(app: FastifyInstance, db: Database) {
  const repository = createLibraryRepository(db);
  const service = createLibraryService(db);
  app.get('/v1/items', (request) =>
    repository.list(request.user.id, libraryQuerySchema.parse(request.query)),
  );
  app.get('/v1/stats', (request) => repository.stats(request.user.id));
  app.get('/v1/tags', (request) => repository.tags(request.user.id));
  app.get<{ Params: { id: string } }>('/v1/items/:id', (request) =>
    service.get(request.user.id, idSchema.parse(request.params.id)),
  );
  app.post('/v1/notes', async (request, reply) =>
    reply
      .code(201)
      .send(await service.createNote(request.user.id, noteInputSchema.parse(request.body))),
  );
  app.patch<{ Params: { id: string } }>('/v1/items/:id', (request) =>
    service.update(
      request.user.id,
      idSchema.parse(request.params.id),
      itemUpdateSchema.parse(request.body),
    ),
  );
  app.post('/v1/file-references', async (request, reply) =>
    reply
      .code(201)
      .send(
        await service.createReference(request.user.id, referenceInputSchema.parse(request.body)),
      ),
  );
  app.patch<{ Params: { id: string } }>('/v1/file-references/:id', (request) =>
    service.reconnectReference(
      request.user.id,
      idSchema.parse(request.params.id),
      referenceFileSchema.parse(request.body),
    ),
  );
}
