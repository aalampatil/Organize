import { z } from 'zod';

export const emailSchema = z.string().trim().toLowerCase().max(254).pipe(z.email());
export const requestCodeSchema = z.object({ email: emailSchema }).strict();
export const verifyCodeSchema = requestCodeSchema.extend({
  code: z.string().regex(/^\d{6}$/, 'Enter the six-digit code'),
});
export const userSchema = z.object({ id: z.uuid(), email: z.email() });
export const sessionSchema = z.object({
  token: z.string().min(32),
  expiresAt: z.iso.datetime(),
  user: userSchema,
});
export const codeSentSchema = z.object({ message: z.string(), retryAfter: z.number() });
export type User = z.infer<typeof userSchema>;
export type Session = z.infer<typeof sessionSchema>;
