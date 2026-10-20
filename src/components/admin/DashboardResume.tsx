/**
 * Resumen del panel administrativo con estadísticas reales.
 * Conecta con Supabase para obtener datos reales.
 */

import { useState, useEffect } from 'react';
import { Users, CreditCard, FileText, ShieldAlert } from 'lucide-react';
import { getGuests, getPaymentRecords } from '../../lib/supabase';

interface StatCard {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

export default function DashboardResume() {
  const [stats, setStats] = useState<StatCard[]>([
    { label: 'Grupos registrados', value: '0', icon: <Users className="w-5 h-5" />, color: '#4A071D' },
    { label: 'Asistentes totales', value: '0', icon: <CreditCard className="w-5 h-5" />, color: '#672B32' },
    { label: 'Confirmados', value: '0', icon: <ShieldAlert className="w-5 h-5" />, color: '#4A071D' },
    { label: 'Pagos verificados', value: '$0', icon: <FileText className="w-5 h-5" />, color: '#672B32' },
  ]);
  const [_loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        const { guests, count } = await getGuests({ limit: 1 });
        const payments = await getPaymentRecords();
        const confirmed = guests.filter((g: any) => g.attending === true).length;
        const totalAttendees = guests.reduce((sum: number, g: any) => sum + (g.attendees?.length ?? 0), 0);
        const verifiedTotal = payments
          .filter((p: any) => p.status === 'verified')
          .reduce((sum: number, p: any) => sum + (p.amount_verified ?? 0), 0);

        setStats([
          { label: 'Grupos registrados', value: count, icon: <Users className="w-5 h-5" />, color: '#4A071D' },
          { label: 'Asistentes totales', value: totalAttendees, icon: <CreditCard className="w-5 h-5" />, color: '#672B32' },
          { label: 'Confirmados', value: confirmed, icon: <ShieldAlert className="w-5 h-5" />, color: '#4A071D' },
          { label: 'Pagos verificados', value: `$${verifiedTotal.toLocaleString('es-AR')}`, icon: <FileText className="w-5 h-5" />, color: '#672B32' },
        ]);
      } catch {
        // Mantener valores por defecto si Supabase no está disponible
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((s, i) => (
        <div key={i} className="bg-white p-6 rounded-2xl border border-[#4A071D]/20 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#211916]/60">{s.label}</p>
              <p className="text-2xl font-serif font-bold text-[#24130E]">{s.value}</p>
            </div>
            <div className={`w-10 h-10 rounded-xl bg-[#4A071D]/10 flex items-center justify-center text-[#4A071D]`}>
              {s.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
