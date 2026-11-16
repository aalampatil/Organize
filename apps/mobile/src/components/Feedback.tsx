import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/tokens';
import { Icon, type IconName } from './Icon';
import { Button } from './Button';

export function ErrorMessage({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <View accessibilityRole="alert" style={styles.error}>
      <Icon name="alert-circle" size={17} color={colors.danger} />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}
export function Loading({ label = 'Finding your things…' }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.sage} />
      <Text style={styles.description}>{label}</Text>
    </View>
  );
}
export function EmptyState({
  title,
  description,
  icon = 'inbox',
  action,
  onAction,
}: {
  title: string;
  description: string;
  icon?: IconName;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.center}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} size={30} color={colors.sage} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {action && onAction && <Button title={action} onPress={onAction} variant="secondary" />}
    </View>
  );
}
const styles = StyleSheet.create({
  error: {
    backgroundColor: colors.dangerLight,
    borderRadius: 12,
    padding: 13,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  errorText: { color: colors.danger, fontSize: 13, flex: 1, lineHeight: 20 },
  center: { paddingVertical: 52, paddingHorizontal: 24, alignItems: 'center', gap: 14 },
  title: { fontSize: 21, fontWeight: '600', color: colors.ink },
  description: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.muted,
    textAlign: 'center',
    maxWidth: 330,
  },
  emptyIcon: { padding: 20, backgroundColor: colors.sageLight, borderRadius: 24 },
});
