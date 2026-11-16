import { Pressable, Text, View } from 'react-native';
import { Brand } from '../../components/Brand';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { colors } from '../../theme/tokens';
import type { LibraryController } from './useLibraryController';
import { styles } from './library.styles';
export function LibraryHeader({ controller }: { controller: LibraryController }) {
  const { desktop, preview, heading, description, view, actions, upload, setEditor, setAccount } =
    controller;
  return (
    <>
      {' '}
      <View style={styles.topbar}>
        {desktop ? (
          <View style={styles.breadcrumb}>
            <Icon name="home" size={13} color={colors.muted} />
            <Text style={styles.breadcrumbText}>My workspace</Text>
            <Icon name="chevron-right" size={12} color="#B4BCAD" />
            <Text style={[styles.breadcrumbText, { color: colors.sage }]}>Library</Text>
          </View>
        ) : (
          <Brand />
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open account"
          onPress={() => setAccount(true)}
          style={styles.avatar}
        >
          <Icon name="user" size={18} color={colors.sage} />
        </Pressable>
      </View>
      {preview && (
        <View style={styles.preview}>
          <Icon name="compass" size={15} color={colors.sage} />
          <Text style={styles.previewText}>Sample workspace · changes stay in this preview</Text>
          <Pressable accessibilityRole="button" onPress={() => setAccount(true)}>
            <Text style={styles.previewLink}>Sign in</Text>
          </Pressable>
        </View>
      )}
      <View
        style={[styles.heading, !desktop && { flexDirection: 'column', alignItems: 'stretch' }]}
      >
        <View style={{ flex: 1, gap: 8 }}>
          <Text style={styles.eyebrow}>A SPACE FOR WHAT MATTERS</Text>
          <Text accessibilityRole="header" style={styles.title}>
            {heading}
            <Text style={{ color: colors.orange }}>.</Text>
          </Text>
          <Text style={styles.subtitle}>{description}</Text>
        </View>
        {view !== 'trash' && (
          <View style={styles.addButtons}>
            <Button
              title="Upload"
              icon="upload"
              variant="secondary"
              disabled={actions.upload.isPending}
              onPress={() => {
                void upload();
              }}
            />
            <Button title="New note" icon="plus" onPress={() => setEditor({})} />
          </View>
        )}
      </View>
    </>
  );
}
