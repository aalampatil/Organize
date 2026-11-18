import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ErrorMessage } from '../../components/Feedback';
import { Icon } from '../../components/Icon';
import { colors } from '../../theme/tokens';
import { errorMessage } from '../../lib/errors';
import { formatBytes } from '../../lib/format';
import { AccountSheet } from '../auth/AccountSheet';
import { FolderEditor } from '../folders/FolderEditor';
import { ItemSheet } from '../notes/ItemEditor';
import { LibraryToolbar } from './LibraryToolbar';
import { Sidebar } from './Sidebar';
import { LibraryHeader } from './LibraryHeader';
import { LibraryFolders } from './LibraryFolders';
import { LibraryItems } from './LibraryItems';
import { LibraryBottomNav } from './LibraryBottomNav';
import { useLibraryController } from './useLibraryController';
import { styles } from './library.styles';

export function LibraryScreen() {
  const controller = useLibraryController();
  const {
    desktop,
    view,
    folderId,
    folders,
    library,
    tag,
    changeView,
    openFolder,
    selectTag,
    setFolderEditor,
    setAccount,
    search,
    changeSearch,
    kind,
    setKind,
    refresh,
    setTag,
    error,
    actions,
    editor,
    setEditor,
    folderEditor,
    account,
  } = controller;
  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <View style={styles.layout}>
        {desktop && (
          <Sidebar
            view={view}
            folderId={folderId}
            folders={folders}
            tags={library.tags.data ?? []}
            stats={library.stats.data}
            selectedTag={tag}
            onView={changeView}
            onFolder={openFolder}
            onTag={selectTag}
            onNewFolder={() => setFolderEditor({})}
            onAccount={() => setAccount(true)}
          />
        )}
        <View style={styles.main}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={library.items.isRefetching}
                onRefresh={refresh}
                tintColor={colors.sage}
              />
            }
            contentContainerStyle={[styles.content, desktop && styles.desktopContent]}
          >
            <LibraryHeader controller={controller} />
            <LibraryToolbar
              search={search}
              onSearch={changeSearch}
              kind={kind}
              onKind={setKind}
              onRefresh={refresh}
              fetching={library.items.isFetching}
            />
            {tag && (
              <View style={styles.activeTag}>
                <Icon name="hash" size={15} color={colors.sage} />
                <Text style={styles.previewText}>{tag}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear tag filter"
                  onPress={() => setTag(undefined)}
                >
                  <Icon name="x" size={16} color={colors.sage} />
                </Pressable>
              </View>
            )}
            <ErrorMessage
              message={
                error ?? (library.folders.error ? errorMessage(library.folders.error) : null)
              }
            />
            {actions.upload.isPending && (
              <View style={styles.uploading}>
                <ActivityIndicator size="small" color={colors.sage} />
                <Text style={styles.subtitle}>Adding your file and making it searchable…</Text>
              </View>
            )}

            <LibraryFolders controller={controller} />
            <LibraryItems controller={controller} />
            <View style={styles.footer}>
              <View style={styles.breadcrumb}>
                <Icon name="lock" size={11} color={colors.muted} />
                <Text style={styles.footerText}>Your own little corner. Always private.</Text>
              </View>
              {library.stats.data && (
                <Text style={styles.footerText}>
                  {library.stats.data.total} items · {formatBytes(library.stats.data.bytes)}{' '}
                  uploaded
                </Text>
              )}
            </View>
          </ScrollView>
          <LibraryBottomNav controller={controller} />
        </View>
      </View>
      {editor && (
        <ItemSheet
          id={editor.id}
          folderId={folderId}
          folders={folders}
          onClose={() => setEditor(null)}
        />
      )}
      {folderEditor && (
        <FolderEditor
          folder={folderEditor.folder}
          parentId={folderId}
          folders={folders}
          onClose={() => setFolderEditor(null)}
          onDeleted={() => {
            if (folderEditor.folder?.id === folderId) openFolder(null);
          }}
        />
      )}
      {account && (
        <AccountSheet onClose={() => setAccount(false)} onTrash={() => changeView('trash')} />
      )}
    </SafeAreaView>
  );
}
