import { useEffect, useState } from 'react';
import { MapPin, Save, ShieldCheck } from 'lucide-react';
import {
  getAdminEventConfig,
  getPricingRules,
  ownerPublishPricingVersion,
  updateEventPublicConfig,
} from '../../lib/data-service';
import { DEFAULT_PUBLIC_EVENT_CONFIG, type PublicEventConfig } from '../../domain/event-config';
import type { PriceRule } from '../../types';

interface EventConfigProps {
  currentAdminId: string | null;
  currentAdminRole: 'owner' | 'editor';
}

const publicFields: Array<{
  key: Exclude<keyof PublicEventConfig, 'event_date' | 'bank_details'>;
  label: string;
  type: 'date' | 'time' | 'text' | 'url';
}> = [
  { key: 'reception_time', label: 'Horario de recepción', type: 'time' },
  { key: 'reception_name', label: 'Lugar de recepción', type: 'text' },
  { key: 'reception_address', label: 'Dirección de recepción', type: 'text' },
  { key: 'ceremony_time', label: 'Horario de ceremonia', type: 'time' },
  { key: 'ceremony_name', label: 'Lugar de ceremonia', type: 'text' },
  { key: 'ceremony_address', label: 'Dirección de ceremonia', type: 'text' },
  { key: 'event_end_time', label: 'Horario de finalización', type: 'time' },
  { key: 'venue_name', label: 'Salón', type: 'text' },
  { key: 'venue_address', label: 'Dirección del salón', type: 'text' },
  { key: 'directions_url', label: 'Enlace para llegar (HTTPS)', type: 'url' },
  { key: 'rsvp_deadline', label: 'Fecha límite de confirmación', type: 'date' },
  { key: 'dress_code', label: 'Código de vestimenta', type: 'text' },
];

const categoryLabels: Record<string, string> = {
  bebe: 'Bebé · 0–1 años',
  nino: 'Niño · 2–10 años',
  adulto: 'Adulto desde el comienzo',
  'post-almuerzo': 'Adulto después del almuerzo',
};

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
}

export default function EventConfig({ currentAdminId, currentAdminRole }: EventConfigProps) {
  const [config, setConfig] = useState<PublicEventConfig>(DEFAULT_PUBLIC_EVENT_CONFIG);
  const [bankFields, setBankFields] = useState({ alias: '', holder: '', bank: '' });
  const [bankDetailsPublished, setBankDetailsPublished] = useState(false);
  const [pricingRules, setPricingRules] = useState<PriceRule[]>([]);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [pricingReason, setPricingReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const isOwner = currentAdminRole === 'owner';

  const loadConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const [eventResult, rates] = await Promise.all([
        getAdminEventConfig(),
        getPricingRules(),
      ]);
      setConfig(eventResult.config);
      setBankFields(eventResult.bankFields);
      setBankDetailsPublished(eventResult.bankDetailsPublished);
      setPricingRules(rates);
      setPriceDrafts(Object.fromEntries(rates.map((rule) => [rule.category, String(rule.price)])));
    } catch (loadError: unknown) {
      setError(messageOf(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadConfig(); }, []);

  const saveField = async (key: string, value: string) => {
    setSaving(key);
    setError(null);
    setNotice(null);
    try {
      await updateEventPublicConfig({ [key]: value });
      await loadConfig();
      setNotice('La configuración se guardó correctamente.');
    } catch (saveError: unknown) {
      setError(messageOf(saveError));
    } finally {
      setSaving(null);
    }
  };

  const saveBankFields = async () => {
    if (!isOwner || !currentAdminId) return;
    setSaving('bank');
    setError(null);
    setNotice(null);
    try {
      await updateEventPublicConfig({
        bank_alias: bankFields.alias,
        bank_holder: bankFields.holder,
        bank_name: bankFields.bank,
      });
      await loadConfig();
      setNotice('Los datos bancarios se guardaron en la configuración privada de publicación.');
    } catch (saveError: unknown) {
      setError(messageOf(saveError));
    } finally {
      setSaving(null);
    }
  };

  const toggleBankPublication = async () => {
    if (!isOwner || !currentAdminId) return;
    if (!bankDetailsPublished && (!bankFields.alias.trim() || !bankFields.holder.trim() || !bankFields.bank.trim())) {
      setError('Completá alias, titular y banco antes de aprobar su publicación.');
      return;
    }
    if (!bankDetailsPublished && !confirm('¿Publicar el alias, titular y banco para todos los visitantes?')) return;
    setSaving('bank-publication');
    setError(null);
    setNotice(null);
    try {
      await updateEventPublicConfig({ bank_details_published: !bankDetailsPublished });
      await loadConfig();
      setNotice(bankDetailsPublished ? 'Se retiraron los datos bancarios de la invitación pública.' : 'Se aprobaron los datos bancarios para la invitación pública.');
    } catch (saveError: unknown) {
      setError(messageOf(saveError));
    } finally {
      setSaving(null);
    }
  };

  const publishRates = async () => {
    if (!isOwner || !currentAdminId) return;
    const rules = pricingRules.map((rule) => ({
      category: rule.category,
      price: Number(priceDrafts[rule.category]),
    }));
    if (!pricingReason.trim() || rules.some((rule) => !Number.isFinite(rule.price) || rule.price < 0)) {
      setError('Ingresá un motivo y valores de tarifa válidos.');
      return;
    }
    setSaving('pricing');
    setError(null);
    setNotice(null);
    try {
      const version = await ownerPublishPricingVersion(rules, pricingReason.trim());
      setPricingReason('');
      await loadConfig();
      setNotice(`Se activó la versión tarifaria ${version}. Los precios históricos no se modificaron.`);
    } catch (saveError: unknown) {
      setError(messageOf(saveError));
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return <p role="status" className="py-16 text-center">Cargando configuración…</p>;
  }

  return (
    <section className="space-y-6">
      <header className="flex items-center gap-2">
        <MapPin className="h-5 w-5 text-[#4A071D]" />
        <div>
          <h2 className="font-serif text-xl font-bold text-[#24130E]">Configuración del evento</h2>
          <p className="text-sm text-[#211916]/60">Los cambios se validan en el servidor y quedan auditados.</p>
        </div>
      </header>
      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p>}

      <section className="space-y-4 rounded-2xl border border-[#4A071D]/20 bg-white p-6 shadow-sm">
        <h3 className="font-serif text-lg font-bold text-[#24130E]">Información pública</h3>
        <label className="block max-w-sm text-sm font-medium">
          Fecha del evento
          <input value="26/09/2027" readOnly className="mt-1 w-full rounded-lg border bg-zinc-100 px-3 py-2" />
          <span className="mt-1 block text-xs text-[#211916]/60">Fecha oficial fija; no editable.</span>
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          {publicFields.map((field) => {
            const value = config[field.key];
            const current = typeof value === 'string' ? value : '';
            return (
              <label key={field.key} className="block text-sm font-medium">
                {field.label}
                <span className="mt-1 flex gap-2">
                  <input
                    type={field.type}
                    maxLength={field.key.endsWith('address') ? 300 : field.key === 'directions_url' ? 2000 : 120}
                    value={current}
                    onChange={(event) => setConfig({ ...config, [field.key]: event.target.value })}
                    className="min-w-0 flex-1 rounded-lg border border-[#672B32]/30 px-3 py-2"
                  />
                  <button
                    type="button"
                    onClick={() => void saveField(field.key, current)}
                    disabled={saving === field.key || current === (DEFAULT_PUBLIC_EVENT_CONFIG[field.key] ?? '')}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#4A071D]/30 px-3 text-xs font-semibold text-[#4A071D] disabled:opacity-40"
                  >
                    <Save className="h-4 w-4" /> Guardar
                  </button>
                </span>
              </label>
            );
          })}
        </div>
      </section>

      {isOwner && (
        <section className="space-y-4 rounded-2xl border border-[#4A071D]/20 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#4A071D]" />
            <h3 className="font-serif text-lg font-bold text-[#24130E]">Datos bancarios y aprobación</h3>
          </div>
          <p className="text-sm text-[#211916]/60">Solo se almacenan alias, titular y banco. No se admiten CVU ni CBU. Los datos se mantienen privados hasta aprobar su publicación.</p>
          <div className="grid gap-4 md:grid-cols-3">
            {([
              ['alias', 'Alias'],
              ['holder', 'Titular'],
              ['bank', 'Banco'],
            ] as const).map(([key, label]) => (
              <label key={key} className="text-sm font-medium">
                {label}
                <input
                  maxLength={120}
                  value={bankFields[key]}
                  onChange={(event) => setBankFields({ ...bankFields, [key]: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-[#672B32]/30 px-3 py-2"
                />
              </label>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => void saveBankFields()} disabled={saving === 'bank'} className="rounded-lg border border-[#4A071D]/30 px-4 py-2 text-sm font-semibold text-[#4A071D]">
              Guardar datos privados
            </button>
            <button type="button" onClick={() => void toggleBankPublication()} disabled={saving === 'bank-publication'} className="rounded-lg bg-[#4A071D] px-4 py-2 text-sm font-semibold text-white">
              {bankDetailsPublished ? 'Retirar publicación' : 'Aprobar publicación'}
            </button>
            <span className="text-xs text-[#211916]/60">
              {bankDetailsPublished ? 'Publicados en la invitación' : 'No visibles públicamente'}
            </span>
          </div>
        </section>
      )}

      {isOwner && (
        <section className="space-y-4 rounded-2xl border border-[#4A071D]/20 bg-white p-6 shadow-sm">
          <h3 className="font-serif text-lg font-bold text-[#24130E]">Versiones de tarifas</h3>
          <p className="text-sm text-[#211916]/60">Activar tarifas nuevas no altera los precios históricos de asistentes registrados.</p>
          <div className="space-y-3">
            {pricingRules.map((rule) => {
              const fixed = rule.category === 'bebe' || rule.category === 'nino';
              return (
                <label key={rule.category} className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="min-w-56">{categoryLabels[rule.category]}</span>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    disabled={fixed || saving === 'pricing'}
                    value={priceDrafts[rule.category] ?? String(rule.price)}
                    onChange={(event) => setPriceDrafts({ ...priceDrafts, [rule.category]: event.target.value })}
                    className="w-40 rounded-lg border px-3 py-2 text-right font-mono disabled:bg-zinc-100"
                  />
                  <span>ARS</span>
                  {fixed && <span className="text-xs text-[#211916]/60">Importe oficial fijo</span>}
                </label>
              );
            })}
          </div>
          <label className="block text-sm font-medium">
            Motivo de la nueva versión
            <input maxLength={500} value={pricingReason} onChange={(event) => setPricingReason(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
          <button type="button" onClick={() => void publishRates()} disabled={saving === 'pricing'} className="rounded-lg bg-[#4A071D] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {saving === 'pricing' ? 'Activando…' : 'Crear y activar versión tarifaria'}
          </button>
        </section>
      )}
    </section>
  );
}
