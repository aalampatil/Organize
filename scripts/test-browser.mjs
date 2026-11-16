import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Run browser verification with npm run test:browser.');
const env = { ...process.env, EXPO_PUBLIC_API_URL: 'http://localhost:4000' };
for (const argumentsList of [
  ['run', 'build:web'],
  ['run', 'test:browser', '-w', '@organize/server'],
]) {
  const result = spawnSync(process.execPath, [npmCli, ...argumentsList], {
    cwd: root,
    env,
    stdio: 'inherit',
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
