import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Folder } from '@organize/contracts';
import { colors } from '../../theme/tokens';
import { Icon } from '../../components/Icon';
import { folderLabel, folderPath } from './folder-paths';

export function FolderPicker({
  folders,
  value,
  onChange,
  exclude,
}: {
  folders: Folder[];
  value: string | null;
  onChange: (id: string | null) => void;
  exclude?: string;
}) {
  const options = folders.filter(
    (folder) =>
      !exclude || !folderPath(folder.id, folders).some((ancestor) => ancestor.id === exclude),
  );
  return (
    <View style={styles.group}>
      <Text style={styles.label}>Folder</Text>
      <ScrollView style={styles.list} nestedScrollEnabled>
        {[
          { id: null, name: 'Unfiled' },
          ...options.map((folder) => ({ id: folder.id, name: folderLabel(folder.id, folders) })),
        ].map((option) => (
          <Pressable
            key={option.id ?? 'root'}
            accessibilityRole="radio"
            accessibilityState={{ checked: value === option.id }}
            onPress={() => onChange(option.id)}
            style={[styles.option, value === option.id && styles.selected]}
          >
            <Icon
              name={option.id ? 'folder' : 'inbox'}
              size={16}
              color={value === option.id ? colors.sage : colors.muted}
            />
            <Text style={[styles.name, value === option.id && { color: colors.sage }]}>
              {option.name}
            </Text>
            {value === option.id && <Icon name="check" size={16} color={colors.sage} />}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  group: { gap: 8 },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted },
  list: {
    maxHeight: 150,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  option: {
    minHeight: 44,
    paddingHorizontal: 13,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selected: { backgroundColor: colors.sageLight },
  name: { flex: 1, fontSize: 13, color: colors.ink },
});
