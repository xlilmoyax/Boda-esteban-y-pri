/**
 * Vista de pagos: lista de pagos informados, verificación y rechazo.
 * Conecta con Supabase mediante SupabaseService.
 */

import { useState, useEffect } from 'react';
import { CreditCard, CheckCircle2, XCircle } from 'lucide-react';
import {
  getPaymentRecords,
  verifyPayment,
  rejectPayment,
  createAuditLog,
} from '../../lib/supabase';

interface PaymentRow {
  id: string;
  guest_id: string;
  amount_informed: number;
  amount_verified: number | null;
  status: 'pending' | 'informed' | 'verified' | 'rejected';
  payment_method: string | null;
  reference: string | null;
  notes: string | null;
  informed_by: string | null;
  verified_by: string | null;
  informed_at: string | null;
  verified_at: string | null;
  created_at: string;
  guests?: { name: string; surname: string };
}

interface PaymentsViewProps {
  currentAdminId: string | null;
}

export default function PaymentsView({ currentAdminId }: PaymentsViewProps) {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'informed' | 'verified' | 'rejected'>('all');
  const [error, setError] = useState<string | null>(null);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const data = await getPaymentRecords({ status: statusFilter === 'all' ? undefined : statusFilter });
      setPayments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar pagos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [statusFilter]);

  const handleVerify = async (id: string) => {
    if (!currentAdminId) return;
    try {
      await verifyPayment(id, currentAdminId);
      await loadPayments();
      await createAuditLog({
        admin_id: currentAdminId,
        action: 'verify_payment',
        table_name: 'payment_records',
        record_id: id,
        old_values: null,
        new_values: JSON.stringify({ status: 'verified' }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al verificar pago');
    }
  };

  const handleReject = async (id: string) => {
    if (!currentAdminId) return;
    try {
      await rejectPayment(id, currentAdminId);
      await loadPayments();
      await createAuditLog({
        admin_id: currentAdminId,
        action: 'reject_payment',
        table_name: 'payment_records',
        record_id: id,
        old_values: null,
        new_values: JSON.stringify({ status: 'rejected' }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al rechazar pago');
    }
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case 'pending': return 'Pendiente';
      case 'informed': return 'Informado';
      case 'verified': return 'Verificado';
      case 'rejected': return 'Rechazado';
      default: return s;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-[#4A071D]/20 border-t-[#4A071D] rounded-full animate-spin"></div>
        <p className="mt-4 text-[#211916]">Cargando pagos...</p>
      </div>
    );
  }

  const filtered = payments.filter((p) => {
    if (statusFilter === 'all') return true;
    return p.status === statusFilter;
  });

  const totalInformed = filtered
    .filter((p) => p.status === 'informed' || p.status === 'verified')
    .reduce((sum, p) => sum + p.amount_informed, 0);
  const totalVerified = filtered
    .filter((p) => p.status === 'verified')
    .reduce((sum, p) => sum + (p.amount_verified ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-[#4A071D]" />
          <h2 className="font-serif text-xl font-bold text-[#24130E]">Gestión de Pagos</h2>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-[#4A071D]/20 shadow-sm">
          <p className="text-sm text-[#211916]/60">Total informado</p>
          <p className="text-2xl font-serif font-bold text-[#24130E]">${totalInformed.toLocaleString('es-AR')}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-[#4A071D]/20 shadow-sm">
          <p className="text-sm text-[#211916]/60">Total verificado</p>
          <p className="text-2xl font-serif font-bold text-[#4A071D]">${totalVerified.toLocaleString('es-AR')}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-[#4A071D]/20 shadow-sm">
          <p className="text-sm text-[#211916]/60">Pendientes de verificación</p>
          <p className="text-2xl font-serif font-bold text-[#672B32]">
            {filtered.filter((p) => p.status === 'informed').length}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#4A071D]/20 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#4A071D]/10">
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'Todos' },
              { key: 'informed', label: 'Informados' },
              { key: 'verified', label: 'Verificados' },
              { key: 'rejected', label: 'Rechazados' },
            ].map((opt) => (
              <button
                key={opt.key}
                onClick={() => setStatusFilter(opt.key as any)}
                className={`px-4 py-2 text-sm font-medium rounded border transition-colors ${
                  statusFilter === opt.key
                    ? 'border-[#4A071D] bg-[#4A071D] text-white'
                    : 'border-[#672B32]/30 text-[#211916] hover:border-[#4A071D]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#4A071D]/10">
                <th className="px-4 py-3 text-xs font-semibold text-[#211916] uppercase tracking-wider">Invitado</th>
                <th className="px-4 py-3 text-xs font-semibold text-[#211916] uppercase tracking-wider">Importe informado</th>
                <th className="px-4 py-3 text-xs font-semibold text-[#211916] uppercase tracking-wider">Importe verificado</th>
                <th className="px-4 py-3 text-xs font-semibold text-[#211916] uppercase tracking-wider text-center">Estado</th>
                <th className="px-4 py-3 text-xs font-semibold text-[#211916] uppercase tracking-wider">Fecha</th>
                <th className="px-4 py-3 text-xs font-semibold text-[#211916] uppercase tracking-wider text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-[#4A071D]/5 hover:bg-[#F3F0EB]/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-[#24130E]">
                      {p.guests?.name || '—'} {p.guests?.surname || ''}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#211916]">
                    ${p.amount_informed.toLocaleString('es-AR')}
                  </td>
                  <td className="px-4 py-3 text-[#211916]">
                    {p.amount_verified !== null ? `$${p.amount_verified.toLocaleString('es-AR')}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        p.status === 'verified'
                          ? 'bg-[#4A071D]/10 text-[#4A071D] border border-[#4A071D]/20'
                          : p.status === 'rejected'
                            ? 'bg-rose-50 text-rose-600 border border-rose-100'
                            : p.status === 'informed'
                              ? 'bg-[#672B32]/10 text-[#672B32] border border-[#672B32]/20'
                              : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
                      }`}
                    >
                      {statusLabel(p.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#211916]/60 text-sm">
                    {p.informed_at ? p.informed_at.slice(0, 16) : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {p.status === 'informed' && (
                      <>
                        <button
                          onClick={() => handleVerify(p.id)}
                          className="p-2 text-[#4A071D] hover:bg-[#4A071D]/10 rounded-full transition-colors mr-1"
                          title="Verificar"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleReject(p.id)}
                          className="p-2 text-rose-600 hover:bg-rose-50 rounded-full transition-colors"
                          title="Rechazar"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {p.status === 'verified' && (
                      <span className="text-xs text-[#4A071D]">Verificado</span>
                    )}
                    {p.status === 'rejected' && (
                      <span className="text-xs text-rose-600">Rechazado</span>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#211916]/40">
                    No hay registros de pago.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
