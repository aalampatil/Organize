import { Worker } from 'node:worker_threads';
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
      const worker = new Worker(new URL('./pdf.worker.mjs', import.meta.url), {
        workerData: data,
        execArgv: [],
        resourceLimits: { maxOldGenerationSizeMb: 128, maxYoungGenerationSizeMb: 32 },
      });
      let settled = false;
      const finish = (result: Extraction) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        void worker.terminate();
        resolve(result);
      };
      const timer = setTimeout(() => finish({ text: '', status: 'failed' }), 10_000);
      worker.on('message', (message: unknown) => {
        const result = workerResult.safeParse(message);
        finish(result.success ? result.data : { text: '', status: 'failed' });
      });
      worker.on('error', () => finish({ text: '', status: 'failed' }));
      worker.on('exit', () => finish({ text: '', status: 'failed' }));
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
