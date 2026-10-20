import { useState } from 'react';
import { ArrowLeft, Users, CreditCard, FileText, ShieldAlert, LogOut } from 'lucide-react';

interface AdminDashboardViewProps {
  onNavigate: (path: string) => void;
}

export default function AdminDashboardView({ onNavigate }: AdminDashboardViewProps) {
  const [activeTab, setActiveTab] = useState<'resumen' | 'invitados' | 'pagos' | 'configuracion'>('resumen');

  const stats = [
    { label: 'Grupos registrados', value: '0', icon: <Users className="w-5 h-5" /> },
    { label: 'Asistentes totales', value: '0', icon: <CreditCard className="w-5 h-5" /> },
    { label: 'Confirmados', value: '0', icon: <ShieldAlert className="w-5 h-5" /> },
    { label: 'Pagos verificados', value: '$0', icon: <FileText className="w-5 h-5" /> },
  ];

  return (
    <section className="min-h-screen bg-zinc-50 px-6 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <button
              onClick={() => onNavigate('/')}
              className="flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-amber-900 mb-4"
            >
              <ArrowLeft className="w-4 h-4" /> Volver a la tarjeta
            </button>
            <h1 className="text-2xl font-serif font-bold text-zinc-900">Panel de administración</h1>
          </div>
          <button
            onClick={() => onNavigate('/login-admin')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-900 rounded-lg hover:bg-amber-800 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Cerrar sesión
          </button>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((s) => (
            <div key={s.label} className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500">{s.label}</p>
                  <p className="text-2xl font-bold text-zinc-900">{s.value}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-900">
                  {s.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-zinc-200 mb-8">
          {[
            { key: 'resumen' as const, label: 'Resumen' },
            { key: 'invitados' as const, label: 'Invitados' },
            { key: 'pagos' as const, label: 'Pagos' },
            { key: 'configuracion' as const, label: 'Configuración' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-amber-900 text-amber-900'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-8 min-h-[400px]">
          {activeTab === 'resumen' && (
            <div>
              <h2 className="font-serif text-xl font-bold text-zinc-900 mb-6">Resumen general</h2>
              <p className="text-zinc-500">No hay datos registrados todavía. Las confirmaciones aparecerán aquí cuando los invitados completen el formulario.</p>
            </div>
          )}
          {activeTab === 'invitados' && (
            <div>
              <h2 className="font-serif text-xl font-bold text-zinc-900 mb-6">Gestión de invitados</h2>
              <p className="text-zinc-500">Lista de grupos y asistentes registrados.</p>
            </div>
          )}
          {activeTab === 'pagos' && (
            <div>
              <h2 className="font-serif text-xl font-bold text-zinc-900 mb-6">Gestión de pagos</h2>
              <p className="text-zinc-500">Avisos de pago informados y verificaciones administrativas.</p>
            </div>
          )}
          {activeTab === 'configuracion' && (
            <div>
              <h2 className="font-serif text-xl font-bold text-zinc-900 mb-6">Configuración del evento</h2>
              <p className="text-zinc-500">Fecha, ubicación, textos, precios y rangos de edad.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
