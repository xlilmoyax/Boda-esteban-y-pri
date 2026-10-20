import { useState } from 'react';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { calculateGroupTotal } from '../domain/pricing';
import type { Attendee } from '../types';

interface ConfirmacionViewProps {
  onNavigate: (path: string) => void;
}

export default function ConfirmacionView({ onNavigate }: ConfirmacionViewProps) {
  const [step, setStep] = useState<'form' | 'success' | 'error'>('form');
  const [attendees, setAttendees] = useState<Attendee[]>([
    { id: '1', guest_id: '', name: '', surname: '', birth_date: null, age_at_event: null, category: null, price_applied: 0, after_lunch: false, created_at: '', updated_at: '' },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calculation, setCalculation] = useState<ReturnType<typeof calculateGroupTotal> | null>(null);

  const [guestName, setGuestName] = useState('');
  const [guestSurname, setGuestSurname] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [attending, setAttending] = useState<'si' | 'no' | ''>('');
  const [songSuggestion, setSongSuggestion] = useState('');
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [dietaryOther, setDietaryOther] = useState('');

  const btnClass = (active: boolean) =>
    active
      ? 'px-4 py-3 rounded-lg border border-[#4A071D] bg-[#4A071D] text-white font-semibold'
      : 'px-4 py-3 rounded-lg border border-[#672B32]/30 text-[#211916] font-semibold hover:border-[#4A071D]';

  const addAttendee = () => {
    setAttendees([
      ...attendees,
      { id: String(Date.now()), guest_id: '', name: '', surname: '', birth_date: null, age_at_event: null, category: null, price_applied: 0, after_lunch: false, created_at: '', updated_at: '' },
    ]);
  };

  const removeAttendee = (id: string) => {
    setAttendees(attendees.filter((a) => a.id !== id));
  };

  const updateAttendee = (id: string, field: keyof Attendee, value: any) => {
    setAttendees(attendees.map((a) => (a.id === id ? { ...a, [field]: value } : a)));
    recalculate();
  };

  const toggleDietary = (value: string) => {
    setDietaryRestrictions((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const recalculate = () => {
    setCalculation(calculateGroupTotal(attendees, []));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (!guestName.trim() || !guestSurname.trim()) {
        throw new Error('Completá tu nombre y apellido.');
      }
      if (!guestEmail.trim()) {
        throw new Error('Completá tu correo electrónico.');
      }
      if (!attending) {
        throw new Error('Indicá si asistirás o no.');
      }
      if (attending === 'si' && attendees.some((a) => !a.name.trim() || !a.surname.trim())) {
        throw new Error('Completá nombre y apellido de todos los asistentes.');
      }

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
      <section className="min-h-screen flex items-center justify-center bg-[#F3F0EB] px-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-[#4A071D]/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-[#4A071D]/20">
            <CheckCircle className="w-8 h-8 text-[#4A071D]" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-[#24130E] mb-4">¡Gracias!</h2>
          <p className="text-[#211916] mb-8">
            Tu confirmación de asistencia ha sido registrada correctamente. Te esperamos para celebrar con nosotras.
          </p>
          <button
            onClick={() => onNavigate('/')}
            className="px-6 py-3 text-sm font-semibold text-white bg-[#4A071D] rounded-full hover:bg-[#672B32] transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      </section>
    );
  }

  if (step === 'error') {
    return (
      <section className="min-h-screen flex items-center justify-center bg-[#F3F0EB] px-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-rose-600" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-[#24130E] mb-4">Error</h2>
          <p className="text-[#211916] mb-6">{error}</p>
          <button
            onClick={() => setStep('form')}
            className="px-6 py-3 text-sm font-semibold text-white bg-[#4A071D] rounded-full hover:bg-[#672B32] transition-colors"
          >
            Reintentar
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-[#F3F0EB] px-6 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold text-[#4A071D] mb-2">Confirmar asistencia</h1>
          <p className="text-[#211916]">Completá los datos de cada persona que asistirá.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-[#4A071D]/20 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-[#4A071D]/10 rounded-full flex items-center justify-center text-[#4A071D] font-semibold">1</div>
              <h2 className="font-serif text-xl font-bold text-[#24130E]">Datos del grupo</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-[#211916] mb-1">Tu nombre</label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full px-4 py-2 border border-[#672B32]/30 rounded-lg focus:ring-2 focus:ring-[#4A071D] focus:border-[#4A071D] outline-none"
                  placeholder="Nombre"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#211916] mb-1">Tu apellido</label>
                <input
                  type="text"
                  value={guestSurname}
                  onChange={(e) => setGuestSurname(e.target.value)}
                  className="w-full px-4 py-2 border border-[#672B32]/30 rounded-lg focus:ring-2 focus:ring-[#4A071D] focus:border-[#4A071D] outline-none"
                  placeholder="Apellido"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-[#211916] mb-1">Teléfono</label>
                <input
                  type="tel"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  className="w-full px-4 py-2 border border-[#672B32]/30 rounded-lg focus:ring-2 focus:ring-[#4A071D] focus:border-[#4A071D] outline-none"
                  placeholder="+54 9 XXX XXX-XXXX"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#211916] mb-1">Correo electrónico</label>
                <input
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-[#672B32]/30 rounded-lg focus:ring-2 focus:ring-[#4A071D] focus:border-[#4A071D] outline-none"
                  placeholder="tu@email.com"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-[#211916] mb-2">¿Asistirás?</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAttending('si')}
                  className={btnClass(attending === 'si')}
                >
                  ¡Claro que voy!
                </button>
                <button
                  type="button"
                  onClick={() => setAttending('no')}
                  className={btnClass(attending === 'no')}
                >
                  En esta oportunidad no podré asistir
                </button>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-[#211916] mb-2">Sugerencia de canción</label>
              <input
                type="text"
                value={songSuggestion}
                onChange={(e) => setSongSuggestion(e.target.value)}
                className="w-full px-4 py-2 border border-[#672B32]/30 rounded-lg focus:ring-2 focus:ring-[#4A071D] focus:border-[#4A071D] outline-none"
                placeholder="Tu canción favorita para la fiesta"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-[#211916] mb-2">Restricciones alimentarias</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { value: 'celiaquia', label: 'Celiaquía' },
                  { value: 'vegetariana', label: 'Vegetariana' },
                  { value: 'vegana', label: 'Vegana' },
                  { value: 'diabetes', label: 'Diabetes' },
                ].map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dietaryRestrictions.includes(opt.value)}
                      onChange={() => toggleDietary(opt.value)}
                      className="w-4 h-4 text-[#4A071D] border-[#672B32] rounded focus:ring-[#4A071D]"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
              <div className="mt-2">
                <label className="block text-xs font-medium text-[#211916] mb-1">Otra restricción (detalle)</label>
                <input
                  type="text"
                  value={dietaryOther}
                  onChange={(e) => setDietaryOther(e.target.value)}
                  className="w-full px-4 py-2 border border-[#672B32]/30 rounded-lg focus:ring-2 focus:ring-[#4A071D] focus:border-[#4A071D] outline-none"
                  placeholder="Especificá otra restricción"
                />
              </div>
            </div>
          </div>

          {attending === 'si' && (
            <div className="bg-white p-6 rounded-2xl border border-[#4A071D]/20 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-[#4A071D]/10 rounded-full flex items-center justify-center text-[#4A071D] font-semibold">2</div>
                <h2 className="font-serif text-xl font-bold text-[#24130E]">Asistentes</h2>
              </div>

              {attendees.map((a) => (
                <div key={a.id} className="p-4 border border-[#672B32]/10 rounded-xl space-y-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => removeAttendee(a.id)}
                      className="p-1.5 text-[#4A071D] hover:bg-[#4A071D]/10 rounded-full"
                      aria-label="Eliminar asistente"
                    >
                      ×
                    </button>
                    <div className="flex-1">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-[#211916] mb-1">Nombre</label>
                          <input
                            type="text"
                            value={a.name}
                            onChange={(e) => updateAttendee(a.id, 'name', e.target.value)}
                            className="w-full px-3 py-2 border border-[#672B32]/30 rounded-lg focus:ring-2 focus:ring-[#4A071D] focus:border-[#4A071D] outline-none"
                            placeholder="Nombre"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[#211916] mb-1">Apellido</label>
                          <input
                            type="text"
                            value={a.surname}
                            onChange={(e) => updateAttendee(a.id, 'surname', e.target.value)}
                            className="w-full px-3 py-2 border border-[#672B32]/30 rounded-lg focus:ring-2 focus:ring-[#4A071D] focus:border-[#4A071D] outline-none"
                            placeholder="Apellido"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                        <div>
                          <label className="block text-xs font-medium text-[#211916] mb-1">Edad en el evento</label>
                          <input
                            type="number"
                            value={a.age_at_event ?? ''}
                            onChange={(e) => updateAttendee(a.id, 'age_at_event', e.target.value ? Number(e.target.value) : null)}
                            className="w-full px-3 py-2 border border-[#672B32]/30 rounded-lg focus:ring-2 focus:ring-[#4A071D] focus:border-[#4A071D] outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[#211916] mb-1 flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={a.after_lunch}
                              onChange={(e) => updateAttendee(a.id, 'after_lunch', e.target.checked)}
                              className="w-4 h-4 text-[#4A071D]"
                            />
                            Después del almuerzo
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                  {calculation && (
                    <div className="mt-3 pt-3 border-t border-[#672B32]/10">
                      <span className="text-xs font-semibold text-[#4A071D]">Categoría: {a.category ?? 'Pendiente'}</span>
                      <span className="text-xs text-[#211916] ml-2">Importe: ${a.price_applied?.toLocaleString('es-AR') ?? 0}</span>
                    </div>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={addAttendee}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-[#4A071D] bg-[#F3F0EB] rounded-lg border border-[#4A071D]/20 hover:bg-[#4A071D]/10 transition-colors"
              >
                <span className="w-4 h-4">+</span> Agregar otro asistente
              </button>
            </div>
          )}

          {calculation && attending === 'si' && (
            <div className="bg-[#24130E] p-6 rounded-2xl text-[#F3F0EB] shadow-sm">
              <h3 className="font-serif text-lg font-bold mb-4">Resumen del importe</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-[#672B32]/30 pb-2">
                  <span className="text-[#F3F0EB]/80">Total asistentes</span>
                  <span className="font-medium">{calculation.totalAttendees}</span>
                </div>
                <div className="flex justify-between border-b border-[#672B32]/30 pb-2">
                  <span className="text-[#F3F0EB]/80">Asistentes que abonan</span>
                  <span className="font-medium">{calculation.payingAttendees}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="font-semibold text-[#F3F0EB]">Importe total estimado</span>
                  <span className="font-bold text-[#B8860B]">${calculation.grandTotal.toLocaleString('es-AR')}</span>
                </div>
              </div>
              <p className="mt-4 text-xs text-[#F3F0EB]/60">
                Los precios son estimados y se confirman al momento del pago.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full px-8 py-4 text-lg font-semibold text-white bg-[#4A071D] rounded-full hover:bg-[#672B32] disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Enviando...
              </>
            ) : (
              <>
                Confirmar asistencia
              </>
            )}
          </button>
        </form>
      </div>
    </section>
  );
}
