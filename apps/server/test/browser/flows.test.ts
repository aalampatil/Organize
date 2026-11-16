import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Browser, type Page } from 'playwright';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { envSchema } from '../../src/config/env.js';
import { createDatabase } from '../../src/db/connection.js';
import { applyMigrations } from '../../src/db/migrations.js';
import { users } from '../../src/db/schema.js';
import { buildApp } from '../../src/app.js';

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl || !new URL(testUrl).pathname.endsWith('_test')) {
  throw new Error(
    'Browser tests require TEST_DATABASE_URL pointing to a dedicated *_test database.',
  );
}
const root = fileURLToPath(new URL('../../../../', import.meta.url));
const publicDirectory = resolve(root, 'apps/mobile/dist');
const screenshotDirectory = resolve(root, '.tmp/screenshots');
const webUrl = 'http://localhost:8087';
const email = `browser-${randomUUID()}@example.com`;
const inbox = new Map<string, string>();
const { db, pool } = createDatabase(testUrl);
let api: FastifyInstance | undefined;
let web: Server | undefined;
let browser: Browser | undefined;

const contentTypes: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};
async function serveExport(): Promise<Server> {
  await readFile(resolve(publicDirectory, 'index.html'));
  const server = createServer(async (request, response) => {
    const pathname = decodeURIComponent(new URL(request.url ?? '/', webUrl).pathname);
    const target = resolve(publicDirectory, pathname === '/' ? 'index.html' : `.${pathname}`);
    if (!target.startsWith(publicDirectory + sep)) {
      response.writeHead(403).end();
      return;
    }
    try {
      const body = await readFile(target);
      response
        .writeHead(200, {
          'Content-Type': contentTypes[extname(target)] ?? 'application/octet-stream',
        })
        .end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(8087, 'localhost', resolve);
  });
  return server;
}
before(async () => {
  await applyMigrations(pool);
  await mkdir(screenshotDirectory, { recursive: true });
  const env = envSchema.parse({
    DATABASE_URL: testUrl,
    NODE_ENV: 'test',
    CORS_ORIGINS: webUrl,
    AUTH_SECRET: 'a-browser-test-only-secret-with-enough-entropy',
  });
  api = await buildApp(env, db, {
    email: {
      async sendCode(address, code) {
        inbox.set(address, code);
      },
    },
    storage: {
      async upload(userId, filename) {
        return { storageId: `browser/${userId}/${filename}` };
      },
      download() {
        return {
          url: 'https://example.com/private-test-file',
          expiresAt: new Date(Date.now() + 300_000).toISOString(),
        };
      },
      async remove() {},
    },
  });
  // The exported app's public API URL is localhost:4000 for local verification.
  await api.listen({ host: 'localhost', port: 4000 });
  web = await serveExport();
  browser = await chromium.launch({ headless: true });
});
after(async () => {
  await browser?.close();
  await api?.close();
  if (web)
    await new Promise<void>((resolve, reject) =>
      web!.close((error) => (error ? reject(error) : resolve())),
    );
  await db.delete(users).where(eq(users.email, email));
  await pool.end();
});
function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

test(
  'desktop: email sign-in, nested organization, global retrieval, upload, and restore',
  { timeout: 120_000 },
  async () => {
    const context = await browser!.newContext({ viewport: { width: 1440, height: 1080 } });
    const page = await context.newPage();
    const errors = collectErrors(page);
    try {
      await page.goto(webUrl);
      await page.getByRole('textbox', { name: 'Email address', exact: true }).fill(email);
      await page.getByRole('button', { name: 'Continue with email' }).click();
      await page.getByRole('textbox', { name: 'Your sign-in code' }).waitFor();
      const code = inbox.get(email);
      assert.ok(code);
      await page.getByRole('textbox', { name: 'Your sign-in code' }).fill(code);
      await page.getByRole('button', { name: 'Open my library' }).click();
      await page.getByRole('heading', { name: 'Your library.' }).waitFor();

      await page.getByRole('button', { name: 'New folder', exact: true }).click();
      await page.getByRole('textbox', { name: 'Folder name' }).fill('Browser research');
      await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Create folder', exact: true })
        .click();
      await page.getByRole('button', { name: 'Open Browser research', exact: true }).click();
      await page.getByRole('button', { name: 'New folder', exact: true }).click();
      await page.getByRole('textbox', { name: 'Folder name' }).fill('Fieldwork');
      await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Create folder', exact: true })
        .click();
      await page.getByRole('button', { name: 'Open Fieldwork', exact: true }).click();
      await page.getByRole('button', { name: 'New note', exact: true }).click();
      await page
        .getByRole('textbox', { name: 'Title', exact: true })
        .fill('Lighthouse field notes');
      await page
        .getByRole('textbox', { name: 'Note', exact: true })
        .fill('A cobalt lighthouse beside the sea.');
      await page
        .getByRole('textbox', { name: 'Tags · separate with commas' })
        .fill('research, coastal');
      await page.getByRole('button', { name: 'Save note', exact: true }).click();

      const contentSearch = page.waitForResponse((response) => {
        const url = new URL(response.url());
        return url.pathname === '/v1/items' && url.searchParams.get('q') === 'cobalt lighthouse';
      });
      await page.getByRole('textbox', { name: 'Search your library' }).fill('cobalt lighthouse');
      const searchResponse = await contentSearch;
      assert.equal(searchResponse.status(), 200);
      assert.equal(new URL(searchResponse.url()).searchParams.has('folderId'), false);
      await page.getByRole('button', { name: 'Open Lighthouse field notes', exact: true }).click();
      await page.getByRole('button', { name: 'Favorite', exact: true }).click();
      await page
        .getByRole('button', { name: 'Open Lighthouse field notes', exact: true })
        .waitFor();
      await page.getByRole('button', { name: 'Clear search', exact: true }).click();

      const chooser = page.waitForEvent('filechooser');
      await page.getByRole('button', { name: 'Upload', exact: true }).click();
      await (
        await chooser
      ).setFiles({
        name: 'browser-receipt.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('A searchable marmalade receipt'),
      });
      await page.getByRole('heading', { name: 'File details' }).waitFor();
      await page.getByRole('button', { name: 'Save changes', exact: true }).click();
      await page.getByRole('textbox', { name: 'Search your library' }).fill('marmalade');
      await page.getByRole('button', { name: 'Open browser-receipt.txt', exact: true }).waitFor();

      await page
        .getByRole('textbox', { name: 'Search your library' })
        .fill('Lighthouse field notes');
      await page.getByRole('button', { name: 'Open Lighthouse field notes', exact: true }).click();
      await page.getByRole('button', { name: 'Move to Trash', exact: true }).click();
      await page.getByRole('button', { name: 'Open account', exact: true }).click();
      await page.getByRole('button', { name: 'Open Trash', exact: true }).click();
      await page.getByRole('button', { name: 'Open Lighthouse field notes', exact: true }).click();
      await page.getByRole('button', { name: 'Restore item', exact: true }).click();
      await page.getByRole('button', { name: /^All items/ }).click();
      await page
        .getByRole('button', { name: 'Open Lighthouse field notes', exact: true })
        .waitFor();
      await page.screenshot({ path: resolve(screenshotDirectory, 'desktop.png'), fullPage: true });
      assert.deepEqual(errors, []);
    } catch (error) {
      await page
        .screenshot({ path: resolve(screenshotDirectory, 'desktop-failure.png'), fullPage: true })
        .catch(() => {});
      console.error('Desktop page errors:', errors);
      throw error;
    } finally {
      await context.close();
    }
  },
);

test(
  'mobile-sized preview supports note creation, search, and account navigation',
  { timeout: 60_000 },
  async () => {
    const context = await browser!.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    const errors = collectErrors(page);
    try {
      await page.goto(webUrl);
      await page.getByRole('button', { name: 'Explore a sample library' }).click();
      await page.getByRole('heading', { name: 'Your library.' }).waitFor();
      await page.getByRole('button', { name: 'New note', exact: true }).click();
      await page.getByRole('textbox', { name: 'Title', exact: true }).fill('A small mobile idea');
      await page
        .getByRole('textbox', { name: 'Note', exact: true })
        .fill('Remember the violet notebook.');
      await page.getByRole('button', { name: 'Save note', exact: true }).click();
      await page.getByRole('textbox', { name: 'Search your library' }).fill('violet');
      await page.getByRole('button', { name: 'Open A small mobile idea', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Clear search', exact: true }).click();
      await page.screenshot({ path: resolve(screenshotDirectory, 'mobile.png'), fullPage: true });
      const overflow = await page.evaluate<boolean>(
        'document.documentElement.scrollWidth > window.innerWidth',
      );
      assert.equal(overflow, false);
      await page.getByRole('button', { name: 'You', exact: true }).click();
      await page.getByRole('button', { name: 'Leave preview / sign in', exact: true }).click();
      await page.getByRole('textbox', { name: 'Email address', exact: true }).waitFor();
      assert.deepEqual(errors, []);
    } catch (error) {
      await page
        .screenshot({ path: resolve(screenshotDirectory, 'mobile-failure.png'), fullPage: true })
        .catch(() => {});
      console.error('Mobile page errors:', errors);
      throw error;
    } finally {
      await context.close();
    }
  },
);
