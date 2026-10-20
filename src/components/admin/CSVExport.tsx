/**
 * Exportación CSV de invitados y asistentes.
 * Filtros aplicados cuando corresponden. No incluye datos sensibles innecesarios.
 */

import { useState } from 'react';
import { Download, Filter } from 'lucide-react';
import { getGuests } from '../../lib/supabase';

export default function CSVExport() {
  const [loading, setLoading] = useState(false);
  const [exported, setExported] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    attending: 'all' as 'all' | 'si' | 'no',
  });

  const handleExport = async () => {
    setLoading(true);
    try {
      const { guests } = await getGuests({
        search: filters.search || undefined,
        limit: 1000,
      });

      const filtered = guests.filter((g: any) => {
        if (filters.attending === 'si') return g.attending === true;
        if (filters.attending === 'no') return g.attending === false;
        return true;
      });

      const headers = ['Nombre', 'Apellido', 'Teléfono', 'Email', 'Asistencia', 'Fecha Registro'];
      const rows = filtered.map((g) => [
        g.name,
        g.surname,
        g.phone || '',
        g.email || '',
        g.attending === true ? 'Sí' : g.attending === false ? 'No' : 'Pendiente',
        g.created_at.slice(0, 10),
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((r: string[]) => r.map((c: string) => `"${String(c).replace(/"/g, '""')}"`).join(',')),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `invitados-boda-esteban-priscila-${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setExported(true);
      setTimeout(() => setExported(false), 3000);
    } catch (err) {
      alert('Error al exportar CSV: ' + (err instanceof Error ? err.message : 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Download className="w-5 h-5 text-[#4A071D]" />
        <h2 className="font-serif text-xl font-bold text-[#24130E]">Exportación CSV</h2>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-[#4A071D]/20 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex gap-2">
            <div className="relative w-full md:w-80">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#672B32]/40" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Buscar por nombre o apellido..."
                className="w-full px-4 py-2 pl-10 border border-[#672B32]/30 rounded-lg focus:ring-2 focus:ring-[#4A071D] focus:border-[#4A071D] outline-none text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilters({ ...filters, attending: 'all' })}
                className={`px-4 py-2 text-sm font-medium rounded border transition-colors ${
                  filters.attending === 'all'
                    ? 'border-[#4A071D] bg-[#4A071D] text-white'
                    : 'border-[#672B32]/30 text-[#211916] hover:border-[#4A071D]'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilters({ ...filters, attending: 'si' })}
                className={`px-4 py-2 text-sm font-medium rounded border transition-colors ${
                  filters.attending === 'si'
                    ? 'border-[#4A071D] bg-[#4A071D] text-white'
                    : 'border-[#672B32]/30 text-[#211916] hover:border-[#4A071D]'
                }`}
              >
                Confirmados
              </button>
              <button
                onClick={() => setFilters({ ...filters, attending: 'no' })}
                className={`px-4 py-2 text-sm font-medium rounded border transition-colors ${
                  filters.attending === 'no'
                    ? 'border-[#4A071D] bg-[#4A071D] text-white'
                    : 'border-[#672B32]/30 text-[#211916] hover:border-[#4A071D]'
                }`}
              >
                No asisten
              </button>
            </div>
          </div>
          <button
            onClick={handleExport}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#4A071D] rounded-lg hover:bg-[#672B32] disabled:opacity-60 transition-colors"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <Download className="w-4 h-4" />
            )}
            {exported ? '¡Exportado!' : 'Descargar CSV'}
          </button>
        </div>

        <div className="mt-4 p-3 bg-[#F3F0EB]/50 rounded-lg border border-[#4A071D]/10">
          <p className="text-xs text-[#211916]/60">
            El archivo CSV incluye: nombre, apellido, teléfono, email, estado de asistencia y fecha de registro.
            No se incluyen datos sensibles innecesarios ni información de otros invitados.
          </p>
        </div>
      </div>
    </div>
  );
}
