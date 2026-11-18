import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  itemUpdateSchema,
  libraryQuerySchema,
  noteInputSchema,
  requestCodeSchema,
  tagsSchema,
  uploadMetadataSchema,
  referenceInputSchema,
  referenceFileSchema,
  verifyCodeSchema,
} from '@organize/contracts';
import { envSchema } from '../src/config/env.js';

test('email normalization runs before validation', () => {
  assert.equal(requestCodeSchema.parse({ email: '  Me@Example.com  ' }).email, 'me@example.com');
  assert.equal(requestCodeSchema.safeParse({ email: 'not an email' }).success, false);
});
test('codes must contain exactly six digits', () => {
  for (const code of ['12345', '1234567', 'abcdef', '123 45'])
    assert.equal(verifyCodeSchema.safeParse({ email: 'me@example.com', code }).success, false);
  assert.equal(verifyCodeSchema.parse({ email: 'me@example.com', code: '000042' }).code, '000042');
});
test('tags normalize, deduplicate, and reject invalid characters', () => {
  assert.deepEqual(tagsSchema.parse([' Work ', 'work', '旅行']), ['work', '旅行']);
  assert.equal(tagsSchema.safeParse(['<script>']).success, false);
  assert.equal(
    tagsSchema.safeParse(Array.from({ length: 21 }, (_, index) => `tag${index}`)).success,
    false,
  );
});
test('payloads reject ownership and storage injection', () => {
  assert.equal(noteInputSchema.safeParse({ title: 'Test', userId: 'someone-else' }).success, false);
  assert.equal(uploadMetadataSchema.safeParse({ storageId: 'another/asset' }).success, false);
  assert.equal(itemUpdateSchema.safeParse({}).success, false);
  assert.equal(itemUpdateSchema.safeParse({ title: '  ' }).success, false);
});
test('query booleans are parsed explicitly and pagination is bounded', () => {
  assert.equal(libraryQuerySchema.parse({ trash: 'false', favorite: 'false' }).trash, false);
  assert.equal(libraryQuerySchema.parse({ trash: 'true' }).trash, true);
  assert.equal(libraryQuerySchema.parse({}).trash, false);
  for (const query of [{ limit: 51 }, { offset: -1 }, { trash: 'yes' }, { q: 'x'.repeat(201) }])
    assert.equal(libraryQuerySchema.safeParse(query).success, false);
});

test('reference metadata allows empty files and rejects paths, content, and permission injection', () => {
  const input = { filename: 'notes.txt', mimeType: 'text/plain', bytes: 0 };
  assert.equal(referenceInputSchema.parse(input).folderId, null);
  for (const extra of [
    { uri: 'file:///private/notes.txt' },
    { storageId: 'asset' },
    { handle: {} },
    { body: 'private' },
    { userId: 'other' },
  ])
    assert.equal(referenceInputSchema.safeParse({ ...input, ...extra }).success, false);
  for (const filename of ['C:\\private\\notes.txt', '/private/notes.txt', ''])
    assert.equal(referenceFileSchema.safeParse({ ...input, filename }).success, false);
  for (const bytes of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1])
    assert.equal(referenceFileSchema.safeParse({ ...input, bytes }).success, false);
});
test('production refuses missing secrets and insecure database URLs', () => {
  const input = {
    DATABASE_URL: 'postgresql://localhost/organize',
    AUTH_SECRET: 'a'.repeat(48),
    NODE_ENV: 'production',
  };
  assert.equal(envSchema.safeParse(input).success, false);
  assert.equal(envSchema.safeParse({ ...input, NODE_ENV: 'development' }).success, true);
  assert.equal(
    envSchema.safeParse({
      ...input,
      NODE_ENV: 'development',
      AUTH_SECRET: 'replace-with-at-least-32-random-characters',
    }).success,
    false,
  );
});
