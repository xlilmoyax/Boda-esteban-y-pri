import { useState } from 'react';
import { AlertTriangle, Lock } from 'lucide-react';
import { authenticateAdmin } from '../lib/data-service';
import type { AdminProfile } from '../types';

interface AdminLoginViewProps {
  onNavigate: (path: string) => void;
  onAuthenticated: (profile: AdminProfile) => void;
  sessionError?: string | null;
}

export default function AdminLoginView({ onNavigate, onAuthenticated, sessionError }: AdminLoginViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const profile = await authenticateAdmin(email, password);
      onAuthenticated(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de autenticación.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="wedding-login min-h-[calc(100svh-76px)] flex items-center justify-center px-5 py-12">
      <div className="max-w-md w-full">
        <div className="text-center mb-7">
          <div className="wedding-login__mark w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg">
            <Lock className="w-5 h-5 text-amber-100" />
          </div>
          <span className="wedding-eyebrow wedding-eyebrow--light">ESTEBAN & PRISCILA</span>
          <h2 className="text-4xl font-serif font-medium text-white mt-2 mb-2">Panel de administración</h2>
          <p className="text-sm text-white/90">Acceso exclusivo para administradores autorizados del evento.</p>
        </div>

        <div className="wedding-login__card p-6 sm:p-8 rounded-2xl">
          <form onSubmit={submit} className="space-y-5">
            {error && (
              <div role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}
            {sessionError && !error && (
              <div role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {sessionError}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-[#241714] mb-1.5">Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="wedding-login__input w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#4A071D] focus:border-[#4A071D] outline-none placeholder:text-[#241714]/50"
                disabled={submitting}
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#241714] mb-1.5">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Contraseña"
                  className="wedding-login__input w-full px-4 py-2.5 pr-11 border rounded-lg focus:ring-2 focus:ring-[#4A071D] focus:border-[#4A071D] outline-none placeholder:text-[#241714]/50"
                  disabled={submitting}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#241714]/60 hover:text-[#241714] transition-colors"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !email || !password}
              className="w-full py-2.5 bg-[#4A071D] text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#310b13] transition-colors"
            >
              {submitting ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-white/80">
          Acceso exclusivo para administradores autorizados del evento.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('/')}
          className="block mx-auto mt-4 text-xs text-white/90 hover:text-white underline underline-offset-4 transition-colors"
        >
          Volver a la invitación
        </button>
      </div>
    </section>
  );
}