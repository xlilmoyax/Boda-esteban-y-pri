import { Home } from 'lucide-react';

interface NotFoundViewProps {
  onNavigate: (path: string) => void;
}

export default function NotFoundView({ onNavigate }: NotFoundViewProps) {
  return (
    <section className="min-h-screen flex items-center justify-center bg-zinc-50 px-6">
      <div className="text-center">
        <div className="text-6xl mb-6">404</div>
        <h2 className="text-2xl font-serif font-bold text-zinc-900 mb-3">Página no encontrada</h2>
        <p className="text-zinc-600 mb-8">La página que buscás no existe.</p>
        <button
          onClick={() => onNavigate('/')}
          className="px-6 py-3 text-sm font-semibold text-white bg-amber-900 rounded-full hover:bg-amber-800 transition-colors flex items-center justify-center gap-2 mx-auto"
        >
          <Home className="w-4 h-4" /> Volver al inicio
        </button>
      </div>
    </section>
  );
}
