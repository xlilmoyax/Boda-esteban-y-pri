import { useState, useEffect } from 'react';
import Header from './components/Header';
import HomeView from './components/HomeView';
import ConfirmacionView from './components/ConfirmacionView';
import AdminLoginView from './components/AdminLoginView';
import AdminDashboardView from './components/AdminDashboardView';
import GuestDetail from './components/admin/GuestDetail';
import NotFoundView from './components/NotFoundView';
import { WeddingMusicProvider } from './components/WeddingMusic';
import { supabase, isSupabaseConfigured } from './lib/supabaseClient';

type Route =
  | 'home'
  | 'confirmacion'
  | 'login-admin'
  | 'dashboard-admin'
  | 'guest-detail'
  | 'not-found';

const ROUTES: Record<string, Route> = {
  '/': 'home',
  '/confirmacion': 'confirmacion',
  '/login-admin': 'login-admin',
  '/dashboard-admin': 'dashboard-admin',
};

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<Route>('home');
  const [guestDetailId, setGuestDetailId] = useState<string | null>(null);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);

  useEffect(() => {
    const onLocationChange = () => {
      const path = window.location.pathname;
      if (path === '/dashboard-admin') {
        setCurrentRoute('dashboard-admin');
        setGuestDetailId(null);
      } else if (path.startsWith('/dashboard-admin/guest/')) {
        const id = path.split('/').pop() ?? null;
        setCurrentRoute('guest-detail');
        setGuestDetailId(id);
      } else {
        setCurrentRoute(ROUTES[path] ?? 'not-found');
        setGuestDetailId(null);
      }
    };
    window.addEventListener('popstate', onLocationChange);
    onLocationChange();
    return () => window.removeEventListener('popstate', onLocationChange);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase!.auth.getSession().then(({ data }) => {
      setIsAdminLoggedIn(Boolean(data.session));
      setCurrentAdminId(data.session?.user.id ?? null);
    });
    const { data: listener } = supabase!.auth.onAuthStateChange((_event, session) => {
      setIsAdminLoggedIn(Boolean(session));
      setCurrentAdminId(session?.user.id ?? null);
      const path = window.location.pathname;
      if (
        !session &&
        (path === '/dashboard-admin' || path.startsWith('/dashboard-admin/guest/'))
      ) {
        setCurrentRoute('login-admin');
        window.history.pushState(null, '', '/login-admin');
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const navigateTo = (path: string) => {
    window.history.pushState(null, '', path);
    if (path === '/dashboard-admin') {
      setCurrentRoute('dashboard-admin');
      setGuestDetailId(null);
    } else if (path.startsWith('/dashboard-admin/guest/')) {
      const id = path.split('/').pop() ?? null;
      setCurrentRoute('guest-detail');
      setGuestDetailId(id);
    } else {
      setCurrentRoute(ROUTES[path] ?? 'not-found');
      setGuestDetailId(null);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigate = (path: string) => {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    if (normalizedPath === '/dashboard-admin' && !isAdminLoggedIn) {
      navigateTo('/login-admin');
    } else {
      navigateTo(normalizedPath);
    }
  };

  return (
    <WeddingMusicProvider>
      <div className="min-h-screen bg-[#F3F0EB] text-[#211916]">
        {currentRoute !== 'home' && (
          <Header currentRoute={currentRoute} onNavigate={handleNavigate} isAdminLoggedIn={isAdminLoggedIn} />
        )}
        <main className="flex-grow">
          <div hidden={currentRoute !== 'home'}>
            <HomeView onNavigate={handleNavigate} />
          </div>
          {currentRoute === 'confirmacion' && <ConfirmacionView onNavigate={handleNavigate} />}
          {currentRoute === 'login-admin' && <AdminLoginView onNavigate={handleNavigate} />}
          {currentRoute === 'dashboard-admin' && (
            <AdminDashboardView onNavigate={handleNavigate} currentAdminId={currentAdminId} />
          )}
          {currentRoute === 'guest-detail' && guestDetailId && (
            <GuestDetail
              guestId={guestDetailId}
              currentAdminId={currentAdminId}
              onBack={() => navigateTo('/dashboard-admin')}
            />
          )}
          {currentRoute === 'not-found' && <NotFoundView onNavigate={handleNavigate} />}
        </main>
      </div>
    </WeddingMusicProvider>
  );
}
