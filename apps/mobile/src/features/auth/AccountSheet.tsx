import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Sheet } from '../../components/Sheet';
import { Button } from '../../components/Button';
import { ErrorMessage } from '../../components/Feedback';
import { colors } from '../../theme/tokens';
import { errorMessage } from '../../lib/errors';
import { useSession } from './SessionProvider';

export function AccountSheet({ onClose, onTrash }: { onClose: () => void; onTrash: () => void }) {
  const { user, preview, signOut } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const leave = async () => {
    setBusy(true);
    setError(null);
    try {
      await signOut();
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet title="Your personal space" onClose={onClose}>
      <View style={styles.panel}>
        <Text style={styles.label}>{preview ? 'SAMPLE WORKSPACE' : 'SIGNED IN AS'}</Text>
        <Text style={styles.email}>{preview ? 'Just looking around' : user?.email}</Text>
        <Text style={styles.text}>
          {preview
            ? 'Sample changes last until you leave this preview. Sign in to save your own notes and files.'
            : 'Your library belongs to you. Notes, files, and folders are private to your account.'}
        </Text>
      </View>
      <Button
        title="Open Trash"
        icon="trash-2"
        variant="secondary"
        onPress={() => {
          onTrash();
          onClose();
        }}
      />
      <ErrorMessage message={error} />
      <Button
        title={preview ? 'Leave preview / sign in' : 'Sign out'}
        icon="log-out"
        variant="ghost"
        busy={busy}
        onPress={() => {
          void leave();
        }}
      />
      <Text style={styles.footer}>Organize · A calmer home for your digital life</Text>
    </Sheet>
  );
}
const styles = StyleSheet.create({
  panel: { padding: 22, borderRadius: 16, backgroundColor: colors.sageLight, gap: 12 },
  label: { color: colors.sage, fontSize: 10, letterSpacing: 1.6, fontWeight: '600' },
  email: { color: colors.ink, fontSize: 18, fontWeight: '600' },
  text: { color: colors.muted, lineHeight: 22, fontSize: 14 },
  footer: { textAlign: 'center', fontSize: 10, color: colors.muted },
});
