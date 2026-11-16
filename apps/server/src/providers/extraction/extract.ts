import { fork } from 'node:child_process';
import { extname } from 'node:path';
import { z } from 'zod';

export type Extraction = { text: string; status: 'ready' | 'unsupported' | 'failed' };
const workerResult = z.object({
  text: z.string().max(200_000),
  status: z.enum(['ready', 'failed']),
});
const textExtensions = new Set(['.txt', '.md', '.csv', '.json', '.log', '.yaml', '.yml', '.xml']);
export async function extractText(
  data: Buffer,
  filename: string,
  mimeType: string,
): Promise<Extraction> {
  if (mimeType === 'application/pdf') {
    return new Promise((resolve) => {
      // Native PDF dependencies can crash on corrupt inputs. A process boundary
      // keeps those failures outside the API, including on Windows.
      const worker = fork(new URL('./pdf.worker.mjs', import.meta.url), {
        execArgv: ['--max-old-space-size=128'],
        serialization: 'advanced',
        stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
        windowsHide: true,
      });
      let settled = false;
      const finish = (result: Extraction, terminate = false) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (terminate) worker.kill();
        resolve(result);
      };
      const timer = setTimeout(() => finish({ text: '', status: 'failed' }, true), 10_000);
      worker.on('message', (message: unknown) => {
        const result = workerResult.safeParse(message);
        finish(result.success ? result.data : { text: '', status: 'failed' });
      });
      worker.on('error', () => finish({ text: '', status: 'failed' }));
      worker.on('exit', () => finish({ text: '', status: 'failed' }));
      worker.send(data, (error) => {
        if (error) finish({ text: '', status: 'failed' }, true);
      });
    });
  }
  if (mimeType.startsWith('text/') || textExtensions.has(extname(filename).toLowerCase())) {
    return {
      text: data
        .subarray(0, 800_000)
        .toString('utf8')
        .replace(/\u0000/g, '')
        .slice(0, 200_000),
      status: 'ready',
    };
  }
  return { text: '', status: 'unsupported' };
}
