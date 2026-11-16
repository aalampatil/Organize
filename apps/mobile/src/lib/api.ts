import { z } from 'zod';
import {
  codeSentSchema,
  downloadSchema,
  folderSchema,
  folderInputSchema,
  folderUpdateSchema,
  itemSchema,
  itemUpdateSchema,
  libraryPageSchema,
  noteInputSchema,
  requestCodeSchema,
  sessionSchema,
  statsSchema,
  tagFacetSchema,
  userSchema,
  verifyCodeSchema,
  type FolderInput,
  type FolderUpdate,
  type ItemUpdate,
  type NoteInput,
} from '@organize/contracts';
import type { DocumentPickerAsset } from 'expo-document-picker';
import { Platform } from 'react-native';
import { apiBaseUrl } from './config';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export type Filters = {
  q?: string;
  kind?: 'note' | 'file' | 'image' | 'pdf';
  folderId?: string;
  tag?: string;
  favorite?: boolean;
  trash?: boolean;
  sort?: 'recent' | 'oldest' | 'title';
};
const errorSchema = z.object({ error: z.object({ message: z.string() }) });

export function createApi(token?: string, onUnauthorized?: () => void) {
  async function request<T>(
    path: string,
    schema: z.ZodType<T>,
    options: { method?: string; body?: unknown; signal?: AbortSignal; form?: FormData } = {},
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.form ? 60_000 : 20_000);
    const abort = () => controller.abort();
    options.signal?.addEventListener('abort', abort, { once: true });
    if (options.signal?.aborted) controller.abort();
    try {
      const response = await fetch(`${apiBaseUrl}${path}`, {
        method: options.method ?? 'GET',
        signal: controller.signal,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        body:
          options.form ?? (options.body !== undefined ? JSON.stringify(options.body) : undefined),
      });
      const data: unknown = response.status === 204 ? undefined : await response.json();
      if (!response.ok) {
        if (response.status === 401) onUnauthorized?.();
        const parsed = errorSchema.safeParse(data);
        throw new ApiError(
          parsed.success ? parsed.data.error.message : 'The request could not be completed.',
          response.status,
        );
      }
      return schema.parse(data);
    } catch (error) {
      if (error instanceof ApiError || error instanceof z.ZodError) throw error;
      throw new ApiError(
        controller.signal.aborted
          ? 'The request timed out. Please try again.'
          : 'Cannot reach Organize. Check your connection and API address.',
        0,
      );
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', abort);
    }
  }
  return {
    requestCode: (email: string) =>
      request('/v1/auth/request-code', codeSentSchema, {
        method: 'POST',
        body: requestCodeSchema.parse({ email }),
      }),
    verifyCode: (email: string, code: string) =>
      request('/v1/auth/verify-code', sessionSchema, {
        method: 'POST',
        body: verifyCodeSchema.parse({ email, code }),
      }),
    me: () => request('/v1/me', userSchema),
    signOut: () => request('/v1/auth/sign-out', z.undefined(), { method: 'POST' }),
    async list(filters: Filters, offset = 0, signal?: AbortSignal) {
      const params = new URLSearchParams({ offset: String(offset), limit: '30' });
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') params.set(key, String(value));
      });
      return request(`/v1/items?${params.toString()}`, libraryPageSchema, { signal });
    },
    item: (id: string) => request(`/v1/items/${id}`, itemSchema),
    folders: () => request('/v1/folders', z.array(folderSchema)),
    stats: () => request('/v1/stats', statsSchema),
    tags: () => request('/v1/tags', z.array(tagFacetSchema)),
    createNote: (input: NoteInput) =>
      request('/v1/notes', itemSchema, { method: 'POST', body: noteInputSchema.parse(input) }),
    updateItem: (id: string, input: ItemUpdate) =>
      request(`/v1/items/${id}`, itemSchema, {
        method: 'PATCH',
        body: itemUpdateSchema.parse(input),
      }),
    createFolder: (input: FolderInput) =>
      request('/v1/folders', folderSchema, {
        method: 'POST',
        body: folderInputSchema.parse(input),
      }),
    updateFolder: (id: string, input: FolderUpdate) =>
      request(`/v1/folders/${id}`, folderSchema, {
        method: 'PATCH',
        body: folderUpdateSchema.parse(input),
      }),
    deleteFolder: (id: string) => request(`/v1/folders/${id}`, z.undefined(), { method: 'DELETE' }),
    deleteItem: (id: string) => request(`/v1/items/${id}`, z.undefined(), { method: 'DELETE' }),
    download: (id: string) => request(`/v1/items/${id}/download`, downloadSchema),
    async upload(asset: DocumentPickerAsset, folderId: string | null) {
      const form = new FormData();
      form.append('metadata', JSON.stringify({ folderId }));
      if (Platform.OS === 'web') {
        const blob = asset.file ?? (await (await fetch(asset.uri)).blob());
        form.append('file', blob, asset.name);
      } else {
        // React Native FormData accepts a URI descriptor instead of a browser Blob.
        form.append('file', {
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType ?? 'application/octet-stream',
        } as unknown as Blob);
      }
      return request('/v1/files', itemSchema, { method: 'POST', form });
    },
  };
}
export type OrganizeApi = ReturnType<typeof createApi>;
