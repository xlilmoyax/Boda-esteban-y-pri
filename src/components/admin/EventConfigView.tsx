/**
 * Configuración del evento: fecha, ubicación, precios editables y datos de transferencia.
 * Los precios se guardan en Supabase y se conservan snapshots históricos.
 */

import { useState, useEffect } from 'react';
import { MapPin, Save } from 'lucide-react';
import {
  getEventSettings,
  updateEventSetting,
  getAllPricingRules,
  updatePricingRule,
  createAuditLog,
} from '../../lib/supabase';
import type { PriceRule } from '../../types';

interface EventConfigProps {
  currentAdminId: string | null;
}

export default function EventConfig({ currentAdminId }: EventConfigProps) {
  const [settings, setSettings] = useState<{ [key: string]: string }>({});
  const [pricingRules, setPricingRules] = useState<PriceRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const [settingsData, rulesData] = await Promise.all([
        getEventSettings(),
        getAllPricingRules(),
      ]);
      const settingsMap: { [key: string]: string } = {};
      settingsData.forEach((s: any) => { settingsMap[s.key] = s.value; });
      setSettings(settingsMap);
      setPricingRules(rulesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSaveSetting = async (key: string, value: string) => {
    if (!currentAdminId) return;
    setSaving(key);
    try {
      await updateEventSetting(key, value, currentAdminId);
      setSettings((prev) => ({ ...prev, [key]: value }));
      await createAuditLog({
        admin_id: currentAdminId,
        action: 'update_setting',
        table_name: 'event_settings',
        record_id: key,
        old_values: null,
        new_values: JSON.stringify({ [key]: value }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar configuración');
    } finally {
      setSaving(null);
    }
  };

  const handleUpdatePrice = async (rule: PriceRule, newPrice: number) => {
    if (!currentAdminId) return;
    setSaving(rule.id);
    try {
      const updated = await updatePricingRule(rule.id, { price: newPrice }, currentAdminId);
      setPricingRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, price: newPrice, updated_at: updated.updated_at } : r))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar precio');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-[#4A071D]/20 border-t-[#4A071D] rounded-full animate-spin"></div>
        <p className="mt-4 text-[#211916]">Cargando configuración...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <MapPin className="w-5 h-5 text-[#4A071D]" />
        <h2 className="font-serif text-xl font-bold text-[#24130E]">Configuración del Evento</h2>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Datos generales */}
      <div className="bg-white p-6 rounded-2xl border border-[#4A071D]/20 shadow-sm">
        <h3 className="font-serif text-lg font-bold text-[#24130E] mb-4">Información General</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key: 'event_date', label: 'Fecha del evento', type: 'date' as const, defaultValue: '2027-09-26' },
            { key: 'event_time', label: 'Horario', type: 'text' as const, defaultValue: '13:30 hs' },
            { key: 'venue_name', label: 'Salón', type: 'text' as const, defaultValue: 'BOLGHERT' },
            { key: 'venue_address', label: 'Dirección', type: 'text' as const, defaultValue: 'Santiago Derqui 703, Villa Allende' },
            { key: 'rsvp_deadline', label: 'Fecha límite confirmación', type: 'date' as const, defaultValue: '2027-09-20' },
            { key: 'dress_code', label: 'Vestimenta', type: 'text' as const, defaultValue: 'Elegante' },
          ].map((field) => (
            <div key={field.key} className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[#211916]">{field.label}</label>
              <input
                type={field.type}
                value={settings[field.key] || field.defaultValue}
                onChange={(e) => handleSaveSetting(field.key, e.target.value)}
                disabled={saving === field.key}
                className={`px-4 py-2 border border-[#672B32]/30 rounded-lg focus:ring-2 focus:ring-[#4A071D] focus:border-[#4A071D] outline-none text-sm ${
                  saving === field.key ? 'opacity-60' : ''
                }`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Datos de transferencia */}
      <div className="bg-white p-6 rounded-2xl border border-[#4A071D]/20 shadow-sm">
        <h3 className="font-serif text-lg font-bold text-[#24130E] mb-4">Datos de Transferencia</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key: 'transfer_alias', label: 'Alias', defaultValue: 'bodatebiypri.bbnk' },
            { key: 'transfer_holder', label: 'Titular', defaultValue: 'Moya Priscila Abigail' },
            { key: 'transfer_cvu', label: 'CVU', defaultValue: '1430001713010373680017' },
            { key: 'transfer_bank', label: 'Entidad', defaultValue: 'Brubank' },
          ].map((field) => (
            <div key={field.key} className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[#211916]">{field.label}</label>
              <input
                type="text"
                value={settings[field.key] || field.defaultValue}
                onChange={(e) => handleSaveSetting(field.key, e.target.value)}
                disabled={saving === field.key}
                className={`px-4 py-2 border border-[#672B32]/30 rounded-lg focus:ring-2 focus:ring-[#4A071D] focus:border-[#4A071D] outline-none text-sm ${
                  saving === field.key ? 'opacity-60' : ''
                }`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Precios */}
      <div className="bg-white p-6 rounded-2xl border border-[#4A071D]/20 shadow-sm">
        <h3 className="font-serif text-lg font-bold text-[#24130E] mb-4">Precios por Categoría</h3>
        <p className="text-sm text-[#211916]/60 mb-4">
          Modificá los precios manualmente. Los cambios se guardan en Supabase y conservan historial de snapshots.
        </p>
        <div className="space-y-3">
          {pricingRules.map((rule) => (
            <div key={rule.id} className="flex items-center gap-4 p-3 border border-[#4A071D]/10 rounded-lg bg-[#F3F0EB]/30">
              <span className="w-20 text-sm font-medium text-[#211916]">{rule.label}</span>
              <div className="flex-1">
                <input
                  type="number"
                  value={rule.price}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (!isNaN(val) && val >= 0) {
                      handleUpdatePrice(rule, val);
                    }
                  }}
                  disabled={saving === rule.id}
                  className={`w-full px-4 py-2 border border-[#672B32]/30 rounded-lg focus:ring-2 focus:ring-[#4A071D] focus:border-[#4A071D] outline-none text-sm text-right font-mono font-bold text-[#4A071D] ${
                    saving === rule.id ? 'opacity-60' : ''
                  }`}
                />
              </div>
              <span className="text-xs text-[#211916]/50">ARS</span>
              {saving === rule.id && (
                <Save className="w-4 h-4 text-[#4A071D] animate-pulse" />
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-[#211916]/40 mt-3">
          Los importes aplicados a confirmaciones anteriores se conservan como snapshots históricos. Una modificación no altera deudas ya registradas.
        </p>
      </div>
    </div>
  );
}
