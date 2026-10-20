/**
 * Panel administrativo completo para la tarjeta de casamiento.
 * Incluye: Resumen, Invitados (CRUD), Pagos, Configuración (precios editables), Auditoría y Exportación CSV.
 * Todas las operaciones requieren autenticación de admin y respetan RLS.
 */

import { useState } from 'react';
import { ArrowLeft, LogOut } from 'lucide-react';
import DashboardResume from './admin/DashboardResume';
import GuestList from './admin/GuestList';
import PaymentsView from './admin/PaymentsView';
import EventConfig from './admin/EventConfigView';
import AuditLogView from './admin/AuditLogView';
import CSVExport from './admin/CSVExport';

interface AdminDashboardViewProps {
  onNavigate: (path: string) => void;
  currentAdminId: string | null;
}

export default function AdminDashboardView({ onNavigate, currentAdminId }: AdminDashboardViewProps) {
  const [activeTab, setActiveTab] = useState<'resumen' | 'invitados' | 'pagos' | 'configuracion' | 'auditoria' | 'exportacion'>('resumen');

  return (
    <section className="min-h-screen bg-[#F3F0EB] px-6 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <button
              onClick={() => onNavigate('/')}
              className="flex items-center gap-2 text-sm font-medium text-[#211916]/60 hover:text-[#4A071D] mb-4"
            >
              <ArrowLeft className="w-4 h-4" /> Volver a la tarjeta
            </button>
            <h1 className="font-serif text-2xl font-bold text-[#24130E]">Panel de administración</h1>
          </div>
          <button
            onClick={() => onNavigate('/login-admin')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#4A071D] rounded-lg hover:bg-[#672B32] transition-colors"
          >
            <LogOut className="w-4 h-4" /> Cerrar sesión
          </button>
        </div>

        {activeTab === 'resumen' && <DashboardResume />}
        {activeTab === 'invitados' && <GuestList currentAdminId={currentAdminId} />}
        {activeTab === 'pagos' && <PaymentsView currentAdminId={currentAdminId} />}
        {activeTab === 'configuracion' && <EventConfig currentAdminId={currentAdminId} />}
        {activeTab === 'auditoria' && <AuditLogView />}
        {activeTab === 'exportacion' && <CSVExport />}
        {activeTab !== 'resumen' && (
          <div className="mt-8 bg-white rounded-2xl border border-[#4A071D]/20 shadow-sm p-8 min-h-[400px]">
            {activeTab === 'invitados' && (
              <>
                <h2 className="font-serif text-xl font-bold text-[#24130E] mb-6">Gestión de Invitados</h2>
                <p className="text-[#211916]/60 mb-4">Lista de grupos y asistentes registrados con búsqueda y filtros.</p>
              </>
            )}
            {activeTab === 'pagos' && (
              <>
                <h2 className="font-serif text-xl font-bold text-[#24130E] mb-6">Gestión de Pagos</h2>
                <p className="text-[#211916]/60 mb-4">Avisos de pago informados, verificación manual y rechazo.</p>
              </>
            )}
            {activeTab === 'configuracion' && (
              <>
                <h2 className="font-serif text-xl font-bold text-[#24130E] mb-6">Configuración del Evento</h2>
                <p className="text-[#211916]/60 mb-4">Fecha, ubicación, precios y datos de transferencia editables.</p>
              </>
            )}
            {activeTab === 'auditoria' && (
              <>
                <h2 className="font-serif text-xl font-bold text-[#24130E] mb-6">Historial de Auditoría</h2>
                <p className="text-[#211916]/60 mb-4">Registro de operaciones administrativas con fecha, hora y responsable.</p>
              </>
            )}
            {activeTab === 'exportacion' && (
              <>
                <h2 className="font-serif text-xl font-bold text-[#24130E] mb-6">Exportación CSV</h2>
                <p className="text-[#211916]/60 mb-4">Descarga de invitados y asistentes con filtros aplicados.</p>
              </>
            )}
          </div>
        )}
        {activeTab === 'resumen' && (
          <div className="flex gap-1 border-b border-[#4A071D]/10 mb-8">
            {[
              { key: 'resumen' as const, label: 'Resumen' },
              { key: 'invitados' as const, label: 'Invitados' },
              { key: 'pagos' as const, label: 'Pagos' },
              { key: 'configuracion' as const, label: 'Configuración' },
              { key: 'auditoria' as const, label: 'Auditoría' },
              { key: 'exportacion' as const, label: 'Exportar CSV' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-[#4A071D] text-[#4A071D]'
                    : 'border-transparent text-[#211916]/50 hover:text-[#4A071D] hover:bg-[#F3F0EB]/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
