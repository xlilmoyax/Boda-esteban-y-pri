/**
 * Detalle de un invitado: muestra asistentes, pagos y permite editar.
 */

import { useState, useEffect } from 'react';
import { ArrowLeft, Users, Trash2, Plus } from 'lucide-react';
import { getGuestById, getAttendeesByGuest, createAttendee, updateAttendee, deleteAttendee, createAuditLog } from '../../lib/supabase';
import type { Attendee } from '../../types';

interface GuestDetailProps {
  guestId: string;
  currentAdminId: string | null;
  onBack: () => void;
}

export default function GuestDetail({ guestId, currentAdminId, onBack }: GuestDetailProps) {
  const [guest, setGuest] = useState<any>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAttendee, setNewAttendee] = useState({
    name: '',
    surname: '',
    age_at_event: null as number | null,
    after_lunch: false,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [guestId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [g, atts] = await Promise.all([
        getGuestById(guestId),
        getAttendeesByGuest(guestId),
      ]);
      setGuest(g);
      setAttendees(atts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar detalle');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAttendee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAttendee({
        guest_id: guestId,
        name: newAttendee.name,
        surname: newAttendee.surname,
        birth_date: null,
        age_at_event: newAttendee.age_at_event,
        after_lunch: newAttendee.after_lunch,
        price_applied: 0,
        category: null,
      });
      setShowAddForm(false);
      setNewAttendee({ name: '', surname: '', age_at_event: null, after_lunch: false });
      await loadData();
      if (currentAdminId) {
        await createAuditLog({
          admin_id: currentAdminId,
          action: 'create_attendee',
          table_name: 'attendees',
          record_id: '',
          old_values: null,
          new_values: JSON.stringify(newAttendee),
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agregar asistente');
    }
  };

  const handleUpdateAttendee = async (id: string, field: keyof Attendee, value: any) => {
    try {
      await updateAttendee(id, { [field]: value });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar asistente');
    }
  };

  const handleDeleteAttendee = async (id: string) => {
    if (!confirm('¿Eliminar este asistente?')) return;
    try {
      await deleteAttendee(id);
      await loadData();
      if (currentAdminId) {
        await createAuditLog({
          admin_id: currentAdminId,
          action: 'delete_attendee',
          table_name: 'attendees',
          record_id: id,
          old_values: null,
          new_values: null,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar asistente');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-[#4A071D]/20 border-t-[#4A071D] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!guest) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-xl font-serif font-bold text-[#24130E]">Invitado no encontrado</h2>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 text-sm font-semibold text-white bg-[#4A071D] rounded-lg hover:bg-[#672B32]"
        >
          Volver
        </button>
      </div>
    );
  }

  const totalPrice = attendees.reduce((sum, a) => sum + (a.price_applied ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ArrowLeft className="w-4 h-4" onClick={onBack} style={{ cursor: 'pointer' }} />
        <h2 className="font-serif text-xl font-bold text-[#24130E]">Detalle del Invitado</h2>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl border border-[#4A071D]/20 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="font-serif text-lg font-bold text-[#24130E]">
              {guest.name} {guest.surname}
            </h3>
            <p className="text-[#211916]/60 text-sm">
              {guest.email || 'Sin email'} • {guest.phone || 'Sin teléfono'}
            </p>
          </div>
          <div className="flex gap-2">
            <span
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                guest.attending === true
                  ? 'bg-[#4A071D]/10 text-[#4A071D] border border-[#4A071D]/20'
                  : guest.attending === false
                    ? 'bg-rose-50 text-rose-600 border border-rose-100'
                    : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
              }`}
            >
              {guest.attending === true ? 'Asistirá' : guest.attending === false ? 'No asistirá' : 'Pendiente'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-[#F3F0EB]/50 rounded-xl border border-[#4A071D]/10">
            <p className="text-xs text-[#211916]/50 uppercase tracking-wider">Total importe</p>
            <p className="text-xl font-serif font-bold text-[#4A071D]">${totalPrice.toLocaleString('es-AR')}</p>
          </div>
          <div className="p-4 bg-[#F3F0EB]/50 rounded-xl border border-[#4A071D]/10">
            <p className="text-xs text-[#211916]/50 uppercase tracking-wider">Asistentes</p>
            <p className="text-xl font-serif font-bold text-[#24130E]">{attendees.length}</p>
          </div>
          <div className="p-4 bg-[#F3F0EB]/50 rounded-xl border border-[#4A071D]/10">
            <p className="text-xs text-[#211916]/50 uppercase tracking-wider">Pagos</p>
            <p className="text-xl font-serif font-bold text-[#24130E]">
              {(guest.payment_records?.length ?? 0)} registro(s)
            </p>
          </div>
        </div>
      </div>

      {/* Asistentes */}
      <div className="bg-white p-6 rounded-2xl border border-[#4A071D]/20 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#4A071D]" />
            <h3 className="font-serif text-lg font-bold text-[#24130E]">Asistentes</h3>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-[#4A071D] rounded-lg hover:bg-[#672B32] transition-colors"
          >
            <Plus className="w-4 h-4" /> Agregar
          </button>
        </div>

        {showAddForm && (
          <div className="mb-6 p-4 bg-[#F3F0EB]/50 rounded-xl border border-[#4A071D]/10">
            <form onSubmit={handleAddAttendee} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input
                type="text"
                value={newAttendee.name}
                onChange={(e) => setNewAttendee({ ...newAttendee, name: e.target.value })}
                placeholder="Nombre"
                className="px-3 py-2 border border-[#672B32]/30 rounded-lg focus:ring-2 focus:ring-[#4A071D] outline-none text-sm"
              />
              <input
                type="text"
                value={newAttendee.surname}
                onChange={(e) => setNewAttendee({ ...newAttendee, surname: e.target.value })}
                placeholder="Apellido"
                className="px-3 py-2 border border-[#672B32]/30 rounded-lg focus:ring-2 focus:ring-[#4A071D] outline-none text-sm"
              />
              <input
                type="number"
                value={newAttendee.age_at_event ?? ''}
                onChange={(e) => setNewAttendee({ ...newAttendee, age_at_event: e.target.value ? Number(e.target.value) : null })}
                placeholder="Edad"
                className="px-3 py-2 border border-[#672B32]/30 rounded-lg focus:ring-2 focus:ring-[#4A071D] outline-none text-sm"
              />
              <button
                type="submit"
                className="px-4 py-2.5 text-sm font-semibold text-white bg-[#4A071D] rounded-lg hover:bg-[#672B32] transition-colors"
              >
                Guardar
              </button>
            </form>
          </div>
        )}

        <div className="space-y-3">
          {attendees.map((a) => (
            <div key={a.id} className="p-3 border border-[#4A071D]/10 rounded-xl bg-[#F3F0EB]/20">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-[#24130E]">{a.name} {a.surname}</span>
                <span className="text-xs text-[#211916]/50">
                  {a.after_lunch ? 'Post-almuerzo' : 'Desde el comienzo'}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs text-[#211916]/50 uppercase tracking-wider">Edad</p>
                  <input
                    type="number"
                    value={a.age_at_event ?? ''}
                    onChange={(e) => handleUpdateAttendee(a.id, 'age_at_event', e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-2 py-1 border border-[#672B32]/30 rounded focus:ring-2 focus:ring-[#4A071D] outline-none"
                  />
                </div>
                <div>
                  <p className="text-xs text-[#211916]/50 uppercase tracking-wider">Importe</p>
                  <span className="font-mono font-bold text-[#4A071D]">${(a.price_applied ?? 0).toLocaleString('es-AR')}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDeleteAttendee(a.id)}
                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-full"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {attendees.length === 0 && (
            <div className="text-center py-6 text-[#211916]/40">
              No hay asistentes registrados.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
