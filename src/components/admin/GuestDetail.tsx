/**
 * Detalle de una inscripción familiar con asistentes y saldo calculado en el servidor.
 */

import { useState, useEffect } from 'react';
import { ArrowLeft, Users, Trash2, Plus, RotateCcw, Save } from 'lucide-react';
import {
  getGuestById,
  getAttendeesByGuest,
  getRegistrationBalance,
  createAttendee,
  updateAttendee,
  deleteAttendee,
  restoreAttendee,
  updateGuest,
} from '../../lib/data-service';
import type { Attendee, Guest } from '../../types';

const DIETARY_LABELS: Record<string, string> = {
  celiaquia: 'Celiaquía',
  vegetariana: 'Vegetariana',
  vegana: 'Vegana',
  diabetes: 'Diabetes',
};

interface GuestDetailProps {
  guestId: string;
  onBack: () => void;
}

export default function GuestDetail({ guestId, onBack }: GuestDetailProps) {
  const [guest, setGuest] = useState<Guest | null>(null);
  const [guestDraft, setGuestDraft] = useState<Partial<Guest>>({});
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [balanceDue, setBalanceDue] = useState(0);
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
      const [g, atts, balance] = await Promise.all([
        getGuestById(guestId),
        getAttendeesByGuest(guestId, true),
        getRegistrationBalance(guestId),
      ]);
      setGuest(g);
      if (g) setGuestDraft({
        name: g.name,
        surname: g.surname,
        email: g.email,
        phone: g.phone,
        observations: g.observations,
        attending: g.attending,
        song_suggestion: g.song_suggestion,
        dietary_restrictions: g.dietary_restrictions,
        dietary_details: g.dietary_details,
      });
      setAttendees(atts);
      setBalanceDue(balance.balanceDue);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agregar asistente');
    }
  };

  const handleSaveFamily = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!guest) return;
    try {
      await updateGuest(guest.id, guestDraft);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar los datos familiares');
    }
  };

  const handleUpdateAttendee = async <K extends keyof Attendee,>(
    id: string,
    field: K,
    value: Attendee[K]
  ) => {
    try {
      await updateAttendee(id, { [field]: value });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar asistente');
    }
  };

  const handleDeleteAttendee = async (id: string) => {
    if (!confirm('¿Dar de baja este asistente? Su registro histórico se conservará.')) return;
    try {
      await deleteAttendee(id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar asistente');
    }
  };

  const handleRestoreAttendee = async (id: string) => {
    try {
      await restoreAttendee(id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al restaurar asistente');
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

  const dietaryCodes: string[] = guest.dietary_restrictions ?? [];
  const dietaryLabels = dietaryCodes.map((code) => DIETARY_LABELS[code] ?? code);

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-[#F3F0EB]/50 rounded-xl border border-[#4A071D]/10">
            <p className="text-xs text-[#211916]/50 uppercase tracking-wider">Saldo pendiente</p>
            <p className="text-xl font-serif font-bold text-[#4A071D]">${balanceDue.toLocaleString('es-AR')}</p>
          </div>
          <div className="p-4 bg-[#F3F0EB]/50 rounded-xl border border-[#4A071D]/10">
            <p className="text-xs text-[#211916]/50 uppercase tracking-wider">Asistentes activos</p>
            <p className="text-xl font-serif font-bold text-[#24130E]">
              {attendees.filter((attendee) => !attendee.deleted_at && attendee.attending !== false).length}
            </p>
          </div>
        </div>
        <dl className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="font-semibold text-[#24130E]">Sugerencia de canción</dt>
            <dd className="mt-1 text-[#211916]/70">{guest.song_suggestion?.trim() || 'Sin sugerencia'}</dd>
          </div>
          <div>
            <dt className="font-semibold text-[#24130E]">Restricciones alimentarias</dt>
            <dd className="mt-1 text-[#211916]/70">
              {dietaryLabels.join(', ') || 'Ninguna indicada'}
            </dd>
            {Boolean(guest.dietary_details?.trim()) && (
              <dd className="mt-1 text-[#211916]/70">
                Detalle: {guest.dietary_details?.trim()}
              </dd>
            )}
          </div>
        </dl>
      </div>

      <form onSubmit={handleSaveFamily} className="space-y-4 rounded-2xl border border-[#4A071D]/20 bg-white p-6 shadow-sm">
        <h3 className="font-serif text-lg font-bold text-[#24130E]">Datos de la familia y RSVP</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">Nombre
            <input required maxLength={120} value={guestDraft.name ?? ''} onChange={(event) => setGuestDraft({ ...guestDraft, name: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
          <label className="text-sm">Apellido
            <input required maxLength={120} value={guestDraft.surname ?? ''} onChange={(event) => setGuestDraft({ ...guestDraft, surname: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
          <label className="text-sm">Email
            <input required type="email" maxLength={254} value={guestDraft.email ?? ''} onChange={(event) => setGuestDraft({ ...guestDraft, email: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
          <label className="text-sm">Teléfono
            <input maxLength={50} value={guestDraft.phone ?? ''} onChange={(event) => setGuestDraft({ ...guestDraft, phone: event.target.value || null })} className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
          <label className="text-sm">Confirmación
            <select
              value={guestDraft.attending === null ? 'pending' : guestDraft.attending ? 'confirmed' : 'declined'}
              onChange={(event) => setGuestDraft({
                ...guestDraft,
                attending: event.target.value === 'pending' ? null : event.target.value === 'confirmed',
              })}
              className="mt-1 w-full rounded-lg border px-3 py-2"
            >
              <option value="pending">Pendiente</option>
              <option value="confirmed">Asistirá</option>
              <option value="declined">No asistirá</option>
            </select>
          </label>
          <label className="text-sm">Sugerencia de canción
            <input maxLength={200} value={guestDraft.song_suggestion ?? ''} onChange={(event) => setGuestDraft({ ...guestDraft, song_suggestion: event.target.value || null })} className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
          <fieldset className="text-sm md:col-span-2">
            <legend>Restricciones alimentarias</legend>
            <div className="mt-2 flex flex-wrap gap-4">
              {Object.entries(DIETARY_LABELS).map(([code, label]) => (
                <label key={code} className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={guestDraft.dietary_restrictions?.includes(code) ?? false}
                    onChange={(event) => {
                      const current = guestDraft.dietary_restrictions ?? [];
                      setGuestDraft({
                        ...guestDraft,
                        dietary_restrictions: event.target.checked
                          ? [...current, code]
                          : current.filter((value) => value !== code),
                      });
                    }}
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="text-sm md:col-span-2">Detalles alimentarios
            <textarea maxLength={500} value={guestDraft.dietary_details ?? ''} onChange={(event) => setGuestDraft({ ...guestDraft, dietary_details: event.target.value || null })} className="mt-1 w-full rounded-lg border px-3 py-2" rows={3} />
          </label>
          <label className="text-sm md:col-span-2">Observaciones
            <textarea maxLength={2000} value={guestDraft.observations ?? ''} onChange={(event) => setGuestDraft({ ...guestDraft, observations: event.target.value || null })} className="mt-1 w-full rounded-lg border px-3 py-2" rows={3} />
          </label>
        </div>
        <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-[#4A071D] px-4 py-2 text-sm font-semibold text-white">
          <Save className="h-4 w-4" /> Guardar datos familiares
        </button>
      </form>

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
                required
                maxLength={120}
                placeholder="Nombre"
                className="px-3 py-2 border border-[#672B32]/30 rounded-lg focus:ring-2 focus:ring-[#4A071D] outline-none text-sm"
              />
              <input
                type="text"
                value={newAttendee.surname}
                onChange={(e) => setNewAttendee({ ...newAttendee, surname: e.target.value })}
                required
                maxLength={120}
                placeholder="Apellido"
                className="px-3 py-2 border border-[#672B32]/30 rounded-lg focus:ring-2 focus:ring-[#4A071D] outline-none text-sm"
              />
              <input
                type="number"
                required
                min={0}
                max={120}
                value={newAttendee.age_at_event ?? ''}
                onChange={(e) => setNewAttendee({ ...newAttendee, age_at_event: e.target.value ? Number(e.target.value) : null })}
                placeholder="Edad"
                className="px-3 py-2 border border-[#672B32]/30 rounded-lg focus:ring-2 focus:ring-[#4A071D] outline-none text-sm"
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={newAttendee.after_lunch}
                  onChange={(event) => setNewAttendee({ ...newAttendee, after_lunch: event.target.checked })}
                />
                Solo después del almuerzo
              </label>
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
            <div key={a.id} className={`p-3 border border-[#4A071D]/10 rounded-xl bg-[#F3F0EB]/20 ${a.deleted_at ? 'opacity-60' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-[#24130E]">{a.name} {a.surname}</span>
                <span className="text-xs text-[#211916]/50">
                  {a.deleted_at ? 'Baja lógica' : a.after_lunch ? 'Post-almuerzo' : 'Desde el comienzo'}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs text-[#211916]/50 uppercase tracking-wider">Edad</p>
                  <input
                    type="number"
                    min={0}
                    max={120}
                    value={a.age_at_event ?? ''}
                    disabled={Boolean(a.deleted_at)}
                    onBlur={(e) => {
                      const value = Number(e.target.value);
                      if (Number.isInteger(value) && value >= 0 && value <= 120 && value !== a.age_at_event) {
                        void handleUpdateAttendee(a.id, 'age_at_event', value);
                      }
                    }}
                    className="w-full px-2 py-1 border border-[#672B32]/30 rounded focus:ring-2 focus:ring-[#4A071D] outline-none"
                  />
                </div>
                <div>
                  <p className="text-xs text-[#211916]/50 uppercase tracking-wider">Importe</p>
                  <span className="font-mono font-bold text-[#4A071D]">${(a.price_applied ?? 0).toLocaleString('es-AR')}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {!a.deleted_at && (
                    <>
                      <label className="inline-flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={a.attending !== false}
                          onChange={(event) => void handleUpdateAttendee(a.id, 'attending', event.target.checked)}
                        />
                        Asiste
                      </label>
                      <label className="inline-flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={a.after_lunch}
                          onChange={(event) => void handleUpdateAttendee(a.id, 'after_lunch', event.target.checked)}
                        />
                        Después del almuerzo
                      </label>
                      <button
                        onClick={() => handleDeleteAttendee(a.id)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-full"
                        aria-label={`Dar de baja a ${a.name} ${a.surname}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {a.deleted_at && (
                    <button
                      onClick={() => handleRestoreAttendee(a.id)}
                      className="inline-flex items-center gap-1 text-xs text-emerald-700"
                    >
                      <RotateCcw className="h-4 w-4" /> Restaurar
                    </button>
                  )}
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
