/**
 * Lista de invitados con búsqueda, filtros y acciones CRUD.
 * Conecta con Supabase mediante SupabaseService.
 */

import { useState, useEffect } from 'react';
import { Search, Users, UserPlus, Trash2, ChevronRight, RotateCcw } from 'lucide-react';
import { getGuests, createGuest, deleteGuest, restoreGuest } from '../../lib/data-service';
import type { Guest } from '../../types';

interface GuestListProps {
  onOpenFamily: (id: string) => void;
}

export default function GuestList({ onOpenFamily }: GuestListProps) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [attendingFilter, setAttendingFilter] = useState<'all' | 'si' | 'no'>('all');
  const [showDeleted, setShowDeleted] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newGuest, setNewGuest] = useState({ name: '', surname: '', phone: '', email: '' });
  const [error, setError] = useState<string | null>(null);

  const loadGuests = async () => {
    try {
      setLoading(true);
      const { guests: data } = await getGuests({
        search: search || undefined,
        includeDeleted: showDeleted,
        limit: 100,
      });
      setGuests(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar invitados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGuests();
  }, [search, attendingFilter, showDeleted]);

  const filteredGuests = guests.filter((g) => {
    if (attendingFilter === 'si') return g.attending === true;
    if (attendingFilter === 'no') return g.attending === false;
    return true;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createGuest({
        ...newGuest,
        attending: null,
        song_suggestion: null,
        dietary_restrictions: [],
        dietary_details: null,
        observations: null,
      });
      setShowForm(false);
      setNewGuest({ name: '', surname: '', phone: '', email: '' });
      await loadGuests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear invitado');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Dar de baja esta inscripción familiar? Se excluirá de los saldos activos.')) return;
    try {
      await deleteGuest(id);
      await loadGuests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar invitado');
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await restoreGuest(id);
      await loadGuests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al restaurar la inscripción familiar');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-[#4A071D]/20 border-t-[#4A071D] rounded-full animate-spin"></div>
        <p className="mt-4 text-[#211916]">Cargando invitados...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-[#4A071D]" />
          <h2 className="font-serif text-xl font-bold text-[#24130E]">Gestión de familias</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#4A071D] rounded-lg hover:bg-[#672B32] transition-colors"
          >
            <UserPlus className="w-4 h-4" /> Nuevo invitado
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-700 flex items-center gap-2">
          <Trash2 className="w-4 h-4" /> {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#4A071D]/20 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#4A071D]/10">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#672B32]/40" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre o apellido..."
                className="w-full px-4 py-2 pl-10 border border-[#672B32]/30 rounded-lg focus:ring-2 focus:ring-[#4A071D] focus:border-[#4A071D] outline-none text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleted(false)}
                className={`px-4 py-2 text-sm font-medium rounded border transition-colors ${
                  !showDeleted ? 'border-[#4A071D] bg-[#4A071D] text-white' : 'border-[#672B32]/30 text-[#211916]'
                }`}
              >
                Activas
              </button>
              <button
                onClick={() => setShowDeleted(true)}
                className={`px-4 py-2 text-sm font-medium rounded border transition-colors ${
                  showDeleted ? 'border-[#4A071D] bg-[#4A071D] text-white' : 'border-[#672B32]/30 text-[#211916]'
                }`}
              >
                Bajas lógicas
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setAttendingFilter('all')}
                className={`px-4 py-2 text-sm font-medium rounded border transition-colors ${
                  attendingFilter === 'all'
                    ? 'border-[#4A071D] bg-[#4A071D] text-white'
                    : 'border-[#672B32]/30 text-[#211916] hover:border-[#4A071D]'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setAttendingFilter('si')}
                className={`px-4 py-2 text-sm font-medium rounded border transition-colors ${
                  attendingFilter === 'si'
                    ? 'border-[#4A071D] bg-[#4A071D] text-white'
                    : 'border-[#672B32]/30 text-[#211916] hover:border-[#4A071D]'
                }`}
              >
                Confirmados
              </button>
              <button
                onClick={() => setAttendingFilter('no')}
                className={`px-4 py-2 text-sm font-medium rounded border transition-colors ${
                  attendingFilter === 'no'
                    ? 'border-[#4A071D] bg-[#4A071D] text-white'
                    : 'border-[#672B32]/30 text-[#211916] hover:border-[#4A071D]'
                }`}
              >
                No asisten
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#4A071D]/10">
                <th className="px-4 py-3 text-xs font-semibold text-[#211916] uppercase tracking-wider">Nombre</th>
                <th className="px-4 py-3 text-xs font-semibold text-[#211916] uppercase tracking-wider">Teléfono</th>
                <th className="px-4 py-3 text-xs font-semibold text-[#211916] uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-xs font-semibold text-[#211916] uppercase tracking-wider text-center">Asistencia</th>
                <th className="px-4 py-3 text-xs font-semibold text-[#211916] uppercase tracking-wider text-center">Asistentes</th>
                <th className="px-4 py-3 text-xs font-semibold text-[#211916] uppercase tracking-wider text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredGuests.map((guest) => (
                <tr key={guest.id} className={`border-b border-[#4A071D]/5 hover:bg-[#F3F0EB]/30 transition-colors ${guest.deleted_at ? 'opacity-65' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-[#24130E]">{guest.name} {guest.surname}</div>
                    <div className="text-xs text-[#211916]/60">
                      {guest.deleted_at ? `Baja: ${guest.deleted_at.slice(0, 10)}` : `Alta: ${guest.created_at.slice(0, 10)}`}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#211916]">{guest.phone || '—'}</td>
                  <td className="px-4 py-3 text-[#211916]">{guest.email || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        guest.attending === true
                          ? 'bg-[#4A071D]/10 text-[#4A071D] border border-[#4A071D]/20'
                          : guest.attending === false
                            ? 'bg-rose-50 text-rose-600 border border-rose-100'
                            : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
                      }`}
                    >
                      {guest.attending === true ? '✓ Sí' : guest.attending === false ? '✗ No' : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-sm">
                    {(guest.attendees ?? []).length} persona(s)
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => onOpenFamily(guest.id)}
                      className="p-2 text-[#4A071D] hover:bg-[#4A071D]/10 rounded-full transition-colors"
                      title="Ver y editar familia"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    {guest.deleted_at ? (
                      <button
                        onClick={() => handleRestore(guest.id)}
                        className="p-2 text-emerald-700 hover:bg-emerald-50 rounded-full transition-colors"
                        title="Restaurar familia"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDelete(guest.id)}
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-full transition-colors"
                        title="Dar de baja"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredGuests.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#211916]/40">
                    No se encontraron invitados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-2xl border border-[#4A071D]/20 shadow-sm">
          <h3 className="font-serif text-lg font-bold text-[#24130E] mb-4">Nuevo invitado</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-[#211916] mb-1">Nombre y apellido</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={newGuest.name}
                  onChange={(e) => setNewGuest({ ...newGuest, name: e.target.value })}
                  placeholder="Nombre"
                  className="flex-1 px-4 py-2 border border-[#672B32]/30 rounded-lg focus:ring-2 focus:ring-[#4A071D] focus:border-[#4A071D] outline-none"
                />
                <input
                  type="text"
                  required
                  value={newGuest.surname}
                  onChange={(e) => setNewGuest({ ...newGuest, surname: e.target.value })}
                  placeholder="Apellido"
                  className="flex-1 px-4 py-2 border border-[#672B32]/30 rounded-lg focus:ring-2 focus:ring-[#4A071D] focus:border-[#4A071D] outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#211916] mb-1">Teléfono</label>
              <input
                type="tel"
                value={newGuest.phone}
                onChange={(e) => setNewGuest({ ...newGuest, phone: e.target.value })}
                placeholder="+54 9 XXX XXX-XXXX"
                className="w-full px-4 py-2 border border-[#672B32]/30 rounded-lg focus:ring-2 focus:ring-[#4A071D] focus:border-[#4A071D] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#211916] mb-1">Correo electrónico</label>
              <input
                type="email"
                required
                value={newGuest.email}
                onChange={(e) => setNewGuest({ ...newGuest, email: e.target.value })}
                placeholder="tu@email.com"
                className="w-full px-4 py-2 border border-[#672B32]/30 rounded-lg focus:ring-2 focus:ring-[#4A071D] focus:border-[#4A071D] outline-none"
              />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <button
                type="submit"
                className="flex-1 px-4 py-3 text-sm font-semibold text-white bg-[#4A071D] rounded-lg hover:bg-[#672B32] transition-colors"
              >
                Guardar
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-3 text-sm font-semibold text-[#211916] bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
