import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import type { Environment } from '../config/env.js';
import { AppError } from '../lib/errors.js';
import type { StorageGateway } from './contracts.js';
export type { StorageGateway } from './contracts.js';
export function createStorageGateway(env: Environment): StorageGateway {
  const options = {
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    signature_algorithm: 'sha256' as const,
  };
  const requireConfiguration = () => {
    if (!options.cloud_name || !options.api_key || !options.api_secret)
      throw new AppError(
        503,
        'File storage is unavailable. Configure Cloudinary on the server.',
        'STORAGE_UNAVAILABLE',
      );
  };
  return {
    async upload(userId, filename, data) {
      requireConfiguration();
      const extension = extname(filename)
        .toLowerCase()
        .replace(/[^.a-z0-9]/g, '')
        .slice(0, 16);
      const storageId = `organize/${userId}/${randomUUID()}${extension}`;
      try {
        const result = await new Promise<UploadApiResponse>((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              ...options,
              public_id: storageId,
              resource_type: 'raw',
              type: 'authenticated',
              overwrite: false,
              timeout: 30_000,
            },
            (error, response) => {
              if (error || !response) reject(error ?? new Error('Upload failed'));
              else resolve(response);
            },
          );
          stream.on('error', reject);
          stream.end(data);
        });
        return { storageId: result.public_id };
      } catch {
        throw new AppError(502, 'The upload could not be completed. Try again.', 'UPLOAD_FAILED');
      }
    },
    download(storageId) {
      requireConfiguration();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      const url = cloudinary.utils.private_download_url(storageId, '', {
        ...options,
        resource_type: 'raw',
        type: 'authenticated',
        attachment: true,
        expires_at: Math.floor(expiresAt.getTime() / 1000),
      });
      return { url, expiresAt: expiresAt.toISOString() };
    },
    async remove(storageId) {
      requireConfiguration();
      try {
        const result = await cloudinary.uploader.destroy(storageId, {
          ...options,
          resource_type: 'raw',
          type: 'authenticated',
          invalidate: true,
        });
        if (!['ok', 'not found'].includes(result.result as string))
          throw new Error('Deletion failed');
      } catch {
        throw new AppError(502, 'The file could not be deleted. Try again.', 'DELETE_FAILED');
      }
    },
  };
}
