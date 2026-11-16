import { z } from 'zod';
import { AppError } from '../../lib/errors.js';

export const filenameSchema = z
  .string()
  .min(1)
  .max(255)
  .transform((name) =>
    name
      .split(/[\\/]/)
      .pop()!
      .replace(/[\u0000-\u001f\u007f]/g, '')
      .trim(),
  )
  .pipe(z.string().min(1).max(180));
export function detectMimeType(data: Buffer, declared: string, filename: string) {
  if (!data.length) throw new AppError(400, 'Choose a file with content.', 'EMPTY_FILE');
  if (data.subarray(0, 5).toString() === '%PDF-') return 'application/pdf';
  if (data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    return 'image/png';
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return 'image/jpeg';
  if (['GIF87a', 'GIF89a'].includes(data.subarray(0, 6).toString())) return 'image/gif';
  if (data.subarray(0, 4).toString() === 'RIFF' && data.subarray(8, 12).toString() === 'WEBP')
    return 'image/webp';
  if (declared === 'application/pdf' || filename.toLowerCase().endsWith('.pdf'))
    throw new AppError(415, 'This file does not appear to be a valid PDF.', 'INVALID_FILE');
  // Other binary formats remain downloadable; their original MIME is metadata only.
  return z
    .string()
    .regex(/^[a-zA-Z0-9!#$&^_.+-]+\/[a-zA-Z0-9!#$&^_.+-]+$/)
    .catch('application/octet-stream')
    .parse(declared);
}
