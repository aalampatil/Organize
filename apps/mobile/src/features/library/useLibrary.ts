import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FolderInput, FolderUpdate, ItemUpdate, NoteInput } from '@organize/contracts';
import type { DocumentPickerAsset } from 'expo-document-picker';
import type { Filters } from '../../lib/api';
import { useSession } from '../auth/SessionProvider';

export function useLibrary(filters: Filters) {
  const { api } = useSession();
  const items = useInfiniteQuery({
    queryKey: ['library', 'items', filters],
    queryFn: ({ pageParam, signal }) => api.list(filters, pageParam, signal),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextOffset ?? undefined,
  });
  const folders = useQuery({ queryKey: ['library', 'folders'], queryFn: () => api.folders() });
  const tags = useQuery({ queryKey: ['library', 'tags'], queryFn: () => api.tags() });
  const stats = useQuery({ queryKey: ['library', 'stats'], queryFn: () => api.stats() });
  return { items, folders, tags, stats };
}
export function useLibraryActions() {
  const { api } = useSession();
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: ['library'] });
  return {
    saveNote: useMutation({
      mutationFn: ({ id, input }: { id?: string; input: NoteInput }) =>
        id ? api.updateItem(id, input) : api.createNote(input),
      onSuccess: refresh,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: ItemUpdate }) => api.updateItem(id, input),
      onSuccess: refresh,
    }),
    upload: useMutation({
      mutationFn: ({ asset, folderId }: { asset: DocumentPickerAsset; folderId: string | null }) =>
        api.upload(asset, folderId),
      onSuccess: refresh,
    }),
    saveFolder: useMutation({
      mutationFn: ({ id, input }: { id?: string; input: FolderInput | FolderUpdate }) =>
        id ? api.updateFolder(id, input) : api.createFolder(input as FolderInput),
      onSuccess: refresh,
    }),
    deleteFolder: useMutation({
      mutationFn: (id: string) => api.deleteFolder(id),
      onSuccess: refresh,
    }),
    deleteItem: useMutation({ mutationFn: (id: string) => api.deleteItem(id), onSuccess: refresh }),
    download: useMutation({ mutationFn: (id: string) => api.download(id) }),
  };
}
