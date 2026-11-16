import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { SessionProvider, useSession } from './src/features/auth/SessionProvider';
import { SignInScreen } from './src/features/auth/SignInScreen';
import { LibraryScreen } from './src/features/library/LibraryScreen';
import { Loading } from './src/components/Feedback';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15_000, retry: 1 }, mutations: { retry: false } },
});
function Application() {
  const { user, loading } = useSession();
  if (loading) return <Loading label="Opening Organize…" />;
  return user ? <LibraryScreen /> : <SignInScreen />;
}
export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <StatusBar style="dark" />
          <Application />
        </SessionProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
