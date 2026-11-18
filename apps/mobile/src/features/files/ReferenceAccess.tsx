import { StyleSheet, Text, View } from 'react-native';
import type { Item } from '@organize/contracts';
import { Button } from '../../components/Button';
import { ErrorMessage } from '../../components/Feedback';
import { colors } from '../../theme/tokens';
import { useDeviceReference } from './useDeviceReference';

export function ReferenceAccess({ item }: { item: Item }) {
  const reference = useDeviceReference(item);
  return (
    <View style={styles.content}>
      <Text style={styles.caption}>
        Linked file · The original stays in its current location. File contents are never uploaded
        or indexed. Find it by title, filename, folder, and tags.
      </Text>
      <Text accessibilityLiveRegion="polite" style={styles.caption}>
        {reference.message}
      </Text>
      <Button
        title={reference.openTitle}
        icon="external-link"
        variant="secondary"
        disabled={reference.loading || !reference.canOpen || reference.busy}
        onPress={() => {
          void reference.open();
        }}
      />
      <Button
        title="Reconnect file"
        icon="link"
        variant="secondary"
        disabled={Boolean(reference.unsupported) || reference.loading || reference.busy}
        onPress={() => {
          void reference.reconnect();
        }}
      />
      <ErrorMessage message={reference.error} />
    </View>
  );
}

export function ReferenceQuickOpen({ item, onDetails }: { item: Item; onDetails: () => void }) {
  const reference = useDeviceReference(item);
  return (
    <View style={styles.quick}>
      <Button
        title={reference.canOpen ? reference.openTitle : 'Reconnect file'}
        icon={reference.canOpen ? 'external-link' : 'link'}
        variant="ghost"
        disabled={reference.loading || reference.busy}
        onPress={() => {
          if (reference.canOpen) void reference.open();
          else onDetails();
        }}
      />
      {reference.error && (
        <>
          <ErrorMessage message={reference.error} />
          <Button title="File details / reconnect" variant="ghost" onPress={onDetails} />
        </>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  content: { gap: 12 },
  quick: { paddingHorizontal: 12, paddingBottom: 8, gap: 8 },
  caption: { fontSize: 13, lineHeight: 21, color: colors.muted },
});
