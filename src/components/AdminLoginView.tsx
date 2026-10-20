import { useState } from 'react';
import { AlertTriangle, Mail, Lock } from 'lucide-react';

interface AdminLoginViewProps {
  onNavigate: (path: string) => void;
}

export default function AdminLoginView({ onNavigate }: AdminLoginViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      // Intentar login real mediante Supabase Auth si está configurado
      const { supabase } = await import('../lib/supabaseClient');
      if (supabase) {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (authError) throw authError;
        // Redirigir al dashboard tras login exitoso
        onNavigate('/dashboard-admin');
        return;
      }

      // Fallback sin Supabase: solo modo desarrollo, sin credenciales hardcodeadas
      setError('Supabase no está configurado. No se puede iniciar sesión.');
    } catch (err) {
      setError('Credenciales inválidas o error de conexión.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="min-h-screen bg-zinc-50 flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-amber-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-zinc-900 mb-2">Panel de administración</h2>
          <p className="text-zinc-600">Iniciá sesión para gestionar la tarjeta de casamiento.</p>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                placeholder="admin@ejemplo.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                placeholder="••••••••"
              />
            </div>
            {error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> {error}
              </div>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full px-6 py-3 text-sm font-semibold text-white bg-amber-900 rounded-lg hover:bg-amber-800 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  Iniciando sesión...
                </span>
              ) : (
                <>
                  Iniciar sesión <Mail className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-500">
          Acceso exclusivo para administradores autorizados del evento.
        </p>
      </div>
    </section>
  );
}
