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
          <span className="wedding-eyebrow wedding-eyebrow--light">ESTEBAN &amp; PRISCILA</span>
          <h2 className="text-4xl font-serif font-medium text-white mt-2 mb-2">Panel de administración</h2>
          <p className="text-sm text-white/75">Acceso exclusivo para administradores autorizados del evento.</p>
        </div>

        <div className="wedding-login__card p-6 sm:p-8 rounded-2xl">
          <div className="space-y-5">
            {error && (
              <div role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> {error}
              </div>
            )}
            {sessionError && !error && (
              <div role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> {sessionError}
              </div>
            )}
            <label className="block text-sm font-medium text-white mb-1">Correo electrónico</label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-[#4A071D] focus:border-[#4A071D] outline-none text-white placeholder-white/50"
                disabled={submitting}
              />
            </div>
            <label className="block text-sm font-medium text-white mb-1 mt-3">Contraseña</label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-[#4A071D] focus:border-[#4A071D] outline-none text-white placeholder-white/50"
                disabled={submitting}
              />
            </div>
            <button
              type="button"
              onClick={submit}
              disabled={submitting || !email || !password}
              className="w-full py-2.5 bg-[#4A071D] text-white rounded-lg font-semibold disabled:opacity-60 transition-colors"
            >
              {submitting ? 'Ingresando...' : 'Ingresar'}
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-white/70">
          Acceso exclusivo para administradores autorizados del evento.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('/')}
          className="block mx-auto mt-4 text-xs text-white/80 hover:text-white underline underline-offset-4"
        >
          Volver a la invitación
        </button>
      </div>
    </section>
  );
}
