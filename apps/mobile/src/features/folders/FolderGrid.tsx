import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Folder } from '@organize/contracts';
import { colors, folderColors } from '../../theme/tokens';
import { Icon } from '../../components/Icon';

export function FolderGrid({
  folders,
  onOpen,
  onEdit,
  columns,
}: {
  folders: Folder[];
  onOpen: (id: string) => void;
  onEdit: (folder: Folder) => void;
  columns: number;
}) {
  return (
    <View style={styles.grid}>
      {folders.map((folder) => (
        <View key={folder.id} style={{ width: `${100 / columns}%`, padding: 5 }}>
          <View style={styles.card}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ${folder.name}`}
              onPress={() => onOpen(folder.id)}
              style={styles.open}
            >
              <View style={[styles.icon, { backgroundColor: folderColors[folder.color] }]}>
                <Icon name="folder" size={24} color={colors.sage} />
              </View>
              <Text numberOfLines={1} style={styles.name}>
                {folder.name}
              </Text>
              <Text style={styles.caption}>
                Open folder <Text style={{ color: colors.sage }}>↗</Text>
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Edit ${folder.name}`}
              onPress={() => onEdit(folder)}
              style={styles.edit}
            >
              <Icon name="more-horizontal" size={18} color={colors.muted} />
            </Pressable>
          </View>
        </View>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', margin: -5 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 15,
  },
  open: { padding: 18, gap: 12 },
  icon: { width: 47, height: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 13, color: colors.ink, fontWeight: '600' },
  caption: { color: colors.muted, fontSize: 10 },
  edit: { position: 'absolute', right: 8, top: 8, padding: 8 },
});
