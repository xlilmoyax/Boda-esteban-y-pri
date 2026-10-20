import { useState } from 'react';
import { AlertCircle, CheckCircle, Loader2, Phone } from 'lucide-react';
import { calculateGroupTotal } from '../domain/pricing';
import type { Attendee } from '../types';

interface ConfirmacionViewProps {
  onNavigate: (path: string) => void;
}

export default function ConfirmacionView({ onNavigate }: ConfirmacionViewProps) {
  const [step, setStep] = useState<'form' | 'success' | 'error'>('form');
  const [attendees, setAttendees] = useState<Attendee[]>([
    { id: '1', guest_id: '', name: '', surname: '', birth_date: null, age_at_event: null, category_id: null, price_applied: 0, after_lunch: false, created_at: '', updated_at: '' },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [afterLunchGroup, setAfterLunchGroup] = useState(false);
  const [calculation, setCalculation] = useState<ReturnType<typeof calculateGroupTotal> | null>(null);

  const addAttendee = () => {
    setAttendees([
      ...attendees,
      { id: String(Date.now()), guest_id: '', name: '', surname: '', birth_date: null, age_at_event: null, category_id: null, price_applied: 0, after_lunch: false, created_at: '', updated_at: '' },
    ]);
  };

  const removeAttendee = (id: string) => {
    setAttendees(attendees.filter((a) => a.id !== id));
  };

  const updateAttendee = (id: string, field: keyof Attendee, value: any) => {
    setAttendees(attendees.map((a) => (a.id === id ? { ...a, [field]: value } : a)));
    recalculate();
  };

  const recalculate = () => {
    setCalculation(calculateGroupTotal(attendees, []));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // Validación básica
      if (attendees.some((a) => !a.name.trim() || !a.surname.trim())) {
        throw new Error('Completá nombre y apellido de todos los asistentes.');
      }

      // Simular persistencia (pendiente de Supabase configurado)
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar la asistencia.');
      setStep('error');
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'success') {
    return (
      <section className="min-h-screen flex items-center justify-center bg-zinc-50 px-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-zinc-900 mb-4">¡Gracias!</h2>
          <p className="text-zinc-600 mb-8">
            Tu confirmación de asistencia ha sido registrada correctamente. Te esperamos para celebrar con nosotras.
          </p>
          <button
            onClick={() => onNavigate('/')}
            className="px-6 py-3 text-sm font-semibold text-white bg-amber-900 rounded-full hover:bg-amber-800 transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      </section>
    );
  }

  if (step === 'error') {
    return (
      <section className="min-h-screen flex items-center justify-center bg-zinc-50 px-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-rose-600" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-zinc-900 mb-4">Error</h2>
          <p className="text-zinc-600 mb-6">{error}</p>
          <button
            onClick={() => setStep('form')}
            className="px-6 py-3 text-sm font-semibold text-white bg-amber-900 rounded-full hover:bg-amber-800 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-zinc-50 px-6 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold text-amber-900 mb-2">Confirmar asistencia</h1>
          <p className="text-zinc-600">Completá los datos de cada persona que asistirá.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <Phone className="w-5 h-5 text-amber-900" />
              <h2 className="font-serif text-xl font-semibold text-zinc-900">Datos del grupo</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Tu nombre y apellido</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  placeholder="Nombre y apellido"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Teléfono</label>
                <input
                  type="tel"
                  className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  placeholder="+54 9 XXX XXX-XXXX"
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-zinc-700 mb-1">Correo electrónico</label>
              <input
                type="email"
                className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                placeholder="tu@email.com"
              />
            </div>

            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                id="after-lunch"
                checked={afterLunchGroup}
                onChange={(e) => setAfterLunchGroup(e.target.checked)}
                className="w-4 h-4 text-amber-900 border-zinc-300 rounded focus:ring-amber-500"
              />
              <label htmlFor="after-lunch" className="text-sm font-medium text-zinc-700">
                Alguna persona se incorpora después del almuerzo
              </label>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-900 font-semibold">1</div>
              <h2 className="font-serif text-xl font-semibold text-zinc-900">Asistentes</h2>
            </div>

            {attendees.map((a) => (
              <div key={a.id} className="p-4 border border-zinc-200 rounded-xl space-y-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => removeAttendee(a.id)}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-full"
                    aria-label="Eliminar asistente"
                  >
                    ×
                  </button>
                  <div className="flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-zinc-500 mb-1">Nombre</label>
                        <input
                          type="text"
                          value={a.name}
                          onChange={(e) => updateAttendee(a.id, 'name', e.target.value)}
                          className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                          placeholder="Nombre"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-500 mb-1">Apellido</label>
                        <input
                          type="text"
                          value={a.surname}
                          onChange={(e) => updateAttendee(a.id, 'surname', e.target.value)}
                          className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                          placeholder="Apellido"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                      <div>
                        <label className="block text-xs font-medium text-zinc-500 mb-1">Fecha de nacimiento</label>
                        <input
                          type="date"
                          value={a.birth_date ?? ''}
                          onChange={(e) => updateAttendee(a.id, 'birth_date', e.target.value || null)}
                          className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-500 mb-1">Edad en el evento</label>
                        <input
                          type="number"
                          value={a.age_at_event ?? ''}
                          onChange={(e) => updateAttendee(a.id, 'age_at_event', e.target.value ? Number(e.target.value) : null)}
                          className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-500 mb-1 flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={a.after_lunch}
                            onChange={(e) => updateAttendee(a.id, 'after_lunch', e.target.checked)}
                            className="w-4 h-4 text-amber-900"
                          />
                          Después del almuerzo
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                {calculation && (
                  <div className="mt-3 pt-3 border-t border-zinc-100">
                    <span className="text-xs font-semibold text-amber-900">Categoría: {a.category_id ?? 'Pendiente'}</span>
                    <span className="text-xs text-zinc-500 ml-2">Importe: $0 (pendiente de precios de Canva)</span>
                  </div>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={addAttendee}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-amber-900 bg-amber-50 rounded-lg border border-amber-200 hover:bg-amber-100 transition-colors"
            >
              <span className="w-4 h-4">+</span> Agregar otro asistente
            </button>
          </div>

          {calculation && (
            <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
              <h3 className="font-serif text-lg font-bold text-zinc-900 mb-4">Resumen del importe</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-600">Total asistentes</span>
                  <span className="font-medium">{calculation.totalAttendees}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Asistentes que abonan</span>
                  <span className="font-medium">{calculation.payingAttendees}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-zinc-100">
                  <span className="font-semibold text-zinc-900">Importe total estimado</span>
                  <span className="font-bold text-amber-900">$0 (pendiente de precios de Canva)</span>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full px-8 py-4 text-lg font-semibold text-white bg-amber-900 rounded-full hover:bg-amber-800 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Enviando...
              </>
            ) : (
              <>
                Confirmar asistencia <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </div>
    </section>
  );
}

import { ArrowRight } from 'lucide-react';
