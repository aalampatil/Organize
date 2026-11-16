import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { Filters } from '../../lib/api';
import { colors } from '../../theme/tokens';
import { Icon, type IconName } from '../../components/Icon';

const kinds: { value: Filters['kind']; label: string; icon: IconName }[] = [
  { value: undefined, label: 'Everything', icon: 'layers' },
  { value: 'note', label: 'Notes', icon: 'align-left' },
  { value: 'pdf', label: 'PDFs', icon: 'file-text' },
  { value: 'image', label: 'Images', icon: 'image' },
  { value: 'file', label: 'All files', icon: 'paperclip' },
];
export function LibraryToolbar({
  search,
  onSearch,
  kind,
  onKind,
  onRefresh,
  fetching,
}: {
  search: string;
  onSearch: (value: string) => void;
  kind: Filters['kind'];
  onKind: (value: Filters['kind']) => void;
  onRefresh: () => void;
  fetching: boolean;
}) {
  return (
    <View style={{ gap: 21 }}>
      <View style={styles.search}>
        <Icon name="search" size={21} color={colors.sage} />
        <TextInput
          accessibilityLabel="Search your library"
          placeholder="Search notes, files, or anything you remember…"
          placeholderTextColor="#9AA395"
          value={search}
          onChangeText={onSearch}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          style={styles.input}
        />
        {search ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            onPress={() => onSearch('')}
            hitSlop={10}
          >
            <Icon name="x" size={18} color={colors.muted} />
          </Pressable>
        ) : (
          <Icon name="sliders" size={16} color="#A9B19F" />
        )}
      </View>
      <View style={styles.row}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.kinds}
        >
          {kinds.map((entry) => (
            <Pressable
              key={entry.label}
              accessibilityRole="button"
              accessibilityState={{ selected: kind === entry.value }}
              onPress={() => onKind(entry.value)}
              style={[styles.chip, kind === entry.value && styles.active]}
            >
              <Icon
                name={entry.icon}
                size={14}
                color={kind === entry.value ? colors.sage : colors.muted}
              />
              <Text style={[styles.chipText, kind === entry.value && { color: colors.sage }]}>
                {entry.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh library"
          disabled={fetching}
          onPress={onRefresh}
          style={styles.refresh}
        >
          <Icon name="refresh-cw" size={16} color={colors.muted} />
        </Pressable>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  search: {
    minHeight: 58,
    borderWidth: 1,
    borderColor: '#DCE4D5',
    borderRadius: 14,
    paddingHorizontal: 18,
    backgroundColor: '#F0F4EA',
    flexDirection: 'row',
    gap: 13,
    alignItems: 'center',
  },
  input: { flex: 1, minWidth: 0, paddingVertical: 17, fontSize: 14, color: colors.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kinds: { gap: 7 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  active: { backgroundColor: colors.sageLight },
  chipText: { color: colors.muted, fontSize: 12, fontWeight: '500' },
  refresh: { padding: 10 },
});
