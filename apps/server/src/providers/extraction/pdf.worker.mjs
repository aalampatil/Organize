import { PDFParse } from 'pdf-parse';

// A separate process contains native parser crashes and avoids inheriting tsx.
process.once('message', async (data) => {
  let parser;
  let extraction = { text: '', status: 'failed' };
  try {
    parser = new PDFParse({ data: new Uint8Array(data), isEvalSupported: false });
    const result = await parser.getText({ first: 50 });
    extraction = { text: result.text.slice(0, 200_000), status: 'ready' };
  } catch {
    // The original file remains usable when extraction fails.
  } finally {
    if (parser) await parser.destroy();
  }
  process.send(extraction, () => process.disconnect());
});
