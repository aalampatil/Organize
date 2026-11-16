import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Folder, LibraryStats, TagFacet } from '@organize/contracts';
import { Brand } from '../../components/Brand';
import { Icon, type IconName } from '../../components/Icon';
import { colors, folderColors } from '../../theme/tokens';

export type LibraryView = 'all' | 'favorites' | 'folders' | 'trash';
export function Sidebar({
  view,
  folderId,
  folders,
  tags,
  stats,
  selectedTag,
  onView,
  onFolder,
  onTag,
  onNewFolder,
  onAccount,
}: {
  view: LibraryView;
  folderId: string | null;
  folders: Folder[];
  tags: TagFacet[];
  stats?: LibraryStats;
  selectedTag?: string;
  onView: (view: LibraryView) => void;
  onFolder: (id: string) => void;
  onTag: (tag: string) => void;
  onNewFolder: () => void;
  onAccount: () => void;
}) {
  const navigation: { view: LibraryView; name: string; icon: IconName; count?: number }[] = [
    { view: 'all', name: 'All items', icon: 'grid', count: stats?.total },
    { view: 'favorites', name: 'Favorites', icon: 'star', count: stats?.favorites },
    { view: 'folders', name: 'Folders', icon: 'folder' },
  ];
  return (
    <View style={styles.sidebar}>
      <View style={styles.brand}>
        <Brand />
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.section}>YOUR SPACE</Text>
        <View style={{ gap: 5 }}>
          {navigation.map((entry) => (
            <Pressable
              key={entry.view}
              accessibilityRole="button"
              accessibilityState={{ selected: view === entry.view && !folderId && !selectedTag }}
              onPress={() => onView(entry.view)}
              style={[
                styles.link,
                view === entry.view && !folderId && !selectedTag && styles.active,
              ]}
            >
              <Icon
                name={entry.icon}
                size={18}
                color={view === entry.view ? colors.sage : colors.muted}
              />
              <Text style={styles.linkText}>{entry.name}</Text>
              {entry.count !== undefined && <Text style={styles.count}>{entry.count}</Text>}
            </Pressable>
          ))}
        </View>
        <View style={styles.sectionRow}>
          <Text style={styles.section}>FOLDERS</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create folder"
            onPress={onNewFolder}
            hitSlop={10}
          >
            <Icon name="plus" size={16} color={colors.muted} />
          </Pressable>
        </View>
        {folders
          .filter((folder) => !folder.parentId)
          .slice(0, 12)
          .map((folder) => (
            <Pressable
              key={folder.id}
              accessibilityRole="button"
              onPress={() => onFolder(folder.id)}
              style={[styles.link, folderId === folder.id && styles.active]}
            >
              <View style={[styles.dot, { backgroundColor: folderColors[folder.color] }]} />
              <Text numberOfLines={1} style={styles.folderName}>
                {folder.name}
              </Text>
            </Pressable>
          ))}
        {folders.length === 0 && <Text style={styles.small}>Give your ideas a home.</Text>}
        <View style={styles.sectionRow}>
          <Text style={styles.section}>YOUR TAGS</Text>
          <Icon name="hash" size={13} color={colors.muted} />
        </View>
        <View style={styles.tags}>
          {tags.slice(0, 12).map((tag) => (
            <Pressable
              key={tag.name}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedTag === tag.name }}
              onPress={() => onTag(tag.name)}
              style={[styles.tag, selectedTag === tag.name && styles.active]}
            >
              <Text style={styles.tagText}># {tag.name}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.divider} />
        <Pressable
          accessibilityRole="button"
          onPress={() => onView('trash')}
          style={[styles.link, view === 'trash' && styles.active]}
        >
          <Icon name="trash-2" size={17} color={colors.muted} />
          <Text style={styles.linkText}>Trash</Text>
        </Pressable>
      </ScrollView>
      <View style={styles.bottom}>
        <View style={styles.tip}>
          <Icon name="search" size={20} color={colors.sage} />
          <Text style={styles.tipTitle}>Less looking. More finding.</Text>
          <Text style={styles.tipText}>
            Search a word, a title, or a tag. We’ll take it from there.
          </Text>
        </View>
        <Pressable accessibilityRole="button" onPress={onAccount} style={styles.account}>
          <View style={styles.avatar}>
            <Icon name="user" size={17} color={colors.sage} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.accountName}>My personal space</Text>
            <Text style={styles.small}>Account & settings</Text>
          </View>
          <Icon name="chevron-right" size={15} color={colors.muted} />
        </Pressable>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  sidebar: {
    width: 242,
    backgroundColor: '#FBFCF9',
    borderRightWidth: 1,
    borderRightColor: colors.line,
  },
  brand: { paddingHorizontal: 28, paddingTop: 35, paddingBottom: 42 },
  body: { paddingHorizontal: 20, gap: 5 },
  section: {
    fontSize: 9,
    letterSpacing: 1.6,
    fontWeight: '700',
    color: '#A0A89D',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 10,
    marginTop: 30,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 10,
    paddingHorizontal: 13,
    minHeight: 42,
  },
  active: { backgroundColor: colors.sageLight },
  linkText: { fontSize: 13, color: colors.ink, flex: 1, fontWeight: '500' },
  count: {
    fontSize: 11,
    color: colors.sage,
    backgroundColor: '#DDE7D6',
    minWidth: 23,
    textAlign: 'center',
    borderRadius: 6,
    padding: 3,
  },
  dot: { height: 10, width: 10, borderRadius: 3, borderWidth: 1, borderColor: '#00000012' },
  folderName: { fontSize: 13, color: colors.muted, flex: 1 },
  small: { color: colors.muted, fontSize: 10, paddingVertical: 4 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, paddingHorizontal: 10 },
  tag: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  tagText: { color: colors.muted, fontSize: 10 },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 24, marginHorizontal: 12 },
  bottom: { padding: 20, gap: 20 },
  tip: { padding: 17, backgroundColor: '#F0F3EB', borderRadius: 15, gap: 9 },
  tipTitle: { fontSize: 12, fontWeight: '600', color: colors.sage },
  tipText: { fontSize: 11, lineHeight: 18, color: colors.muted },
  account: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 4 },
  avatar: {
    width: 34,
    height: 34,
    backgroundColor: colors.sageLight,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountName: { color: colors.ink, fontSize: 11, fontWeight: '600' },
});
