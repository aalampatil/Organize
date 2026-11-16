import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Item } from '@organize/contracts';
import { Icon } from '../../components/Icon';
import { colors } from '../../theme/tokens';
import { formatBytes, formatDate } from '../../lib/format';

export function ItemCard({
  item,
  folder,
  onOpen,
  onFavorite,
  compact = false,
  busy = false,
}: {
  item: Item;
  folder: string;
  onOpen: () => void;
  onFavorite: () => void;
  compact?: boolean;
  busy?: boolean;
}) {
  const isNote = item.kind === 'note';
  const icon = isNote
    ? 'align-left'
    : item.file?.mimeType === 'application/pdf'
      ? 'file-text'
      : item.file?.mimeType.startsWith('image/')
        ? 'image'
        : 'file';
  return (
    <View style={[styles.card, compact && styles.compact]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${item.title}`}
        onPress={onOpen}
        style={styles.main}
      >
        <View style={styles.top}>
          <View
            style={[
              styles.fileIcon,
              {
                backgroundColor: isNote
                  ? colors.note
                  : item.file?.mimeType === 'application/pdf'
                    ? colors.rose
                    : colors.blue,
              },
            ]}
          >
            <Icon
              name={icon}
              size={21}
              color={
                isNote
                  ? '#A08C58'
                  : item.file?.mimeType === 'application/pdf'
                    ? '#AB6965'
                    : '#5D82A3'
              }
            />
          </View>
          <Text style={styles.kind}>
            {isNote ? 'NOTE' : item.file?.mimeType === 'application/pdf' ? 'PDF' : 'FILE'}
          </Text>
        </View>
        <Text numberOfLines={2} style={styles.title}>
          {item.title}
        </Text>
        {!compact && (
          <Text numberOfLines={3} style={styles.excerpt}>
            {item.excerpt ||
              (item.file
                ? `${item.file.filename}\n${formatBytes(item.file.bytes)}`
                : 'An idea waiting to happen.')}
          </Text>
        )}
        {!compact && (
          <View style={styles.tags}>
            {item.tags.slice(0, 3).map((tag) => (
              <Text key={tag} numberOfLines={1} style={styles.tag}>
                #{tag}
              </Text>
            ))}
          </View>
        )}
      </Pressable>
      <View style={styles.footer}>
        <View style={styles.location}>
          <Icon name="folder" size={12} color={colors.muted} />
          <Text numberOfLines={1} style={styles.caption}>
            {folder}
          </Text>
        </View>
        <Text style={styles.date}>{formatDate(item.updatedAt)}</Text>
        {!item.trashedAt && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              item.favorite ? `Unfavorite ${item.title}` : `Favorite ${item.title}`
            }
            accessibilityState={{ selected: item.favorite }}
            disabled={busy}
            onPress={onFavorite}
            hitSlop={8}
            style={styles.favorite}
          >
            <Icon name="star" size={17} color={item.favorite ? colors.orange : '#BCC3B9'} />
          </Pressable>
        )}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    flex: 1,
  },
  compact: { minHeight: 120 },
  main: { padding: 20, gap: 13, flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fileIcon: {
    width: 42,
    height: 45,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kind: { fontSize: 9, fontWeight: '600', letterSpacing: 1.6, color: '#A1A99E' },
  title: {
    fontSize: 17,
    lineHeight: 24,
    color: colors.ink,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  excerpt: { fontSize: 13, color: colors.muted, lineHeight: 21, minHeight: 63 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, minHeight: 23 },
  tag: {
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 10,
    color: colors.sage,
    maxWidth: 130,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: '#F0F2EC',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  location: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
  caption: { fontSize: 10, color: colors.muted, flexShrink: 1 },
  date: { fontSize: 10, color: '#A1A99E' },
  favorite: { padding: 4 },
});
