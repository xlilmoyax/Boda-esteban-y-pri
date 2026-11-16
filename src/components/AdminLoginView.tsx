import { useRef, useState } from 'react';
import { AlertTriangle, Lock } from 'lucide-react';
import { requestAdminAccess, verifyAdminAccess } from '../lib/data-service';
import type { AdminProfile } from '../types';

interface AdminLoginViewProps {
  onNavigate: (path: string) => void;
  onAuthenticated: (profile: AdminProfile) => void;
  sessionError?: string | null;
}

interface LoginState {
  step: 'email' | 'otp';
  email: string;
  code: string;
}

export default function AdminLoginView({ onNavigate, onAuthenticated, sessionError }: AdminLoginViewProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<LoginState>({ step: 'email', email: '', code: '' });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const sendCode = async () => {
    if (!state.email || !state.email.includes('@')) {
      setError('Ingresá un correo electrónico válido.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await requestAdminAccess(state.email);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el código de acceso.');
    } finally {
      setSubmitting(false);
    }
  };

  const verifyCode = async () => {
    if (!state.code || state.code.length < 4) {
      setError('Ingresá el código de verificación.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const profile = await verifyAdminAccess(state.email, state.code);
      onAuthenticated(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Código de verificación incorrecto o vencido.');
    } finally {
      setSubmitting(false);
    }
  };

  const resendCode = async () => {
    await sendCode();
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

            {state.step === 'email' ? (
              <>
                <label className="block text-sm font-medium text-white mb-1">Correo electrónico</label>
                <div className="relative">
                  <input
                    ref={inputRef}
                    type="email"
                    value={state.email}
                    onChange={(e) => setState((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="tu@email.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-[#4A071D] focus:border-[#4A071D] outline-none text-white placeholder-white/50"
                    disabled={submitting}
                  />
                </div>
                <button
                  onClick={sendCode}
                  disabled={submitting || !state.email || !state.email.includes('@')}
                  className="w-full py-2.5 bg-[#4A071D] text-white rounded-lg font-semibold disabled:opacity-60 transition-colors"
                >
                  {submitting ? 'Enviando código...' : 'Enviar código de acceso'}
                </button>
              </>
            ) : (
              <>
                <label className="block text-sm font-medium text-white mb-1">Código de acceso</label>
                <p className="text-sm text-white/70">Se envió un código a <span className="font-semibold text-white">{state.email}</span></p>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/70" />
                  <input
                    type="text"
                    value={state.code}
                    onChange={(e) => setState((prev) => ({ ...prev, code: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                    maxLength={6}
                    placeholder="Código de 6 dígitos"
                    className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-[#4A071D] focus:border-[#4A071D] outline-none text-white placeholder-white/50 tracking-widest text-center"
                    disabled={submitting}
                  />
                </div>
                <button
                  onClick={verifyCode}
                  disabled={submitting || !state.code || state.code.length < 4}
                  className="w-full py-2.5 bg-[#4A071D] text-white rounded-lg font-semibold disabled:opacity-60 transition-colors"
                >
                  {submitting ? 'Verificando...' : 'Verificar e ingresar'}
                </button>
                <button
                  onClick={resendCode}
                  disabled={submitting}
                  className="w-full py-2 text-xs text-white/60 bg-transparent border border-white/20 rounded-lg hover:border-white/40 transition-colors"
                >
                  ¿No recibiste el código? Reenviar
                </button>
              </>
            )}
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
