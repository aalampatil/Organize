import type { Folder, Item } from '@organize/contracts';
import { createApi, type OrganizeApi } from '../../lib/api';

const id = (value: number) => `00000000-0000-4000-8000-${String(value).padStart(12, '0')}`;
export function createDemoApi(): OrganizeApi {
  const now = new Date().toISOString();
  const folders: Folder[] = [
    { id: id(10), name: 'Personal', parentId: null, color: 'sage', createdAt: now, updatedAt: now },
    {
      id: id(11),
      name: 'Work & ideas',
      parentId: null,
      color: 'blue',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: id(12),
      name: 'Learning',
      parentId: null,
      color: 'amber',
      createdAt: now,
      updatedAt: now,
    },
    { id: id(13), name: 'Travel', parentId: id(10), color: 'rose', createdAt: now, updatedAt: now },
  ];
  const entries = [
    {
      title: 'A place for the things you want to remember',
      body: 'Welcome to your calmer corner of the internet.\n\nSave an idea. Keep a useful document. Find it again in seconds.\n\nTry searching “remember”, add a tag, or create a note of your own.',
      folderId: id(10),
      tags: ['getting started'],
      favorite: true,
    },
    {
      title: 'Small ideas, big possibilities',
      body: 'A running list of things I want to make.\n\n• A better morning routine\n• A tiny balcony garden\n• An app that makes finding things feel effortless',
      folderId: id(11),
      tags: ['ideas', 'inspiration'],
      favorite: false,
    },
    {
      title: 'Weekend escape checklist',
      body: 'Slow mornings, a good book, and somewhere new.\n\nPack a notebook and camera. Download the map. Save the booking confirmation. Leave a little room for unplanned adventures.',
      folderId: id(13),
      tags: ['travel', 'personal'],
      favorite: true,
    },
    {
      title: 'Notes from a good book',
      body: 'Make space for what matters.\n\nThe most useful system is the one you enjoy coming back to. Keep things simple, and let small habits do the heavy lifting.',
      folderId: id(12),
      tags: ['reading'],
      favorite: false,
    },
  ];
  let counter = 100;
  let items: Item[] = entries.map((entry, index) => ({
    ...entry,
    id: id(20 + index),
    kind: 'note',
    excerpt: entry.body.slice(0, 220),
    file: null,
    trashedAt: null,
    createdAt: now,
    updatedAt: now,
  }));
  const missing = () => {
    throw new Error('This sample item is no longer available.');
  };
  const get = (itemId: string) => items.find((item) => item.id === itemId) ?? missing();
  const noFile = async (): Promise<never> => {
    throw new Error('Sign in to your account to upload and download real files.');
  };
  return {
    ...createApi(),
    async list(filters, offset = 0) {
      let result = items.filter((item) => Boolean(item.trashedAt) === Boolean(filters.trash));
      if (filters.q) {
        const q = filters.q.toLowerCase();
        result = result.filter((item) =>
          [item.title, item.body, item.file?.filename, ...item.tags]
            .join(' ')
            .toLowerCase()
            .includes(q),
        );
      }
      if (filters.kind)
        result = result.filter((item) =>
          filters.kind === 'image'
            ? item.file?.mimeType.startsWith('image/')
            : filters.kind === 'pdf'
              ? item.file?.mimeType === 'application/pdf'
              : item.kind === filters.kind,
        );
      if (filters.folderId)
        result = result.filter((item) =>
          filters.folderId === 'root' ? !item.folderId : item.folderId === filters.folderId,
        );
      if (filters.tag) result = result.filter((item) => item.tags.includes(filters.tag!));
      if (filters.favorite !== undefined)
        result = result.filter((item) => item.favorite === filters.favorite);
      result.sort((a, b) =>
        filters.sort === 'title'
          ? a.title.localeCompare(b.title)
          : filters.sort === 'oldest'
            ? a.updatedAt.localeCompare(b.updatedAt)
            : b.updatedAt.localeCompare(a.updatedAt),
      );
      return {
        items: result.slice(offset, offset + 30),
        total: result.length,
        nextOffset: offset + 30 < result.length ? offset + 30 : null,
      };
    },
    async item(itemId) {
      return { ...get(itemId) };
    },
    async folders() {
      return [...folders];
    },
    async stats() {
      const active = items.filter((item) => !item.trashedAt);
      return {
        total: active.length,
        notes: active.filter((item) => item.kind === 'note').length,
        files: active.filter((item) => item.kind === 'file').length,
        favorites: active.filter((item) => item.favorite).length,
        bytes: 0,
      };
    },
    async tags() {
      const counts = new Map<string, number>();
      items
        .filter((item) => !item.trashedAt)
        .forEach((item) => item.tags.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1)));
      return [...counts].map(([name, count]) => ({ name, count }));
    },
    async createNote(input) {
      const item: Item = {
        ...input,
        id: id(counter++),
        kind: 'note',
        excerpt: input.body.slice(0, 220),
        favorite: false,
        file: null,
        trashedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      items.unshift(item);
      return { ...item };
    },
    async updateItem(itemId, input) {
      const item = get(itemId);
      const { trashed, ...fields } = input;
      Object.assign(item, fields, { updatedAt: new Date().toISOString() });
      if (trashed !== undefined) item.trashedAt = trashed ? new Date().toISOString() : null;
      item.excerpt = item.body.slice(0, 220);
      return { ...item };
    },
    async deleteItem(itemId) {
      items = items.filter((item) => item.id !== itemId);
    },
    async createFolder(input) {
      const folder: Folder = { ...input, id: id(counter++), createdAt: now, updatedAt: now };
      folders.push(folder);
      return { ...folder };
    },
    async updateFolder(folderId, input) {
      const folder = folders.find((entry) => entry.id === folderId);
      if (!folder) return missing();
      if (input.parentId === folderId) throw new Error('A folder cannot be its own parent.');
      Object.assign(folder, input);
      return { ...folder };
    },
    async deleteFolder(folderId) {
      if (
        items.some((item) => item.folderId === folderId) ||
        folders.some((folder) => folder.parentId === folderId)
      )
        throw new Error('Move the folder’s items and subfolders before deleting it.');
      const index = folders.findIndex((folder) => folder.id === folderId);
      if (index >= 0) folders.splice(index, 1);
    },
    upload: noFile,
    download: noFile,
    createReference: async () => {
      throw new Error('Sign in to link files from your device.');
    },
    reconnectReference: async () => {
      throw new Error('Sign in to reconnect linked files.');
    },
  };
}
