import { useState } from 'react';
import { Menu, X, Phone, Mail, MapPin, Calendar, Heart } from 'lucide-react';

interface HeaderProps {
  currentRoute: string;
  onNavigate: (path: string) => void;
}

export default function Header({ currentRoute, onNavigate }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { path: '/', label: 'Inicio' },
    { path: '/confirmacion', label: 'Confirmar asistencia' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-zinc-200">
      <div className="flex items-center justify-between px-4 py-4 md:px-8">
        <div
          onClick={() => onNavigate('/')}
          className="flex items-center gap-2 cursor-pointer"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onNavigate('/')}
        >
          <div className="w-8 h-8 rounded-full bg-amber-900 flex items-center justify-center">
            <Heart className="w-5 h-5 text-white" />
          </div>
          <span className="font-serif text-2xl font-bold text-amber-900 tracking-tight">
            Esteban y Priscila
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => onNavigate(item.path)}
              className={`text-sm font-medium transition-colors ${
                currentRoute === item.path.replace('/', '') || (item.path === '/' && currentRoute === 'home')
                  ? 'text-amber-900'
                  : 'text-zinc-600 hover:text-amber-900'
              }`}
            >
              {item.label}
            </button>
          ))}
          <button onClick={() => onNavigate('/login-admin')} className="text-sm font-medium text-zinc-600 hover:text-amber-900">
            Admin
          </button>
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('/confirmacion')}
            className="hidden sm:flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-amber-900 rounded-full hover:bg-amber-800 transition-colors"
          >
            <Calendar className="w-4 h-4" /> Confirmar asistencia
          </button>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-2 text-zinc-600 hover:text-amber-900"
            aria-label="Abrir menú"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-black/60" onClick={() => setMobileMenuOpen(false)}></div>
        )}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex flex-col w-full sm:w-80 bg-white border border-zinc-200 shadow-xl">
            <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center">
              <span className="font-serif text-xl font-bold text-amber-900">Menú</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-zinc-600 hover:text-zinc-900"
                aria-label="Cerrar menú"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <nav className="flex-1 py-6 overflow-y-auto">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => { onNavigate(item.path); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-6 py-4 text-left text-sm font-medium border-b border-zinc-100 hover:bg-amber-50"
                >
                  {item.label}
                </button>
              ))}
              <button
                onClick={() => { onNavigate('/login-admin'); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-6 py-4 text-left text-sm font-medium border-b border-zinc-100 hover:bg-amber-50 text-zinc-600"
              >
                Panel de administración
              </button>
            </nav>
            <div className="p-6 border-t border-zinc-100">
              <div className="flex items-center gap-3 mb-4">
                <Phone className="w-5 h-5 text-amber-900" />
                <span className="text-sm">+54 9 XXX XXX-XXXX</span>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <Mail className="w-5 h-5 text-amber-900" />
                <span className="text-sm">esteban.y.priscila@email.com</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-amber-900" />
                <span className="text-sm">Lugar del evento — dirección por confirmar</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
