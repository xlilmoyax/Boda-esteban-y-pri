import { useState } from 'react';
import { Menu, X, Phone, Mail, MapPin, Calendar, Lock } from 'lucide-react';

interface HeaderProps {
  currentRoute: string;
  onNavigate: (path: string) => void;
  isAdminLoggedIn: boolean;
}

export default function Header({ currentRoute, onNavigate, isAdminLoggedIn }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { path: '/', label: 'Inicio' },
    { path: '/confirmacion', label: 'Confirmar asistencia' },
  ];

  const isHome = currentRoute === 'home';
  const isConfirm = currentRoute === 'confirmacion';

  return (
    <header className="sticky top-0 z-40 bg-[#F3F0EB]/95 backdrop-blur border-b border-[#4A071D]/10">
      <div className="flex items-center justify-between px-4 py-4 md:px-8">
        <div
          onClick={() => onNavigate('/')}
          className="flex items-center gap-2 cursor-pointer"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onNavigate('/')}
        >
          <div className="w-8 h-8 bg-[#B8860B] rounded-full flex items-center justify-center shadow-lg border-4 border-[#F3F0EB]">
            <div className="w-6 h-6 border-4 border-[#F3F0EB] rounded-full" />
          </div>
          <div className="flex flex-col">
            <span className="font-serif text-xl font-italic text-[#24130E] tracking-tight">Esteban</span>
            <span className="font-serif text-xl font-italic text-[#4A071D] tracking-tight">& Priscila</span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => onNavigate(item.path)}
              className={`text-sm font-medium transition-colors ${
                (item.path === '/' && isHome) || (item.path === '/confirmacion' && isConfirm)
                  ? 'text-[#4A071D]'
                  : 'text-[#211916]/60 hover:text-[#4A071D]'
              }`}
            >
              {item.label}
            </button>
          ))}
          {isAdminLoggedIn ? (
            <button
              onClick={() => onNavigate('/dashboard-admin')}
              className="text-sm font-medium text-[#4A071D] hover:text-[#672B32]"
            >
              Panel Admin <Lock className="w-3 h-3 ml-1" />
            </button>
          ) : (
            <button
              onClick={() => onNavigate('/login-admin')}
              className="text-sm font-medium text-[#211916]/60 hover:text-[#4A071D]"
            >
              Admin
            </button>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('/confirmacion')}
            className="hidden sm:flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#4A071D] rounded-full hover:bg-[#672B32] transition-colors"
          >
            <Calendar className="w-4 h-4" /> Confirmar asistencia
          </button>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-2 text-[#211916]/60 hover:text-[#4A071D]"
            aria-label="Abrir menú"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-[#24130E]/90" onClick={() => setMobileMenuOpen(false)}></div>
        )}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex flex-col w-full sm:w-80 bg-[#F3F0EB] border border-[#4A071D]/20 shadow-xl">
            <div className="px-6 py-4 border-b border-[#4A071D]/10 flex justify-between items-center">
              <span className="font-serif text-xl font-bold text-[#24130E]">Menú</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-[#211916]/60 hover:text-[#4A071D]"
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
                  className="w-full flex items-center gap-3 px-6 py-4 text-left text-sm font-medium border-b border-[#4A071D]/10 hover:bg-[#4A071D]/5"
                >
                  {item.label}
                </button>
              ))}
              <button
                onClick={() => {
                  onNavigate(isAdminLoggedIn ? '/dashboard-admin' : '/login-admin');
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-6 py-4 text-left text-sm font-medium border-b border-[#4A071D]/10 hover:bg-[#4A071D]/5 text-[#4A071D]"
              >
                {isAdminLoggedIn ? 'Panel de administración' : 'Iniciar sesión admin'}
              </button>
            </nav>
            <div className="p-6 border-t border-[#4A071D]/10">
              <div className="flex items-center gap-3 mb-4">
                <Phone className="w-5 h-5 text-[#4A071D]" />
                <span className="text-sm text-[#211916]">+54 9 XXX XXX-XXXX</span>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <Mail className="w-5 h-5 text-[#4A071D]" />
                <span className="text-sm text-[#211916]">esteban.y.priscila@email.com</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-[#4A071D]" />
                <span className="text-sm text-[#211916]">Santiago Derqui 703, Villa Allende</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
