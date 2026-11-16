import type { Folder } from '@organize/contracts';

export function folderPath(folderId: string | null, folders: Folder[]): Folder[] {
  const path: Folder[] = [];
  const visited = new Set<string>();
  let cursor = folderId;
  while (cursor && !visited.has(cursor)) {
    visited.add(cursor);
    const folder = folders.find((entry) => entry.id === cursor);
    if (!folder) break;
    path.unshift(folder);
    cursor = folder.parentId;
  }
  return path;
}
export function folderLabel(folderId: string | null, folders: Folder[]) {
  return folderId
    ? folderPath(folderId, folders)
        .map((folder) => folder.name)
        .join(' / ') || 'Folder'
    : 'Unfiled';
}
