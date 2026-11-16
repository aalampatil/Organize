import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors } from '../theme/tokens';

export function Field({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        {...props}
        style={[styles.input, props.multiline && styles.multiline, props.style]}
      />
      {error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  group: { gap: 8 },
  label: { fontSize: 13, color: colors.muted, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.surface,
    minHeight: 48,
  },
  multiline: { minHeight: 200, textAlignVertical: 'top', lineHeight: 25 },
  error: { color: colors.danger, fontSize: 13 },
});
