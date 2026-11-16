import { parentPort, workerData } from 'node:worker_threads';
import { PDFParse } from 'pdf-parse';

// A JS worker avoids inheriting the API's development TypeScript loader.
let parser;
try {
  parser = new PDFParse({ data: new Uint8Array(workerData), isEvalSupported: false });
  const result = await parser.getText({ first: 50 });
  parentPort.postMessage({ text: result.text.slice(0, 200_000), status: 'ready' });
} catch {
  parentPort.postMessage({ text: '', status: 'failed' });
} finally {
  if (parser) await parser.destroy();
}
