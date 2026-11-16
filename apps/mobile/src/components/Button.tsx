import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../theme/tokens';
import { Icon, type IconName } from './Icon';

export function Button({
  title,
  onPress,
  icon,
  variant = 'primary',
  busy = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  icon?: IconName;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  busy?: boolean;
  disabled?: boolean;
}) {
  const foreground =
    variant === 'primary' ? '#FFF' : variant === 'danger' ? colors.danger : colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        { opacity: disabled || busy ? 0.5 : pressed ? 0.78 : 1 },
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={foreground} />
      ) : icon ? (
        <Icon name={icon} size={17} color={foreground} />
      ) : null}
      <Text style={[styles.label, { color: foreground }]}>{title}</Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  base: {
    minHeight: 46,
    paddingHorizontal: 18,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  primary: { backgroundColor: colors.sage },
  secondary: { backgroundColor: colors.sageLight },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: colors.dangerLight },
  label: { fontSize: 14, fontWeight: '600' },
});
