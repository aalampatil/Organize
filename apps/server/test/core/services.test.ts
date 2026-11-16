import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { drizzle } from 'drizzle-orm/pglite';
import { eq } from 'drizzle-orm';
import { libraryQuerySchema, noteInputSchema, folderInputSchema } from '@organize/contracts';
import type { Database } from '../../src/db/connection.js';
import * as schema from '../../src/db/schema.js';
import { createAuthService } from '../../src/modules/auth/auth.service.js';
import { createFolderService } from '../../src/modules/folders/folders.service.js';
import { createLibraryService } from '../../src/modules/library/library.service.js';
import { createLibraryRepository } from '../../src/modules/library/library.repository.js';
import { createFileService } from '../../src/modules/files/files.service.js';

// PGlite executes PostgreSQL SQL in-process. HTTP and node-postgres are verified separately.
const postgres = new PGlite({ extensions: { pg_trgm } });
const db = drizzle(postgres, { schema }) as unknown as Database;
const inbox = new Map<string, string>();
const auth = createAuthService(
  db,
  {
    async sendCode(email, code) {
      inbox.set(email, code);
    },
  },
  'a-test-only-secret-with-more-than-32-characters',
);
const library = createLibraryService(db);
const repository = createLibraryRepository(db);
const folders = createFolderService(db);
let owner: { user: { id: string }; token: string };
let other: { user: { id: string }; token: string };
async function signIn(email: string) {
  await auth.requestCode(email);
  return auth.verifyCode(email, inbox.get(email)!);
}
before(async () => {
  await postgres.exec(
    await readFile(new URL('../../drizzle/0001_initial.sql', import.meta.url), 'utf8'),
  );
  owner = await signIn('owner@example.com');
  other = await signIn('other@example.com');
});
after(async () => {
  await postgres.close();
});

test('OTP consumption is atomic and failed attempts persist', async () => {
  await assert.rejects(
    auth.verifyCode('owner@example.com', inbox.get('owner@example.com')!),
    /invalid or expired/,
  );
  await auth.requestCode('attempts@example.com');
  await assert.rejects(auth.requestCode('attempts@example.com'), /one minute/);
  const rightCode = inbox.get('attempts@example.com')!;
  const wrongCode = rightCode === '000000' ? '000001' : '000000';
  for (let index = 0; index < 5; index++)
    await assert.rejects(auth.verifyCode('attempts@example.com', wrongCode), /invalid or expired/);
  await assert.rejects(auth.verifyCode('attempts@example.com', rightCode), /invalid or expired/);
  const [challenge] = await db
    .select()
    .from(schema.otpChallenges)
    .where(eq(schema.otpChallenges.email, 'attempts@example.com'));
  assert.equal(challenge?.attempts, 5);
});
test('expired codes and revoked sessions cannot authenticate', async () => {
  await auth.requestCode('expired@example.com');
  await db
    .update(schema.otpChallenges)
    .set({ expiresAt: new Date(Date.now() - 1000) })
    .where(eq(schema.otpChallenges.email, 'expired@example.com'));
  await assert.rejects(
    auth.verifyCode('expired@example.com', inbox.get('expired@example.com')!),
    /invalid or expired/,
  );
  const session = await signIn('signout@example.com');
  const identity = await auth.authenticate(session.token);
  await auth.signOut(identity.tokenHash);
  await assert.rejects(auth.authenticate(session.token), /expired/);
});
test('concurrent verification issues a single session', async () => {
  await auth.requestCode('concurrent@example.com');
  const code = inbox.get('concurrent@example.com')!;
  const outcomes = await Promise.allSettled([
    auth.verifyCode('concurrent@example.com', code),
    auth.verifyCode('concurrent@example.com', code),
  ]);
  assert.equal(outcomes.filter((result) => result.status === 'fulfilled').length, 1);
});
test('content, partial text, filenames, and tags are searchable without leaking owners', async () => {
  const note = await library.createNote(
    owner.user.id,
    noteInputSchema.parse({
      title: 'Research notes',
      body: 'A turquoise lighthouse on the coast',
      tags: ['Travel'],
    }),
  );
  for (const q of ['lighthouse', 'turquo', 'travel', 'Research'])
    assert.ok(
      (await repository.list(owner.user.id, libraryQuerySchema.parse({ q }))).items.some(
        (entry) => entry.id === note.id,
      ),
    );
  assert.equal(
    (await repository.list(other.user.id, libraryQuerySchema.parse({ q: 'lighthouse' }))).total,
    0,
  );
  await assert.rejects(library.get(other.user.id, note.id), /could not be found/);
  await assert.rejects(
    library.update(other.user.id, note.id, { title: 'Wrong owner' }),
    /could not be found/,
  );
  await library.update(owner.user.id, note.id, {
    body: 'An aubergine observatory',
    tags: ['science'],
    favorite: true,
  });
  assert.equal(
    (await repository.list(owner.user.id, libraryQuerySchema.parse({ q: 'lighthouse' }))).total,
    0,
  );
  assert.equal(
    (
      await repository.list(
        owner.user.id,
        libraryQuerySchema.parse({ q: 'observatory', tag: 'science', favorite: 'true' }),
      )
    ).total,
    1,
  );
  assert.ok((await repository.tags(owner.user.id)).some((tag) => tag.name === 'science'));
  await library.update(owner.user.id, note.id, { trashed: true });
  assert.equal(
    (await repository.list(owner.user.id, libraryQuerySchema.parse({ q: 'observatory' }))).total,
    0,
  );
  assert.equal(
    (
      await repository.list(
        owner.user.id,
        libraryQuerySchema.parse({ q: 'observatory', trash: 'true' }),
      )
    ).total,
    1,
  );
  await assert.rejects(
    library.update(owner.user.id, note.id, { title: 'Cannot edit Trash' }),
    /Restore/,
  );
  await library.update(owner.user.id, note.id, { trashed: false });
  assert.equal(
    (await repository.list(owner.user.id, libraryQuerySchema.parse({ q: 'observatory' }))).total,
    1,
  );
});
test('folder cycles, ownership violations, and nonempty deletion are rejected', async () => {
  const parent = await folders.create(owner.user.id, folderInputSchema.parse({ name: 'Parent' }));
  const child = await folders.create(
    owner.user.id,
    folderInputSchema.parse({ name: 'Child', parentId: parent.id }),
  );
  await assert.rejects(
    folders.update(owner.user.id, parent.id, { parentId: child.id }),
    /inside itself/,
  );
  await assert.rejects(
    folders.create(other.user.id, folderInputSchema.parse({ name: 'Wrong', parentId: parent.id })),
    /your library/,
  );
  await assert.rejects(
    library.createNote(
      other.user.id,
      noteInputSchema.parse({ title: 'Wrong folder', folderId: parent.id }),
    ),
    /your library/,
  );
  await assert.rejects(folders.remove(owner.user.id, parent.id), /before deleting/);
  // The database independently rejects a cross-owner relationship.
  await assert.rejects(
    db.insert(schema.items).values({
      userId: other.user.id,
      kind: 'note',
      title: 'Bypass service',
      folderId: parent.id,
    }),
  );
});
test('file text retrieval, private downloads, Trash, and cleanup follow the lifecycle', async () => {
  const deleted: string[] = [];
  const files = createFileService(db, {
    async upload(userId, filename) {
      return { storageId: `${userId}/${filename}` };
    },
    download(storageId) {
      return {
        url: `https://example.com/${storageId}`,
        expiresAt: new Date(Date.now() + 300_000).toISOString(),
      };
    },
    async remove(storageId) {
      deleted.push(storageId);
    },
  });
  const file = await files.upload(
    owner.user.id,
    'receipt.txt',
    'text/plain',
    Buffer.from('A marmalade receipt'),
    { folderId: null, tags: ['receipts'] },
  );
  assert.equal(
    (await repository.list(owner.user.id, libraryQuerySchema.parse({ q: 'marmalade' }))).total,
    1,
  );
  assert.equal(
    (await repository.list(owner.user.id, libraryQuerySchema.parse({ q: 'receipt.txt' }))).total,
    1,
  );
  await assert.rejects(files.download(other.user.id, file.id), /could not be found/);
  assert.match((await files.download(owner.user.id, file.id)).url, /^https:/);
  await assert.rejects(files.remove(owner.user.id, file.id), /Trash/);
  await library.update(owner.user.id, file.id, { trashed: true });
  await assert.rejects(files.download(owner.user.id, file.id), /could not be found/);
  await files.remove(owner.user.id, file.id);
  assert.equal(deleted.length, 1);
  await assert.rejects(library.get(owner.user.id, file.id), /could not be found/);
});

test('moving a subtree cannot push its descendants past the depth limit', async () => {
  let parentId: string | null = null;
  for (let level = 0; level < 31; level++) {
    const folder = await folders.create(
      other.user.id,
      folderInputSchema.parse({ name: `Level ${level}`, parentId }),
    );
    parentId = folder.id;
  }
  const subtree = await folders.create(
    other.user.id,
    folderInputSchema.parse({ name: 'Move this tree' }),
  );
  await folders.create(
    other.user.id,
    folderInputSchema.parse({ name: 'Its child', parentId: subtree.id }),
  );
  await assert.rejects(folders.update(other.user.id, subtree.id, { parentId }), /exceed 32/);
});

test('failed metadata persistence compensates by removing the uploaded asset', async () => {
  const folder = await folders.create(
    owner.user.id,
    folderInputSchema.parse({ name: 'Concurrent removal' }),
  );
  const removed: string[] = [];
  const files = createFileService(db, {
    async upload() {
      // Simulate folder removal after validation but before metadata persistence.
      await db.delete(schema.folders).where(eq(schema.folders.id, folder.id));
      return { storageId: 'private/orphan-candidate' };
    },
    download() {
      throw new Error('Not used');
    },
    async remove(id) {
      removed.push(id);
    },
  });
  await assert.rejects(
    files.upload(owner.user.id, 'cleanup.txt', 'text/plain', Buffer.from('cleanup'), {
      folderId: folder.id,
      tags: [],
    }),
  );
  assert.deepEqual(removed, ['private/orphan-candidate']);
});
