import type { FastifyRequest } from 'fastify';
import { AppError } from '../../lib/errors.js';
import type { AuthService } from './auth.service.js';

declare module 'fastify' {
  interface FastifyRequest {
    user: { id: string; email: string; tokenHash: string };
  }
}
export function authenticationHook(service: AuthService) {
  return async (request: FastifyRequest) => {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer '))
      throw new AppError(401, 'Sign in to continue.', 'UNAUTHORIZED');
    request.user = await service.authenticate(header.slice(7));
  };
}
