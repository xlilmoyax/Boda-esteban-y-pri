import { ArrowRight, Calendar, MapPin, Music2 } from 'lucide-react';

interface HomeViewProps {
  onNavigate: (path: string) => void;
}

export default function HomeView({ onNavigate }: HomeViewProps) {
  const eventDate = new Date('2027-09-26T13:30:00-03:00');
  const now = new Date();

  // Contador regresivo
  const diffMs = eventDate.getTime() - now.getTime();
  const diffDays = diffMs > 0 ? Math.floor(diffMs / (1000 * 60 * 60 * 24)) : 0;
  const diffHours = diffMs > 0 ? Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)) : 0;
  const diffMinutes = diffMs > 0 ? Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)) : 0;
  const diffSeconds = diffMs > 0 ? Math.floor((diffMs % (1000 * 60)) / 1000) : 0;

  return (
    <section className="relative min-h-screen flex items-center justify-center bg-[#F3F0EB] overflow-hidden">
      {/* Decorative elements - marfil/bordó */}
      <div className="absolute top-0 left-0 w-full h-full -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[#4A071D]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-[#672B32]/10 rounded-full blur-3xl" />
      </div>

      <div className="px-6 text-center max-w-2xl">
        {/* Sello de cera dorado */}
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-[#B8860B] rounded-full flex items-center justify-center shadow-lg border-4 border-[#F3F0EB]">
            <div className="w-8 h-8 border-4 border-[#F3F0EB] rounded-full" />
          </div>
        </div>

        <h1 className="text-5xl md:text-7xl font-serif font-italic text-[#24130E] mb-2 leading-tight">
          Esteban
        </h1>
        <h1 className="text-5xl md:text-7xl font-serif font-italic text-[#24130E] mb-6 leading-tight">
          <span className="text-[#4A071D]">&</span> Priscila
        </h1>

        <p className="text-lg md:text-xl text-[#211916] mb-10 font-light leading-relaxed">
          Te invitamos a celebrar nuestro casamiento. Confirmá tu asistencia y acompáñanos en este día especial.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center mb-12">
          <div className="p-6 rounded-2xl bg-white border border-[#4A071D]/20 shadow-sm">
            <Calendar className="w-8 h-8 text-[#4A071D] mx-auto mb-3" />
            <h3 className="font-serif text-xl font-bold text-[#24130E] mb-2">Fecha</h3>
            <p className="text-sm text-[#211916]">26 de septiembre de 2027</p>
          </div>
          <div className="p-6 rounded-2xl bg-white border border-[#4A071D]/20 shadow-sm">
            <MapPin className="w-8 h-8 text-[#4A071D] mx-auto mb-3" />
            <h3 className="font-serif text-xl font-bold text-[#24130E] mb-2">Recepción</h3>
            <p className="text-sm text-[#211916]">13:30 hs — BOLGHERT</p>
          </div>
          <div className="p-6 rounded-2xl bg-white border border-[#4A071D]/20 shadow-sm">
            <div className="w-8 h-8 text-[#4A071D] mx-auto mb-3 flex items-center justify-center">📍</div>
            <h3 className="font-serif text-xl font-bold text-[#24130E] mb-2">Ubicación</h3>
            <p className="text-sm text-[#211916]">Santiago Derqui 703, Villa Allende</p>
          </div>
        </div>

        {/* Contador regresivo */}
        <div className="flex justify-center gap-4 mb-12">
          {[diffDays, diffHours, diffMinutes, diffSeconds].map((value, i) => (
            <div key={i} className="flex flex-col items-center">
              <span className="text-3xl font-serif font-bold text-[#4A071D]">{value}</span>
              <span className="text-xs text-[#672B32] uppercase tracking-wider">
                {i === 0 ? 'días' : i === 1 ? 'hs' : i === 2 ? 'min' : 'seg'}
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={() => onNavigate('/confirmacion')}
          className="px-8 py-4 text-lg font-semibold text-white bg-[#4A071D] rounded-full hover:bg-[#672B32] transition-colors shadow-lg"
        >
          Confirmar asistencia <ArrowRight className="w-5 h-5 ml-2" />
        </button>

        <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center text-sm text-[#211916]">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-[#4A071D]" /> Confirmá antes del 20 de septiembre de 2027
          </span>
          <span>•</span>
          <span>Vestimenta elegante</span>
        </div>

        {/* Música */}
        <div className="mt-12">
          <button
            className="flex items-center gap-2 text-sm text-[#672B32] hover:text-[#4A071D] transition-colors"
            aria-label="Control de música"
          >
            <Music2 className="w-4 h-4" /> Música de fondo
          </button>
        </div>
      </div>
    </section>
  );
}
