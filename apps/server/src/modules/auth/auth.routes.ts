import type { FastifyInstance } from 'fastify';
import { requestCodeSchema, verifyCodeSchema } from '@organize/contracts';
import type { AuthService } from './auth.service.js';

export function registerAuthRoutes(app: FastifyInstance, service: AuthService) {
  app.post(
    '/v1/auth/request-code',
    { config: { rateLimit: { max: 6, timeWindow: '10 minutes' } } },
    async (request) => {
      const { email } = requestCodeSchema.parse(request.body);
      return service.requestCode(email);
    },
  );
  app.post(
    '/v1/auth/verify-code',
    { config: { rateLimit: { max: 20, timeWindow: '10 minutes' } } },
    async (request) => {
      const { email, code } = verifyCodeSchema.parse(request.body);
      return service.verifyCode(email, code);
    },
  );
}
