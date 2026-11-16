import { and, eq, gt, sql } from 'drizzle-orm';
import type { Database, Transaction } from '../../db/connection.js';
import { otpChallenges, sessions, users } from '../../db/schema.js';
import { AppError } from '../../lib/errors.js';
import {
  generateCode,
  generateToken,
  hashCode,
  hashesEqual,
  hashToken,
  OTP_COOLDOWN_MS,
  OTP_MAX_ATTEMPTS,
  OTP_TTL_MS,
  SESSION_TTL_MS,
} from '../../lib/security.js';
import type { EmailGateway } from '../../providers/contracts.js';

const lockEmail = (tx: Transaction, email: string) =>
  tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${'otp:' + email}, 0))`);

export function createAuthService(db: Database, emailGateway: EmailGateway, secret: string) {
  return {
    async requestCode(email: string) {
      await db.transaction(async (tx) => {
        await lockEmail(tx, email);
        const [previous] = await tx
          .select()
          .from(otpChallenges)
          .where(eq(otpChallenges.email, email));
        const now = Date.now();
        if (previous && now - previous.sentAt.getTime() < OTP_COOLDOWN_MS)
          throw new AppError(
            429,
            'Wait one minute before requesting another code.',
            'CODE_COOLDOWN',
          );
        const code = generateCode();
        const values = {
          email,
          codeHash: hashCode(email, code, secret),
          attempts: 0,
          sentAt: new Date(now),
          expiresAt: new Date(now + OTP_TTL_MS),
        };
        await tx
          .insert(otpChallenges)
          .values(values)
          .onConflictDoUpdate({ target: otpChallenges.email, set: values });
        // Delivery failure rolls back the new challenge rather than accepting an undelivered code.
        await emailGateway.sendCode(email, code);
      });
      return {
        message: 'Check your inbox for a six-digit sign-in code.',
        retryAfter: OTP_COOLDOWN_MS / 1000,
      };
    },
    async verifyCode(email: string, code: string) {
      const result = await db.transaction(async (tx) => {
        await lockEmail(tx, email);
        const [challenge] = await tx
          .select()
          .from(otpChallenges)
          .where(eq(otpChallenges.email, email));
        const now = Date.now();
        if (
          !challenge ||
          challenge.expiresAt.getTime() <= now ||
          challenge.attempts >= OTP_MAX_ATTEMPTS
        )
          return null;
        if (!hashesEqual(challenge.codeHash, hashCode(email, code, secret))) {
          // Return from the transaction so failed attempts are committed.
          await tx
            .update(otpChallenges)
            .set({ attempts: challenge.attempts + 1 })
            .where(eq(otpChallenges.email, email));
          return null;
        }
        await tx.delete(otpChallenges).where(eq(otpChallenges.email, email));
        const [user] = await tx
          .insert(users)
          .values({ email })
          .onConflictDoUpdate({ target: users.email, set: { email } })
          .returning({ id: users.id, email: users.email });
        if (!user) throw new Error('User could not be created');
        const token = generateToken();
        const expiresAt = new Date(now + SESSION_TTL_MS);
        await tx
          .insert(sessions)
          .values({ userId: user.id, tokenHash: hashToken(token), expiresAt });
        return { user, token, expiresAt: expiresAt.toISOString() };
      });
      if (!result)
        throw new AppError(
          400,
          'The code is invalid or expired. Request a new code if needed.',
          'INVALID_CODE',
        );
      return result;
    },
    async authenticate(token: string) {
      if (!/^[A-Za-z0-9_-]{43}$/.test(token))
        throw new AppError(401, 'Sign in to continue.', 'UNAUTHORIZED');
      const tokenHash = hashToken(token);
      const [record] = await db
        .select({ id: users.id, email: users.email })
        .from(sessions)
        .innerJoin(users, eq(sessions.userId, users.id))
        .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date())));
      if (!record)
        throw new AppError(401, 'Your session has expired. Sign in again.', 'UNAUTHORIZED');
      return { ...record, tokenHash };
    },
    async signOut(tokenHash: string) {
      await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
    },
  };
}
export type AuthService = ReturnType<typeof createAuthService>;
