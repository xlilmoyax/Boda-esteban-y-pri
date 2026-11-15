import { useEffect, useState } from 'react';
import { RotateCcw, Shield, UserPlus } from 'lucide-react';
import { getAdminProfiles, setAdminActive, setAdminRole } from '../../lib/data-service';
import type { AdminProfile } from '../../types';

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
}

export default function AdminProfilesView() {
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState<'owner' | 'editor'>('editor');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setProfiles(await getAdminProfiles());
    } catch (loadError: unknown) {
      setError(messageOf(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const assignRole = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await setAdminRole(userId.trim(), role);
      setUserId('');
      await load();
      setNotice('El rol se actualizó. Solo se aceptan las cuentas autorizadas por la política del servidor.');
    } catch (saveError: unknown) {
      setError(messageOf(saveError));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (profile: AdminProfile) => {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await setAdminActive(profile.id, !profile.active);
      await load();
    } catch (saveError: unknown) {
      setError(messageOf(saveError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-5">
      <header className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-[#4A071D]" />
        <div>
          <h2 className="font-serif text-xl font-bold text-[#24130E]">Perfiles administrativos</h2>
          <p className="text-sm text-[#211916]/60">No se crean usuarios ni contraseñas desde esta pantalla.</p>
        </div>
      </header>
      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p>}

      <form onSubmit={assignRole} className="grid gap-3 rounded-2xl border border-[#4A071D]/20 bg-white p-5 sm:grid-cols-[1fr_auto_auto]">
        <label className="text-sm font-medium">
          Correo autorizado
          <input required value={userId} onChange={(event) => setUserId(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 font-mono" />
        </label>
        <label className="text-sm font-medium">
          Rol
          <select value={role} onChange={(event) => setRole(event.target.value as 'owner' | 'editor')} className="mt-1 w-full rounded-lg border px-3 py-2">
            <option value="editor">Editor</option>
            <option value="owner">Owner</option>
          </select>
        </label>
        <button disabled={saving} className="mt-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[#4A071D] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          <UserPlus className="h-4 w-4" /> Asignar rol
        </button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-[#4A071D]/20 bg-white">
        {loading ? (
          <p role="status" className="p-6">Cargando perfiles…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="border-b">
                <th className="px-4 py-3 text-xs uppercase">Cuenta</th>
                <th className="px-4 py-3 text-xs uppercase">Identificador</th>
                <th className="px-4 py-3 text-xs uppercase">Rol</th>
                <th className="px-4 py-3 text-xs uppercase">Estado</th>
                <th className="px-4 py-3 text-xs uppercase">Acción</th>
              </tr></thead>
              <tbody>
                {profiles.map((profile) => (
                  <tr key={profile.id} className="border-b border-[#4A071D]/5">
                    <td className="px-4 py-3">{profile.email}</td>
                    <td className="px-4 py-3 font-mono text-xs">{profile.id}</td>
                    <td className="px-4 py-3">{profile.role}</td>
                    <td className="px-4 py-3">{profile.active ? 'Activo' : 'Desactivado'}</td>
                    <td className="px-4 py-3">
                      <button
                        disabled={saving}
                        onClick={() => void toggleActive(profile)}
                        className="inline-flex items-center gap-1 text-sm font-medium text-[#4A071D] disabled:opacity-50"
                      >
                        <RotateCcw className="h-4 w-4" />
                        {profile.active ? 'Desactivar' : 'Reactivar'}
                      </button>
                    </td>
                  </tr>
                ))}
                {profiles.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-sm text-[#211916]/60">Todavía no hay perfiles; el primer owner se configura manualmente.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
