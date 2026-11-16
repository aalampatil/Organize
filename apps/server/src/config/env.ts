import { z } from 'zod';

const optionalSecret = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || undefined);
export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    HOST: z.string().default('0.0.0.0'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    DATABASE_URL: z
      .url()
      .refine(
        (value) => ['postgres:', 'postgresql:'].includes(new URL(value).protocol),
        'Use a PostgreSQL connection URL',
      ),
    AUTH_SECRET: z
      .string()
      .min(32)
      .refine((value) => !value.startsWith('replace-'), 'Generate a random AUTH_SECRET'),
    CORS_ORIGINS: z
      .string()
      .default('http://localhost:8081')
      .transform((value) => value.split(',').map((origin) => z.url().parse(origin.trim()))),
    EMAIL_PROVIDER: z.enum(['mailtrap', 'resend']).default('mailtrap'),
    EMAIL_FROM: z.string().min(3).default('Organize <hello@example.com>'),
    MAILTRAP_HOST: z.string().default('sandbox.smtp.mailtrap.io'),
    MAILTRAP_PORT: z.coerce.number().int().min(1).max(65535).default(2525),
    MAILTRAP_USER: optionalSecret,
    MAILTRAP_PASSWORD: optionalSecret,
    RESEND_API_KEY: optionalSecret,
    CLOUDINARY_CLOUD_NAME: optionalSecret,
    CLOUDINARY_API_KEY: optionalSecret,
    CLOUDINARY_API_SECRET: optionalSecret,
    MAX_UPLOAD_BYTES: z.coerce
      .number()
      .int()
      .min(1024)
      .max(50 * 1024 * 1024)
      .default(20 * 1024 * 1024),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production') {
      if (env.EMAIL_PROVIDER !== 'resend' || !env.RESEND_API_KEY)
        ctx.addIssue({
          code: 'custom',
          path: ['RESEND_API_KEY'],
          message: 'Production requires Resend credentials',
        });
      if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET)
        ctx.addIssue({
          code: 'custom',
          path: ['CLOUDINARY_API_SECRET'],
          message: 'Production requires Cloudinary credentials',
        });
      const database = new URL(env.DATABASE_URL);
      if (
        !['require', 'verify-full', 'verify-ca'].includes(
          database.searchParams.get('sslmode') ?? '',
        )
      )
        ctx.addIssue({
          code: 'custom',
          path: ['DATABASE_URL'],
          message: 'Production PostgreSQL must use TLS (sslmode=require or verify-full)',
        });
      if (env.CORS_ORIGINS.some((origin) => new URL(origin).protocol !== 'https:'))
        ctx.addIssue({
          code: 'custom',
          path: ['CORS_ORIGINS'],
          message: 'Production web origins must use HTTPS',
        });
    }
  });
export type Environment = z.infer<typeof envSchema>;
