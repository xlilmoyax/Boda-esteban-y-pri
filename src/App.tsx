import { useState, useEffect } from 'react';
import Header from './components/Header';
import HomeView from './components/HomeView';
import ConfirmacionView from './components/ConfirmacionView';
import AdminLoginView from './components/AdminLoginView';
import AdminDashboardView from './components/AdminDashboardView';
import NotFoundView from './components/NotFoundView';

type Route =
  | 'home'
  | 'confirmacion'
  | 'login-admin'
  | 'dashboard-admin'
  | 'not-found';

const ROUTES: Record<string, Route> = {
  '/': 'home',
  '/confirmacion': 'confirmacion',
  '/login-admin': 'login-admin',
  '/dashboard-admin': 'dashboard-admin',
};

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<Route>('home');

  useEffect(() => {
    const onLocationChange = () => {
      const route = ROUTES[window.location.pathname] ?? 'not-found';
      setCurrentRoute(route);
    };
    window.addEventListener('popstate', onLocationChange);
    onLocationChange();
    return () => window.removeEventListener('popstate', onLocationChange);
  }, []);

  const navigateTo = (path: string) => {
    window.history.pushState(null, '', path);
    setCurrentRoute(ROUTES[path] ?? 'not-found');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <Header currentRoute={currentRoute} onNavigate={navigateTo} />
      <main className="flex-grow">
        {currentRoute === 'home' && <HomeView onNavigate={navigateTo} />}
        {currentRoute === 'confirmacion' && <ConfirmacionView onNavigate={navigateTo} />}
        {currentRoute === 'login-admin' && <AdminLoginView onNavigate={navigateTo} />}
        {currentRoute === 'dashboard-admin' && <AdminDashboardView onNavigate={navigateTo} />}
        {currentRoute === 'not-found' && <NotFoundView onNavigate={navigateTo} />}
      </main>
    </div>
  );
}
