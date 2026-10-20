import { ArrowRight, Calendar, MapPin, Heart } from 'lucide-react';

interface HomeViewProps {
  onNavigate: (path: string) => void;
}

export default function HomeView({ onNavigate }: HomeViewProps) {
  return (
    <section className="relative min-h-screen flex items-center justify-center bg-zinc-50 overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute top-0 left-0 w-full h-full -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-amber-200 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-amber-100 rounded-full blur-3xl opacity-50" />
      </div>

      <div className="px-6 text-center max-w-3xl">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 text-amber-900 text-xs font-semibold uppercase tracking-wider mb-8 animate-bounce">
          <Heart className="w-4 h-4" /> Save the date
        </div>

        <h1 className="text-5xl md:text-7xl font-serif font-bold text-amber-900 mb-6 leading-tight">
          Esteban<span className="block text-transparent bg-clip-text bg-gradient-to-r from-amber-900 to-amber-600">&</span> Priscila
        </h1>

        <p className="text-lg md:text-xl text-zinc-600 mb-10 font-light leading-relaxed">
          Te invitamos a celebrar nuestro casamiento. Confirmá tu asistencia y acompáñanos en este día especial.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center mb-12">
          <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-sm">
            <Calendar className="w-8 h-8 text-amber-900 mx-auto mb-3" />
            <h3 className="font-serif text-xl font-semibold text-zinc-900 mb-2">Fecha</h3>
            <p className="text-sm text-zinc-500">Por confirmar — Canva</p>
          </div>
          <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-sm">
            <MapPin className="w-8 h-8 text-amber-900 mx-auto mb-3" />
            <h3 className="font-serif text-xl font-semibold text-zinc-900 mb-2">Ubicación</h3>
            <p className="text-sm text-zinc-500">Por confirmar — Canva</p>
          </div>
          <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-sm">
            <div className="w-8 h-8 text-amber-900 mx-auto mb-3 flex items-center justify-center">💍</div>
            <h3 className="font-serif text-xl font-semibold text-zinc-900 mb-2">Ceremonia</h3>
            <p className="text-sm text-zinc-500">Por confirmar — Canva</p>
          </div>
        </div>

        <button
          onClick={() => onNavigate('/confirmacion')}
          className="px-8 py-4 text-lg font-semibold text-white bg-amber-900 rounded-full hover:bg-amber-800 transition-colors shadow-lg hover:shadow-amber-200/50"
        >
          Confirmar asistencia <ArrowRight className="w-5 h-5 ml-2" />
        </button>

        <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center text-sm text-zinc-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-amber-900" /> Confirmá antes de la fecha límite
          </span>
          <span>•</span>
          <span>Precios según edad y horario de incorporación</span>
        </div>
      </div>
    </section>
  );
}
