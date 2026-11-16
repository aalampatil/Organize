import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

for (const directory of ['apps/server', 'apps/mobile']) {
  const root = new URL(`../${directory}/`, import.meta.url);
  const target = new URL('.env', root);
  const example = new URL('.env.example', root);
  let source = readFileSync(existsSync(target) ? target : example, 'utf8');
  if (directory === 'apps/server') {
    source = source.replace(
      /^AUTH_SECRET=replace[^\r\n]*$/m,
      () => `AUTH_SECRET=${randomBytes(32).toString('hex')}`,
    );
  }
  writeFileSync(target, source, { mode: 0o600 });
  console.info(`Environment ready: ${fileURLToPath(target)} (credentials are not printed).`);
}
