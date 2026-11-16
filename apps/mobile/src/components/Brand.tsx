import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/tokens';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <View style={styles.row}>
      <View style={styles.mark}>
        {[0, 1, 2, 3].map((index) => (
          <View key={index} style={[styles.square, index === 3 && styles.last]} />
        ))}
      </View>
      {!compact && (
        <Text style={styles.word}>
          organize<Text style={{ color: colors.orange }}>.</Text>
        </Text>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  mark: { width: 28, height: 28, flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  square: { width: 11, height: 11, backgroundColor: colors.sage, borderRadius: 3 },
  last: { backgroundColor: colors.orange, transform: [{ rotate: '-12deg' }] },
  word: { fontSize: 26, fontWeight: '700', letterSpacing: -1.1, color: colors.ink },
});
