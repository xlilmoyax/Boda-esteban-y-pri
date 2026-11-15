import { useEffect, useState } from 'react';
import { Calculator, Users } from 'lucide-react';
import { getBalanceSummary } from '../../lib/data-service';
import type { RegistrationBalance } from '../../lib/data-service';

interface BalancesViewProps {
  onOpenFamily: (id: string) => void;
}

export default function BalancesView({ onOpenFamily }: BalancesViewProps) {
  const [rows, setRows] = useState<RegistrationBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getBalanceSummary().then(
      (balances) => {
        if (active) setRows(balances);
      },
      (loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Error al cargar saldos.');
      }
    ).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  if (loading) {
    return <p role="status" className="py-12 text-center">Calculando saldos desde los asistentes activos…</p>;
  }

  return (
    <section className="space-y-5">
      <header className="flex items-center gap-3">
        <Calculator className="h-5 w-5 text-[#4A071D]" />
        <div>
          <h2 className="font-serif text-xl font-bold text-[#24130E]">Saldos pendientes</h2>
          <p className="text-sm text-[#211916]/60">Cálculo del servidor sobre precios históricos. No se registran pagos.</p>
        </div>
      </header>
      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      <div className="overflow-hidden rounded-2xl border border-[#4A071D]/20 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#4A071D]/10">
                <th className="px-4 py-3 text-xs uppercase">Familia</th>
                <th className="px-4 py-3 text-xs uppercase">Email</th>
                <th className="px-4 py-3 text-center text-xs uppercase">Asistentes que concurren</th>
                <th className="px-4 py-3 text-right text-xs uppercase">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.registration_id}
                  className="cursor-pointer border-b border-[#4A071D]/5 hover:bg-[#F3F0EB]/40"
                  onClick={() => onOpenFamily(row.registration_id)}
                >
                  <td className="px-4 py-3 font-medium">{row.contact_name} {row.contact_surname}</td>
                  <td className="px-4 py-3 text-sm">{row.email}</td>
                  <td className="px-4 py-3 text-center"><Users className="mr-1 inline h-4 w-4" />{row.included_attendees}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-[#4A071D]">
                    ${row.balance_due.toLocaleString('es-AR')}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && !error && (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-[#211916]/50">Todavía no hay confirmaciones activas.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
