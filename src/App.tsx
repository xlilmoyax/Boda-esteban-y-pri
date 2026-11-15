import { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import HomeView from './components/HomeView';
import ConfirmacionView from './components/ConfirmacionView';
import AdminLoginView from './components/AdminLoginView';
import AdminDashboardView from './components/AdminDashboardView';
import GuestDetail from './components/admin/GuestDetail';
import NotFoundView from './components/NotFoundView';
import { getCurrentAdminProfile } from './lib/data-service';
import { supabase, isSupabaseConfigured } from './lib/data-service';
import type { AdminProfile } from './types';

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
  const [currentAdminRole, setCurrentAdminRole] = useState<AdminProfile['role'] | null>(null);
  const [adminSessionError, setAdminSessionError] = useState<string | null>(null);

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
    const path = window.location.pathname;
    const adminPath = path === '/dashboard-admin' || path.startsWith('/dashboard-admin/guest/');
    if (!isSupabaseConfigured) {
      if (adminPath) {
        setAdminSessionError('Supabase no está configurado; no se puede validar el acceso administrativo.');
        setCurrentRoute('login-admin');
        window.history.replaceState(null, '', '/login-admin');
      }
      return;
    }
    let active = true;
    const validateAdminSession = async () => {
      const { data: { session } } = await supabase!.auth.getSession();
      if (!session) {
        if (adminPath) {
          setAdminSessionError('Iniciá sesión con una cuenta autorizada para continuar.');
          setCurrentRoute('login-admin');
          window.history.replaceState(null, '', '/login-admin');
        }
        return;
      }
      try {
        const profile = await getCurrentAdminProfile();
        if (!active) return;
        setIsAdminLoggedIn(profile !== null);
        setCurrentAdminId(profile?.id ?? null);
        setCurrentAdminRole(profile?.role ?? null);
        setAdminSessionError(profile ? null : 'La sesión no tiene un perfil administrativo activo.');
        if (!profile && (
          window.location.pathname === '/dashboard-admin' ||
          window.location.pathname.startsWith('/dashboard-admin/guest/')
        )) {
          setCurrentRoute('login-admin');
          window.history.replaceState(null, '', '/login-admin');
        }
      } catch (error: unknown) {
        if (!active) return;
        setIsAdminLoggedIn(false);
        setCurrentAdminId(null);
        setCurrentAdminRole(null);
        setAdminSessionError(error instanceof Error ? error.message : 'No se pudo validar la sesión administrativa.');
        setCurrentRoute('login-admin');
        window.history.replaceState(null, '', '/login-admin');
      }
    };
    void validateAdminSession();
    return () => {
      active = false;
    };
  }, []);

  const navigateTo = useCallback((path: string) => {
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
  }, []);

  const handleNavigate = useCallback((path: string) => {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    if (
      (normalizedPath === '/dashboard-admin' || normalizedPath.startsWith('/dashboard-admin/guest/')) &&
      !isAdminLoggedIn
    ) {
      navigateTo('/login-admin');
    } else {
      navigateTo(normalizedPath);
    }
  }, [isAdminLoggedIn, navigateTo]);

  const handleAdminAuthenticated = useCallback((profile: AdminProfile) => {
    setIsAdminLoggedIn(true);
    setCurrentAdminId(profile.id);
    setCurrentAdminRole(profile.role);
    setAdminSessionError(null);
    navigateTo('/dashboard-admin');
  }, [navigateTo]);

  return (
    <div className="min-h-screen bg-[#F3F0EB] text-[#211916]">
      {currentRoute !== 'home' && (
        <Header currentRoute={currentRoute} onNavigate={handleNavigate} isAdminLoggedIn={isAdminLoggedIn} />
      )}
      <main className="flex-grow">
        <div hidden={currentRoute !== 'home'}>
          <HomeView onNavigate={handleNavigate} />
        </div>
        {currentRoute === 'confirmacion' && <ConfirmacionView onNavigate={handleNavigate} />}
        {currentRoute === 'login-admin' && (
          <AdminLoginView
            onNavigate={handleNavigate}
            onAuthenticated={handleAdminAuthenticated}
            sessionError={adminSessionError}
          />
        )}
        {currentRoute === 'dashboard-admin' && (
          <AdminDashboardView
            onNavigate={handleNavigate}
            currentAdminId={currentAdminId}
            currentAdminRole={currentAdminRole}
          />
        )}
        {currentRoute === 'guest-detail' && guestDetailId && (
          <GuestDetail
            guestId={guestDetailId}
            onBack={() => navigateTo('/dashboard-admin')}
          />
        )}
        {currentRoute === 'not-found' && <NotFoundView onNavigate={handleNavigate} />}
      </main>
    </div>
  );
}
