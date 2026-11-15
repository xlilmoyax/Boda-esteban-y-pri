/**
 * Historial de auditoría: operaciones administrativas registradas.
 */

import { useState, useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';
import { getAuditLogs } from '../../lib/data-service';
import type { AuditLog } from '../../types';

export default function AuditLogView() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await getAuditLogs(100);
      setLogs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar auditoría');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const actionLabel = (a: string) => {
    const labels: { [key: string]: string } = {
      create_registration: 'Alta de familia',
      update_registration_details: 'Edición de familia y RSVP',
      update_rsvp_status: 'Cambio de confirmación',
      soft_delete_registration: 'Baja de familia',
      restore_registration: 'Restauración de familia',
      soft_delete_attendee: 'Baja de asistente',
      restore_attendee: 'Restauración de asistente',
      update_attendee: 'Edición de asistente',
      update_registration_rsvp_details: 'Edición de datos RSVP',
      update_event_public_config: 'Cambio de información del evento',
      activate_pricing_version: 'Activación de tarifas',
      save_invitation_draft: 'Guardado de borrador',
      publish_invitation_revision: 'Publicación de invitación',
      restore_invitation_revision: 'Restauración de revisión',
      set_admin_role: 'Cambio de rol administrativo',
      set_admin_active: 'Cambio de estado administrativo',
    };
    return labels[a] || a;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-[#4A071D]/20 border-t-[#4A071D] rounded-full animate-spin"></div>
        <p className="mt-4 text-[#211916]">Cargando historial...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-5 h-5 text-[#4A071D]" />
        <h2 className="font-serif text-xl font-bold text-[#24130E]">Historial de Auditoría</h2>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#4A071D]/20 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#4A071D]/10">
                <th className="px-4 py-3 text-xs font-semibold text-[#211916] uppercase tracking-wider">Fecha</th>
                <th className="px-4 py-3 text-xs font-semibold text-[#211916] uppercase tracking-wider">Acción</th>
                <th className="px-4 py-3 text-xs font-semibold text-[#211916] uppercase tracking-wider">Entidad</th>
                <th className="px-4 py-3 text-xs font-semibold text-[#211916] uppercase tracking-wider">Registro</th>
                <th className="px-4 py-3 text-xs font-semibold text-[#211916] uppercase tracking-wider">Actor</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-[#4A071D]/5 hover:bg-[#F3F0EB]/30 transition-colors">
                  <td className="px-4 py-3 text-[#211916]/60 text-sm">
                    {log.created_at.slice(0, 16).replace('T', ' ')}
                  </td>
                  <td className="px-4 py-3 text-[#24130E] text-sm font-medium">{actionLabel(log.action)}</td>
                  <td className="px-4 py-3 text-[#211916] text-sm">{log.entity_type}</td>
                  <td className="px-4 py-3 text-[#211916] text-sm">{log.record_id || log.entity_key || '—'}</td>
                  <td className="px-4 py-3 text-[#211916] text-sm">{log.actor_type}{log.actor_id ? ` · ${log.actor_id}` : ''}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[#211916]/40">
                    No hay operaciones registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-[#211916]/40">
        Las operaciones importantes se registran en la base de datos junto con cada cambio; la interfaz no puede insertar ni modificar registros de auditoría.
      </div>
    </div>
  );
}
