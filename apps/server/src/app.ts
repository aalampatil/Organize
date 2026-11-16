import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import { sql } from 'drizzle-orm';
import { z, ZodError } from 'zod';
import type { Environment } from './config/env.js';
import type { Database } from './db/connection.js';
import { AppError } from './lib/errors.js';
import { createAuthService } from './modules/auth/auth.service.js';
import { registerAuthRoutes } from './modules/auth/auth.routes.js';
import { authenticationHook } from './modules/auth/auth.middleware.js';
import { registerFolderRoutes } from './modules/folders/folders.routes.js';
import { registerLibraryRoutes } from './modules/library/library.routes.js';
import { registerFileRoutes } from './modules/files/files.routes.js';
import { createEmailGateway, type EmailGateway } from './providers/email.js';
import { createStorageGateway, type StorageGateway } from './providers/storage.js';

const httpErrorSchema = z.object({
  statusCode: z.number().int().min(400).max(599).optional(),
  code: z.string().optional(),
});

export async function buildApp(
  env: Environment,
  db: Database,
  providers: { email?: EmailGateway; storage?: StorageGateway } = {},
) {
  const app = Fastify({
    logger: env.NODE_ENV !== 'test',
    disableRequestLogging: true,
    bodyLimit: 1024 * 1024,
    requestTimeout: 60_000,
    connectionTimeout: 10_000,
    trustProxy: false,
  });
  await app.register(helmet);
  await app.register(cors, {
    origin: env.CORS_ORIGINS,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    credentials: false,
  });
  await app.register(rateLimit, { max: 120, timeWindow: '1 minute' });
  await app.register(multipart, { limits: { fileSize: env.MAX_UPLOAD_BYTES, files: 1 } });
  app.addHook('onSend', async (_request, reply, payload) => {
    reply.header('Cache-Control', 'no-store');
    return payload;
  });
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError)
      return reply.code(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.issues[0]?.message ?? 'Check the provided values.',
          issues: error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
        },
      });
    if (error instanceof AppError)
      return reply
        .code(error.statusCode)
        .send({ error: { code: error.code, message: error.message } });
    const metadata = httpErrorSchema.safeParse(error);
    const { statusCode, code } = metadata.success ? metadata.data : {};
    if (statusCode === 429)
      return reply.code(429).send({
        error: { code: 'RATE_LIMITED', message: 'Too many requests. Please wait and try again.' },
      });
    if (statusCode === 413 || code === 'FST_REQ_FILE_TOO_LARGE')
      return reply.code(413).send({
        error: {
          code: 'FILE_TOO_LARGE',
          message: `Files must be smaller than ${Math.floor(env.MAX_UPLOAD_BYTES / 1048576)} MB.`,
        },
      });
    if (statusCode && statusCode < 500)
      return reply
        .code(statusCode)
        .send({ error: { code: 'INVALID_REQUEST', message: 'The request is invalid.' } });
    // Log an identifier, never search terms, SQL values, tokens, or provider secrets.
    request.log.error(
      { requestId: request.id, errorName: error instanceof Error ? error.name : 'UnknownError' },
      'Request failed',
    );
    return reply.code(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong. Please try again.',
        requestId: request.id,
      },
    });
  });
  app.get('/health', async (_request, reply) => {
    try {
      await db.execute(sql`select 1`);
      return { status: 'ok', database: 'connected' };
    } catch {
      return reply.code(503).send({ status: 'unavailable', database: 'disconnected' });
    }
  });
  const auth = createAuthService(db, providers.email ?? createEmailGateway(env), env.AUTH_SECRET);
  const storage = providers.storage ?? createStorageGateway(env);
  registerAuthRoutes(app, auth);
  await app.register(async (protectedApp) => {
    protectedApp.addHook('onRequest', authenticationHook(auth));
    protectedApp.get('/v1/me', (request) => ({ id: request.user.id, email: request.user.email }));
    protectedApp.post('/v1/auth/sign-out', async (request, reply) => {
      await auth.signOut(request.user.tokenHash);
      return reply.code(204).send();
    });
    registerFolderRoutes(protectedApp, db);
    registerLibraryRoutes(protectedApp, db);
    registerFileRoutes(protectedApp, db, storage, env.MAX_UPLOAD_BYTES);
  });
  return app;
}
