/**
 * Panel administrativo conectado al servicio configurado para la aplicación.
 */

import { useState } from 'react';
import { ArrowLeft, LogOut } from 'lucide-react';
import DashboardResume from './admin/DashboardResume';
import GuestList from './admin/GuestList';
import BalancesView from './admin/PaymentsView';
import EventConfig from './admin/EventConfigView';
import AuditLogView from './admin/AuditLogView';
import CSVExport from './admin/CSVExport';
import AdminProfilesView from './admin/AdminProfilesView';
import { signOutAdmin } from '../lib/data-service';

type AdminTab =
  | 'resumen'
  | 'invitados'
  | 'saldos'
  | 'configuracion'
  | 'auditoria'
  | 'exportacion'
  | 'administradores';

const TABS: Array<{ key: AdminTab; label: string }> = [
  { key: 'resumen', label: 'Resumen' },
  { key: 'invitados', label: 'Invitados' },
  { key: 'saldos', label: 'Saldos' },
  { key: 'configuracion', label: 'Configuración' },
  { key: 'auditoria', label: 'Auditoría' },
  { key: 'exportacion', label: 'Exportar CSV' },
  { key: 'administradores', label: 'Administradores' },
];

interface AdminDashboardViewProps {
  onNavigate: (path: string) => void;
  currentAdminId: string | null;
  currentAdminRole: 'owner' | 'editor' | null;
}

export default function AdminDashboardView({ onNavigate, currentAdminId, currentAdminRole }: AdminDashboardViewProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('resumen');
  const [logoutError, setLogoutError] = useState<string | null>(null);

  if (!currentAdminId || !currentAdminRole) {
    return (
      <section role="status" className="mx-auto max-w-xl px-6 py-24 text-center">
        Validando el perfil administrativo…
      </section>
    );
  }

  const handleSignOut = async () => {
    setLogoutError(null);
    try {
      await signOutAdmin();
      onNavigate('/login-admin');
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : 'No se pudo cerrar la sesión.');
    }
  };

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
          onClick={() => void handleSignOut()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#4A071D] rounded-lg hover:bg-[#672B32] transition-colors"
          >
            <LogOut className="w-4 h-4" /> Cerrar sesión
          </button>
        </div>
        {logoutError && <p role="alert" className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{logoutError}</p>}

        <nav className="mb-8 flex gap-1 overflow-x-auto border-b border-[#4A071D]/10" aria-label="Secciones del panel">
          {TABS.filter((tab) => tab.key !== 'administradores' || currentAdminRole === 'owner').map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              aria-current={activeTab === tab.key ? 'page' : undefined}
              className={`shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-[#4A071D] text-[#4A071D]'
                  : 'border-transparent text-[#211916]/50 hover:bg-[#F3F0EB]/50 hover:text-[#4A071D]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="mt-8">
          {activeTab === 'resumen' && <DashboardResume />}
          {activeTab === 'invitados' && (
            <GuestList onOpenFamily={(id) => onNavigate(`/dashboard-admin/guest/${id}`)} />
          )}
          {activeTab === 'saldos' && (
            <BalancesView onOpenFamily={(id) => onNavigate(`/dashboard-admin/guest/${id}`)} />
          )}
          {activeTab === 'configuracion' && (
            <EventConfig currentAdminRole={currentAdminRole} currentAdminId={currentAdminId} />
          )}
          {activeTab === 'auditoria' && <AuditLogView />}
          {activeTab === 'exportacion' && <CSVExport />}
          {activeTab === 'administradores' && currentAdminRole === 'owner' && <AdminProfilesView />}
        </div>
      </div>
    </section>
  );
}
