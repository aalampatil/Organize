import { useState } from 'react';
import { useWindowDimensions } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import type { Folder } from '@organize/contracts';
import type { Filters } from '../../lib/api';
import { errorMessage } from '../../lib/errors';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useSession } from '../auth/SessionProvider';
import { useLibrary, useLibraryActions } from './useLibrary';
import type { LibraryView } from './Sidebar';

export function useLibraryController() {
  const { width } = useWindowDimensions();
  const desktop = width >= 980;
  const available = desktop ? width - 330 : width - 40;
  const columns = available > 980 ? 3 : available > 540 ? 2 : 1;
  const folderColumns = available > 900 ? 4 : available > 540 ? 3 : 2;
  const { preview } = useSession();
  const [view, setView] = useState<LibraryView>('all');
  const [folderId, setFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [kind, setKind] = useState<Filters['kind']>();
  const [tag, setTag] = useState<string>();
  const [sort, setSort] = useState<NonNullable<Filters['sort']>>('recent');
  const [compact, setCompact] = useState(false);
  const [editor, setEditor] = useState<{ id?: string } | null>(null);
  const [folderEditor, setFolderEditor] = useState<{ folder?: Folder } | null>(null);
  const [account, setAccount] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const filters: Filters = {
    q: debouncedSearch,
    kind,
    tag,
    sort,
    favorite: view === 'favorites' ? true : undefined,
    trash: view === 'trash',
    folderId: view === 'folders' ? (folderId ?? 'root') : undefined,
  };
  const library = useLibrary(filters);
  const actions = useLibraryActions();
  const folders = library.folders.data ?? [];
  const currentFolder = folders.find((folder) => folder.id === folderId);
  const childFolders = folders.filter(
    (folder) => folder.parentId === (view === 'folders' ? folderId : null),
  );
  const rows = library.items.data?.pages.flatMap((page) => page.items) ?? [];
  const total = library.items.data?.pages[0]?.total ?? 0;
  const changeView = (next: LibraryView) => {
    setView(next);
    setFolderId(null);
    setTag(undefined);
    setSearch('');
    setKind(undefined);
    setError(null);
  };
  const openFolder = (id: string | null) => {
    setView('folders');
    setFolderId(id);
    setSearch('');
    setTag(undefined);
    setError(null);
  };
  const selectTag = (name: string) => {
    setView('all');
    setFolderId(null);
    setTag(tag === name ? undefined : name);
    setError(null);
  };
  const refresh = () => {
    void library.items.refetch();
    void library.folders.refetch();
    void library.stats.refetch();
    void library.tags.refetch();
  };
  const upload = async () => {
    setError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset) return;
      const item = await actions.upload.mutateAsync({ asset, folderId });
      setEditor({ id: item.id });
    } catch (error) {
      setError(errorMessage(error));
    }
  };
  const favorite = async (id: string, value: boolean) => {
    setError(null);
    try {
      await actions.update.mutateAsync({ id, input: { favorite: value } });
    } catch (error) {
      setError(errorMessage(error));
    }
  };
  const heading = search
    ? 'A little searching, a little finding.'
    : view === 'favorites'
      ? 'Your favorites'
      : view === 'trash'
        ? 'A second chance'
        : view === 'folders'
          ? (currentFolder?.name ?? 'Your folders')
          : 'Your library';
  const description = search
    ? `Looking across your library for “${search}”`
    : view === 'favorites'
      ? 'The things you come back to, all in one place.'
      : view === 'trash'
        ? 'Restore what you need. Let go of what you don’t.'
        : view === 'folders'
          ? 'A home for every part of your life.'
          : 'Everything worth keeping. Always within reach.';
  const showFolders = !search && !tag && (view === 'all' || view === 'folders');
  const changeSearch = (value: string) => {
    setSearch(value);
    if (value) {
      setView('all');
      setFolderId(null);
    }
  };

  return {
    desktop,
    columns,
    folderColumns,
    preview,
    view,
    folderId,
    search,
    setSearch,
    changeSearch,
    kind,
    setKind,
    tag,
    setTag,
    sort,
    setSort,
    compact,
    setCompact,
    editor,
    setEditor,
    folderEditor,
    setFolderEditor,
    account,
    setAccount,
    error,
    library,
    actions,
    folders,
    childFolders,
    rows,
    total,
    changeView,
    openFolder,
    selectTag,
    refresh,
    upload,
    favorite,
    heading,
    description,
    showFolders,
  };
}
export type LibraryController = ReturnType<typeof useLibraryController>;
