import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Session, User } from '@organize/contracts';
import { createApi, type OrganizeApi } from '../../lib/api';
import { sessionStorage } from '../../lib/session-storage';
import { createDemoApi } from '../preview/demo-api';

type SessionContextValue = {
  user: User | null;
  api: OrganizeApi;
  loading: boolean;
  preview: boolean;
  accept: (session: Session) => Promise<void>;
  startPreview: () => void;
  signOut: () => Promise<void>;
};
const SessionContext = createContext<SessionContextValue | null>(null);
export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [demoApi, setDemoApi] = useState<OrganizeApi | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    void sessionStorage
      .read()
      .then((saved) => {
        if (active) setSession(saved);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  const clear = useCallback(() => {
    setSession(null);
    setDemoApi(null);
    queryClient.clear();
    void sessionStorage.write(null).catch(() => {});
  }, [queryClient]);
  const api = useMemo(
    () => demoApi ?? createApi(session?.token, clear),
    [demoApi, session?.token, clear],
  );
  const value = useMemo<SessionContextValue>(
    () => ({
      user: demoApi
        ? { id: '00000000-0000-4000-8000-000000000001', email: 'preview@organize.local' }
        : (session?.user ?? null),
      api,
      loading,
      preview: demoApi !== null,
      async accept(next) {
        await sessionStorage.write(next);
        queryClient.clear();
        setDemoApi(null);
        setSession(next);
      },
      startPreview() {
        queryClient.clear();
        setDemoApi(createDemoApi());
      },
      async signOut() {
        if (!demoApi) await api.signOut();
        clear();
      },
    }),
    [api, session, demoApi, loading, clear, queryClient],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('SessionProvider is missing');
  return context;
}
