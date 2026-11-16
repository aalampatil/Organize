import { Pressable, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { EmptyState, Loading } from '../../components/Feedback';
import { Icon } from '../../components/Icon';
import { colors } from '../../theme/tokens';
import { errorMessage } from '../../lib/errors';
import { folderLabel } from '../folders/folder-paths';
import { ItemCard } from './ItemCard';
import type { LibraryController } from './useLibraryController';
import { styles } from './library.styles';
export function LibraryItems({ controller }: { controller: LibraryController }) {
  const {
    search,
    view,
    folderId,
    total,
    sort,
    setSort,
    compact,
    setCompact,
    library,
    rows,
    setSearch,
    setKind,
    setTag,
    setEditor,
    columns,
    folders,
    actions,
    favorite,
  } = controller;
  return (
    <View style={styles.section}>
      <View style={styles.sectionTitle}>
        <View style={styles.breadcrumb}>
          <Text style={styles.sectionHeading}>
            {search
              ? 'Search results'
              : view === 'trash'
                ? 'In Trash'
                : view === 'folders'
                  ? folderId
                    ? 'In this folder'
                    : 'Unfiled items'
                  : view === 'favorites'
                    ? 'Saved favorites'
                    : 'Recently collected'}
          </Text>
          <Text style={styles.resultCount}>{total}</Text>
        </View>
        <View style={styles.controls}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Sort ${sort}. Change sort order`}
            onPress={() =>
              setSort(sort === 'recent' ? 'title' : sort === 'title' ? 'oldest' : 'recent')
            }
            style={styles.textAction}
          >
            <Icon name="arrow-down" size={12} color={colors.muted} />
            <Text style={styles.sort}>
              {sort === 'recent' ? 'Newest' : sort === 'title' ? 'A–Z' : 'Oldest'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={compact ? 'Show detailed cards' : 'Show compact cards'}
            onPress={() => setCompact(!compact)}
            style={styles.viewToggle}
          >
            <Icon name={compact ? 'grid' : 'list'} size={15} color={colors.sage} />
          </Pressable>
        </View>
      </View>
      {library.items.isPending ? (
        <Loading />
      ) : library.items.isError ? (
        <EmptyState
          title="Let’s try that again"
          description={errorMessage(library.items.error)}
          icon="wifi-off"
          action="Retry"
          onAction={() => {
            void library.items.refetch();
          }}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title={
            search
              ? 'Nothing here just yet'
              : view === 'trash'
                ? 'A clean slate'
                : view === 'favorites'
                  ? 'Keep your favorites close'
                  : 'Your next good idea starts here'
          }
          description={
            search
              ? 'Try a different word, filename, or tag. You can also clear your filters.'
              : view === 'trash'
                ? 'Items you move to Trash will appear here.'
                : view === 'favorites'
                  ? 'Tap the star on any note or file to save it here.'
                  : 'Write a thought or upload a file. Finding it later is the easy part.'
          }
          action={
            search
              ? 'Clear search & filters'
              : view === 'trash' || view === 'favorites'
                ? undefined
                : 'Create your first note'
          }
          onAction={
            search
              ? () => {
                  setSearch('');
                  setKind(undefined);
                  setTag(undefined);
                }
              : () => setEditor({})
          }
        />
      ) : (
        <View style={styles.itemGrid}>
          {rows.map((item) => (
            <View key={item.id} style={{ width: `${100 / columns}%`, padding: 7 }}>
              <ItemCard
                item={item}
                folder={folderLabel(item.folderId, folders)}
                compact={compact}
                onOpen={() => setEditor({ id: item.id })}
                busy={actions.update.isPending}
                onFavorite={() => {
                  void favorite(item.id, !item.favorite);
                }}
              />
            </View>
          ))}
        </View>
      )}
      {library.items.hasNextPage && (
        <Button
          title="Show more"
          variant="secondary"
          busy={library.items.isFetchingNextPage}
          onPress={() => {
            void library.items.fetchNextPage();
          }}
        />
      )}
    </View>
  );
}
