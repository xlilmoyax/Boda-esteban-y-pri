import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Lock } from 'lucide-react';
import { authenticateAdmin } from '../lib/data-service';
import { getGoogleClientId, isAppsScriptConfigured } from '../lib/apps-script-client';
import type { AdminProfile } from '../types';

interface AdminLoginViewProps {
  onNavigate: (path: string) => void;
  onAuthenticated: (profile: AdminProfile) => void;
  sessionError?: string | null;
}

export default function AdminLoginView({ onNavigate, onAuthenticated, sessionError }: AdminLoginViewProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isAppsScriptConfigured || !buttonRef.current) return;
    let active = true;
    const renderGoogleButton = () => {
      if (!active || !buttonRef.current || !window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: getGoogleClientId(),
        callback: async ({ credential }) => {
          if (!active || !credential) {
            setError('Google no devolvió una credencial válida.');
            return;
          }
          setError(null);
          setSubmitting(true);
          try {
            const profile = await authenticateAdmin(credential);
            onAuthenticated(profile);
          } catch (authError) {
            setError(authError instanceof Error ? authError.message : 'No se pudo validar la cuenta Google.');
          } finally {
            if (active) setSubmitting(false);
          }
        },
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        width: 360,
      });
    };

    if (window.google?.accounts?.id) {
      renderGoogleButton();
    } else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = renderGoogleButton;
      script.onerror = () => setError('No se pudo cargar el inicio de sesión de Google.');
      document.head.appendChild(script);
    }
    return () => { active = false; };
  }, [onAuthenticated]);

  return (
    <section className="wedding-login min-h-[calc(100svh-76px)] flex items-center justify-center px-5 py-12">
      <div className="max-w-md w-full">
        <div className="text-center mb-7">
          <div className="wedding-login__mark w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg">
            <Lock className="w-5 h-5 text-amber-100" />
          </div>
          <span className="wedding-eyebrow wedding-eyebrow--light">ESTEBAN &amp; PRISCILA</span>
          <h2 className="text-4xl font-serif font-medium text-white mt-2 mb-2">Panel de administración</h2>
          <p className="text-sm text-white/75">Iniciá sesión con una cuenta Google autorizada.</p>
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
            {isAppsScriptConfigured
              ? <div ref={buttonRef} className={submitting ? 'pointer-events-none opacity-60' : 'flex justify-center'} />
              : <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                  Configurá la URL de Apps Script y el ID de cliente OAuth para habilitar el acceso.
                </p>}
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
