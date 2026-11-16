import { Pressable, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { EmptyState, Loading } from '../../components/Feedback';
import { Icon } from '../../components/Icon';
import { colors } from '../../theme/tokens';
import { FolderGrid } from '../folders/FolderGrid';
import { folderPath } from '../folders/folder-paths';
import type { LibraryController } from './useLibraryController';
import { styles } from './library.styles';
export function LibraryFolders({ controller }: { controller: LibraryController }) {
  const {
    showFolders,
    openFolder,
    view,
    folderId,
    folders,
    setFolderEditor,
    library,
    childFolders,
    folderColumns,
    changeView,
  } = controller;
  return (
    <>
      {' '}
      {showFolders && (
        <View style={styles.section}>
          <View style={styles.sectionTitle}>
            <View style={styles.breadcrumb}>
              <Pressable accessibilityRole="button" onPress={() => openFolder(null)}>
                <Text style={styles.sectionHeading}>Folders</Text>
              </Pressable>
              {view === 'folders' &&
                folderPath(folderId, folders).map((folder) => (
                  <View key={folder.id} style={styles.breadcrumb}>
                    <Icon name="chevron-right" size={12} color={colors.muted} />
                    <Pressable accessibilityRole="button" onPress={() => openFolder(folder.id)}>
                      <Text style={styles.path}>{folder.name}</Text>
                    </Pressable>
                  </View>
                ))}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="New folder"
              onPress={() => setFolderEditor({})}
              style={styles.textAction}
            >
              <Icon name="plus" size={13} color={colors.sage} />
              <Text style={styles.link}>New folder</Text>
            </Pressable>
          </View>
          {library.folders.isPending ? (
            <Loading label="Opening folders…" />
          ) : childFolders.length > 0 ? (
            <FolderGrid
              folders={view === 'all' ? childFolders.slice(0, 4) : childFolders}
              onOpen={openFolder}
              onEdit={(folder) => setFolderEditor({ folder })}
              columns={folderColumns}
            />
          ) : view === 'folders' ? (
            <EmptyState
              title="Make a little space"
              description="Create a folder, or save a note here. Your own kind of organized."
              icon="folder"
            />
          ) : (
            <Text style={styles.subtitle}>Your folders will feel right at home here.</Text>
          )}
          {view === 'all' && childFolders.length > 4 && (
            <Button title="See all folders" variant="ghost" onPress={() => changeView('folders')} />
          )}
        </View>
      )}
    </>
  );
}
