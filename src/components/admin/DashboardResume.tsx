import { useEffect, useState } from 'react';
import { Calculator, CheckCircle2, Users, UserRound } from 'lucide-react';
import { getDashboardSummary } from '../../lib/data-service';
import type { AdminDashboardSummary } from '../../lib/data-service';

const EMPTY_SUMMARY: AdminDashboardSummary = {
  family_count: 0,
  confirmed_family_count: 0,
  attendee_count: 0,
  balance_due: 0,
};

export default function DashboardResume() {
  const [summary, setSummary] = useState<AdminDashboardSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getDashboardSummary().then(
      (data) => { if (active) setSummary(data); },
      (loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el resumen.');
      }
    ).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const cards = [
    { label: 'Familias activas', value: summary.family_count.toLocaleString('es-AR'), icon: <Users className="h-5 w-5" /> },
    { label: 'Familias confirmadas', value: summary.confirmed_family_count.toLocaleString('es-AR'), icon: <CheckCircle2 className="h-5 w-5" /> },
    { label: 'Asistentes que concurren', value: summary.attendee_count.toLocaleString('es-AR'), icon: <UserRound className="h-5 w-5" /> },
    { label: 'Saldo pendiente total', value: `$${summary.balance_due.toLocaleString('es-AR')}`, icon: <Calculator className="h-5 w-5" /> },
  ];

  return (
    <section aria-label="Resumen administrativo">
      {error && <p role="alert" className="mb-5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {loading && <p role="status" className="mb-4 text-sm text-[#211916]/60">Cargando métricas…</p>}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <article key={card.label} className="rounded-2xl border border-[#4A071D]/20 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-[#211916]/60">{card.label}</p>
                <p className="text-2xl font-serif font-bold text-[#24130E]">{card.value}</p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#4A071D]/10 text-[#4A071D]">{card.icon}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
