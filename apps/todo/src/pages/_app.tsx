import {
  SpaceContext,
  useCurrentSpace,
  useCurrentUser,
  UserContext,
} from '@erikdakoda/auth-ui/context';
import AuthGuard from '@erikdakoda/auth-ui/components/AuthGuard';
import { SessionProvider } from 'next-auth/react';
import type { AppProps } from 'next/app';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { QuerySettingsProvider } from '@zenstackhq/tanstack-query/react';
import { Analytics } from '@vercel/analytics/react';
import '../tailwind/styles.css';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';

function AppContent(props: { children: JSX.Element | JSX.Element[] }) {
  const currentUser = useCurrentUser();
  const space = useCurrentSpace();

  return (
    <AuthGuard>
      <UserContext.Provider value={currentUser}>
        <SpaceContext.Provider value={space}>
          <div className="h-screen flex flex-col">{props.children}</div>
        </SpaceContext.Provider>
      </UserContext.Provider>
    </AuthGuard>
  );
}

function MyApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  const queryClient = new QueryClient({
    queryCache: new QueryCache(),
    mutationCache: new MutationCache(),
  });

  return (
    <>
      <SessionProvider session={session}>
        <QueryClientProvider client={queryClient}>
          <QuerySettingsProvider value={{ endpoint: '/api/model' }}>
            <AppContent>
              <div className="flex-grow h-100 bg-white">
                <Component {...pageProps} />
                <ToastContainer position="top-center" autoClose={2000} hideProgressBar={true} />
              </div>
            </AppContent>
          </QuerySettingsProvider>
        </QueryClientProvider>
      </SessionProvider>
      <Analytics />
    </>
  );
}

export default MyApp;
