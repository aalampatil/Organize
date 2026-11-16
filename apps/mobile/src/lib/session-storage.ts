import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { sessionSchema, type Session } from '@organize/contracts';

const key = 'organize.session';
export const sessionStorage = {
  async read(): Promise<Session | null> {
    const value =
      Platform.OS === 'web'
        ? globalThis.sessionStorage?.getItem(key)
        : await SecureStore.getItemAsync(key);
    if (!value) return null;
    try {
      const session = sessionSchema.parse(JSON.parse(value));
      return new Date(session.expiresAt).getTime() > Date.now() ? session : null;
    } catch {
      return null;
    }
  },
  async write(session: Session | null) {
    if (Platform.OS === 'web') {
      if (session) globalThis.sessionStorage.setItem(key, JSON.stringify(session));
      else globalThis.sessionStorage.removeItem(key);
    } else if (session) await SecureStore.setItemAsync(key, JSON.stringify(session));
    else await SecureStore.deleteItemAsync(key);
  },
};
