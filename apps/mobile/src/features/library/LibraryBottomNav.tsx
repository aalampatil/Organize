import { Pressable, Text, View } from 'react-native';
import { Icon, type IconName } from '../../components/Icon';
import { colors } from '../../theme/tokens';
import type { LibraryView } from './Sidebar';
import type { LibraryController } from './useLibraryController';
import { styles } from './library.styles';
export function LibraryBottomNav({ controller }: { controller: LibraryController }) {
  const { desktop, view, setAccount, changeView } = controller;
  return (
    <>
      {' '}
      {!desktop && (
        <View style={styles.bottomNav}>
          {(
            [
              { value: 'all', label: 'Library', icon: 'grid' },
              { value: 'folders', label: 'Folders', icon: 'folder' },
              { value: 'favorites', label: 'Favorites', icon: 'star' },
              { value: 'account', label: 'You', icon: 'user' },
            ] as { value: LibraryView | 'account'; label: string; icon: IconName }[]
          ).map((tab) => (
            <Pressable
              key={tab.value}
              accessibilityRole="button"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: view === tab.value }}
              onPress={() => (tab.value === 'account' ? setAccount(true) : changeView(tab.value))}
              style={styles.navItem}
            >
              <Icon
                name={tab.icon}
                size={19}
                color={view === tab.value ? colors.sage : colors.muted}
              />
              <Text style={[styles.navLabel, view === tab.value && { color: colors.sage }]}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </>
  );
}
