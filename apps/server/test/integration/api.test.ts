import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { envSchema } from '../../src/config/env.js';
import { createDatabase } from '../../src/db/connection.js';
import { applyMigrations } from '../../src/db/migrations.js';
import { otpChallenges, users } from '../../src/db/schema.js';
import type { EmailGateway } from '../../src/providers/email.js';
import type { StorageGateway } from '../../src/providers/storage.js';

const url = process.env.TEST_DATABASE_URL;
const enabled = Boolean(url);
if (url && !new URL(url).pathname.endsWith('_test'))
  throw new Error('TEST_DATABASE_URL must point to a dedicated database whose name ends in _test.');
const connection = url ? createDatabase(url) : null;
const inbox = new Map<string, string>();
const deletedAssets: string[] = [];
const email: EmailGateway = {
  async sendCode(address, code) {
    inbox.set(address, code);
  },
};
const storage: StorageGateway = {
  async upload(userId, filename) {
    return { storageId: `test/${userId}/${filename}` };
  },
  download() {
    return {
      url: 'https://example.com/private-download',
      expiresAt: new Date(Date.now() + 300_000).toISOString(),
    };
  },
  async remove(id) {
    deletedAssets.push(id);
  },
};
const suffix = randomUUID();
const ownerEmail = `owner-${suffix}@example.com`;
const otherEmail = `other-${suffix}@example.com`;
let app: FastifyInstance;
let ownerToken: string;
let otherToken: string;
let ownerId: string;

async function signIn(address: string) {
  assert.equal(
    (
      await app.inject({
        method: 'POST',
        url: '/v1/auth/request-code',
        payload: { email: address },
      })
    ).statusCode,
    200,
  );
  const response = await app.inject({
    method: 'POST',
    url: '/v1/auth/verify-code',
    payload: { email: address, code: inbox.get(address) },
  });
  assert.equal(response.statusCode, 200);
  return response.json() as { token: string; user: { id: string } };
}
function auth(token = ownerToken) {
  return { authorization: `Bearer ${token}` };
}
before(async () => {
  if (!connection || !url) return;
  await applyMigrations(connection.pool);
  const env = envSchema.parse({
    DATABASE_URL: url,
    AUTH_SECRET: 'integration-test-secret-that-is-long-enough',
    NODE_ENV: 'test',
  });
  app = await buildApp(env, connection.db, { email, storage });
  const owner = await signIn(ownerEmail);
  ownerToken = owner.token;
  ownerId = owner.user.id;
  otherToken = (await signIn(otherEmail)).token;
});
after(async () => {
  if (!connection) return;
  if (app) await app.close();
  // Delete only this run's fixtures, never truncate a shared database.
  await connection.db.delete(users).where(eq(users.email, ownerEmail));
  await connection.db.delete(users).where(eq(users.email, otherEmail));
  await connection.db
    .delete(otpChallenges)
    .where(eq(otpChallenges.email, `expired-${suffix}@example.com`));
  await connection.db
    .delete(otpChallenges)
    .where(eq(otpChallenges.email, `attempts-${suffix}@example.com`));
  await connection.pool.end();
});

test(
  'a consumed OTP cannot be replayed; sessions store only hashes',
  { skip: !enabled },
  async () => {
    const replay = await app.inject({
      method: 'POST',
      url: '/v1/auth/verify-code',
      payload: { email: ownerEmail, code: inbox.get(ownerEmail) },
    });
    assert.equal(replay.statusCode, 400);
    const saved = await connection!.pool.query<{ token_hash: string }>(
      'SELECT token_hash FROM sessions WHERE user_id = $1',
      [ownerId],
    );
    assert.notEqual(saved.rows[0]?.token_hash, ownerToken);
    assert.equal(saved.rows[0]?.token_hash.length, 64);
  },
);
test(
  'expiry, attempt exhaustion, and resend cooldown are enforced',
  { skip: !enabled },
  async () => {
    const address = `attempts-${suffix}@example.com`;
    await app.inject({ method: 'POST', url: '/v1/auth/request-code', payload: { email: address } });
    assert.equal(
      (
        await app.inject({
          method: 'POST',
          url: '/v1/auth/request-code',
          payload: { email: address },
        })
      ).statusCode,
      429,
    );
    const rightCode = inbox.get(address)!;
    const wrongCode = rightCode === '000000' ? '000001' : '000000';
    for (let index = 0; index < 5; index++)
      assert.equal(
        (
          await app.inject({
            method: 'POST',
            url: '/v1/auth/verify-code',
            payload: { email: address, code: wrongCode },
          })
        ).statusCode,
        400,
      );
    assert.equal(
      (
        await app.inject({
          method: 'POST',
          url: '/v1/auth/verify-code',
          payload: { email: address, code: rightCode },
        })
      ).statusCode,
      400,
    );
    const expired = `expired-${suffix}@example.com`;
    await app.inject({ method: 'POST', url: '/v1/auth/request-code', payload: { email: expired } });
    await connection!.db
      .update(otpChallenges)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(otpChallenges.email, expired));
    assert.equal(
      (
        await app.inject({
          method: 'POST',
          url: '/v1/auth/verify-code',
          payload: { email: expired, code: inbox.get(expired) },
        })
      ).statusCode,
      400,
    );
  },
);
test(
  'notes and tags are searchable, edits refresh indexes, and users stay isolated',
  { skip: !enabled },
  async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/v1/notes',
      headers: auth(),
      payload: { title: 'Rare title', body: 'Remember the turquoise lighthouse', tags: ['Travel'] },
    });
    assert.equal(created.statusCode, 201);
    const id = created.json().id as string;
    for (const term of ['lighthouse', 'turquo', 'travel', 'Rare']) {
      const page = await app.inject({ url: `/v1/items?q=${term}`, headers: auth() });
      assert.equal(
        page.json().items.some((item: { id: string }) => item.id === id),
        true,
      );
    }
    assert.equal(
      (await app.inject({ url: `/v1/items/${id}`, headers: auth(otherToken) })).statusCode,
      404,
    );
    assert.equal(
      (
        await app.inject({
          method: 'PATCH',
          url: `/v1/items/${id}`,
          headers: auth(otherToken),
          payload: { title: 'Stolen' },
        })
      ).statusCode,
      404,
    );
    const other = await app.inject({ url: '/v1/items?q=lighthouse', headers: auth(otherToken) });
    assert.equal(other.json().total, 0);
    await app.inject({
      method: 'PATCH',
      url: `/v1/items/${id}`,
      headers: auth(),
      payload: { body: 'The aubergine observatory', tags: ['research'], favorite: true },
    });
    assert.equal(
      (await app.inject({ url: '/v1/items?q=lighthouse', headers: auth() })).json().total,
      0,
    );
    assert.equal(
      (
        await app.inject({
          url: '/v1/items?q=observatory&favorite=true&tag=research',
          headers: auth(),
        })
      ).json().total,
      1,
    );
    await app.inject({
      method: 'PATCH',
      url: `/v1/items/${id}`,
      headers: auth(),
      payload: { trashed: true },
    });
    assert.equal(
      (await app.inject({ url: '/v1/items?q=observatory', headers: auth() })).json().total,
      0,
    );
    assert.equal(
      (await app.inject({ url: '/v1/items?q=observatory&trash=true', headers: auth() })).json()
        .total,
      1,
    );
    assert.equal(
      (
        await app.inject({
          method: 'PATCH',
          url: `/v1/items/${id}`,
          headers: auth(),
          payload: { title: 'Edit in Trash' },
        })
      ).statusCode,
      400,
    );
    assert.equal(
      (
        await app.inject({
          method: 'PATCH',
          url: `/v1/items/${id}`,
          headers: auth(),
          payload: { trashed: false },
        })
      ).statusCode,
      200,
    );
  },
);
test(
  'folders reject cycles and cross-owner parent and item references',
  { skip: !enabled },
  async () => {
    const parent = (
      await app.inject({
        method: 'POST',
        url: '/v1/folders',
        headers: auth(),
        payload: { name: 'Parent' },
      })
    ).json();
    const child = (
      await app.inject({
        method: 'POST',
        url: '/v1/folders',
        headers: auth(),
        payload: { name: 'Child', parentId: parent.id },
      })
    ).json();
    assert.equal(
      (
        await app.inject({
          method: 'PATCH',
          url: `/v1/folders/${parent.id}`,
          headers: auth(),
          payload: { parentId: child.id },
        })
      ).statusCode,
      400,
    );
    assert.equal(
      (
        await app.inject({
          method: 'POST',
          url: '/v1/folders',
          headers: auth(otherToken),
          payload: { name: 'Wrong owner', parentId: parent.id },
        })
      ).statusCode,
      400,
    );
    assert.equal(
      (
        await app.inject({
          method: 'POST',
          url: '/v1/notes',
          headers: auth(otherToken),
          payload: { title: 'Wrong folder', folderId: parent.id },
        })
      ).statusCode,
      400,
    );
    assert.equal(
      (await app.inject({ method: 'DELETE', url: `/v1/folders/${parent.id}`, headers: auth() }))
        .statusCode,
      409,
    );
  },
);
test(
  'private file downloads and permanent deletion respect ownership and Trash',
  { skip: !enabled },
  async () => {
    const boundary = `boundary-${suffix}`;
    const payload = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="metadata"\r\n\r\n{"tags":["receipt"]}\r\n--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="receipt.txt"\r\nContent-Type: text/plain\r\n\r\nMy searchable marmalade receipt\r\n--${boundary}--\r\n`,
    );
    const upload = await app.inject({
      method: 'POST',
      url: '/v1/files',
      headers: { ...auth(), 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload,
    });
    assert.equal(upload.statusCode, 201);
    const id = upload.json().id as string;
    assert.equal(
      (await app.inject({ url: '/v1/items?q=marmalade', headers: auth() })).json().total,
      1,
    );
    assert.equal(
      (await app.inject({ url: `/v1/items/${id}/download`, headers: auth(otherToken) })).statusCode,
      404,
    );
    assert.equal(
      (await app.inject({ url: `/v1/items/${id}/download`, headers: auth() })).statusCode,
      200,
    );
    assert.equal(
      (await app.inject({ method: 'DELETE', url: `/v1/items/${id}`, headers: auth() })).statusCode,
      409,
    );
    await app.inject({
      method: 'PATCH',
      url: `/v1/items/${id}`,
      headers: auth(),
      payload: { trashed: true },
    });
    assert.equal(
      (await app.inject({ url: `/v1/items/${id}/download`, headers: auth() })).statusCode,
      404,
    );
    assert.equal(
      (await app.inject({ method: 'DELETE', url: `/v1/items/${id}`, headers: auth() })).statusCode,
      204,
    );
    assert.ok(deletedAssets.some((asset) => asset.includes('receipt.txt')));
  },
);
test(
  'sign-out revokes the session, and unauthenticated uploads fail',
  { skip: !enabled },
  async () => {
    assert.equal((await app.inject({ method: 'POST', url: '/v1/files' })).statusCode, 401);
    assert.equal(
      (await app.inject({ method: 'POST', url: '/v1/auth/sign-out', headers: auth(otherToken) }))
        .statusCode,
      204,
    );
    assert.equal((await app.inject({ url: '/v1/me', headers: auth(otherToken) })).statusCode, 401);
  },
);
