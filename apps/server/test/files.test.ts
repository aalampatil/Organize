import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectMimeType, filenameSchema } from '../src/modules/files/files.validation.js';

test('filenames discard directories and control characters', () => {
  assert.equal(filenameSchema.parse('C:\\private\\report.txt'), 'report.txt');
  assert.equal(filenameSchema.parse('../../report\u0000.txt'), 'report.txt');
  assert.equal(filenameSchema.safeParse('   ').success, false);
});
test('PDF recognition uses bytes, and mislabeled PDFs are rejected', () => {
  assert.equal(
    detectMimeType(Buffer.from('%PDF-1.7\n'), 'application/octet-stream', 'file.bin'),
    'application/pdf',
  );
  assert.throws(
    () => detectMimeType(Buffer.from('not a PDF'), 'application/pdf', 'report.pdf'),
    /valid PDF/,
  );
  assert.throws(() => detectMimeType(Buffer.alloc(0), 'text/plain', 'empty.txt'), /content/);
});
test('image magic bytes override a false MIME declaration', () => {
  assert.equal(
    detectMimeType(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), 'text/plain', 'file.txt'),
    'image/png',
  );
  assert.equal(
    detectMimeType(Buffer.from('content'), '<unsafe>', 'unknown.bin'),
    'application/octet-stream',
  );
});
