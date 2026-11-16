import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Brand } from '../../components/Brand';
import { Button } from '../../components/Button';
import { Field } from '../../components/Field';
import { ErrorMessage } from '../../components/Feedback';
import { Icon } from '../../components/Icon';
import { colors } from '../../theme/tokens';
import { errorMessage } from '../../lib/errors';
import { useSession } from './SessionProvider';
import { useEmailAuth } from './useEmailAuth';

export function SignInScreen() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const { startPreview } = useSession();
  const auth = useEmailAuth();
  const error = auth.verify.error ?? auth.send.error;
  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Brand />
            <View style={styles.hero}>
              <View style={styles.heroIcon}>
                <Icon name={auth.sentTo ? 'mail' : 'layers'} color={colors.sage} size={32} />
              </View>
              <Text style={styles.eyebrow}>A LITTLE ORDER. A LITTLE MORE SPACE.</Text>
              <Text accessibilityRole="header" style={styles.title}>
                {auth.sentTo ? 'Check your inbox.' : 'Everything worth\nkeeping, together.'}
              </Text>
              <Text style={styles.description}>
                {auth.sentTo
                  ? `We sent a six-digit code to ${auth.sentTo}. Enter it below to make yourself at home.`
                  : 'Your notes, files, and ideas. Beautifully organized. Effortlessly found.'}
              </Text>
            </View>
            <View style={styles.form}>
              {auth.sentTo ? (
                <Field
                  label="Your sign-in code"
                  value={code}
                  onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  onSubmitEditing={() => auth.verify.mutate(code)}
                />
              ) : (
                <Field
                  label="Email address"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  autoComplete="email"
                  textContentType="emailAddress"
                  placeholder="you@example.com"
                  onSubmitEditing={() => auth.send.mutate(email)}
                />
              )}
              <ErrorMessage message={error ? errorMessage(error) : null} />
              <Button
                title={auth.sentTo ? 'Open my library' : 'Continue with email'}
                icon="arrow-right"
                onPress={() => (auth.sentTo ? auth.verify.mutate(code) : auth.send.mutate(email))}
                busy={auth.send.isPending || auth.verify.isPending}
              />
              {auth.sentTo ? (
                <View style={{ gap: 4 }}>
                  <Button
                    title={auth.seconds ? `Resend code in ${auth.seconds}s` : 'Resend code'}
                    variant="ghost"
                    disabled={auth.seconds > 0 || auth.send.isPending}
                    onPress={() => auth.send.mutate(auth.sentTo!)}
                  />
                  <Button
                    title="Use a different email"
                    variant="ghost"
                    onPress={() => {
                      auth.reset();
                      setCode('');
                    }}
                  />
                </View>
              ) : (
                <Text style={styles.hint}>No passwords to remember. Just a secure email code.</Text>
              )}
            </View>
            <View style={styles.preview}>
              <Button
                title="Explore a sample library"
                variant="ghost"
                icon="compass"
                onPress={startPreview}
              />
              <Text style={styles.previewText}>Take a look around before making it yours.</Text>
            </View>
          </View>
          <Text style={styles.footer}>A calmer home for your digital life.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  page: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    paddingVertical: 40,
  },
  card: { width: '100%', maxWidth: 450 },
  hero: { paddingTop: 44, paddingBottom: 30, gap: 18 },
  heroIcon: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.sageLight,
    borderRadius: 24,
    transform: [{ rotate: '-5deg' }],
  },
  eyebrow: { fontSize: 9, letterSpacing: 2, color: colors.sage, fontWeight: '700' },
  title: {
    fontSize: 39,
    lineHeight: 46,
    fontWeight: '600',
    letterSpacing: -1.7,
    color: colors.ink,
  },
  description: { color: colors.muted, lineHeight: 24, fontSize: 16 },
  form: { gap: 18 },
  hint: { textAlign: 'center', fontSize: 12, color: colors.muted },
  preview: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    marginTop: 32,
    paddingTop: 18,
    gap: 2,
  },
  previewText: { fontSize: 12, color: colors.muted, textAlign: 'center' },
  footer: { marginTop: 40, fontSize: 12, color: colors.muted },
});
