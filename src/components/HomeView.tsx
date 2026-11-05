import { useEffect, useState } from 'react';
import { ArrowRight, Pause, Play } from 'lucide-react';
import RevealText from './RevealText';
import { useWeddingMusic } from './WeddingMusic';

interface HomeViewProps {
  onNavigate: (path: string) => void;
}

const eventDate = new Date('2027-09-26T15:00:00-03:00');

function getCountdown() {
  const remaining = Math.max(0, eventDate.getTime() - Date.now());
  return [
    { value: Math.floor(remaining / (1000 * 60 * 60 * 24)), label: 'DÍAS' },
    { value: Math.floor((remaining / (1000 * 60 * 60)) % 24), label: 'HORAS' },
    { value: Math.floor((remaining / (1000 * 60)) % 60), label: 'MIN' },
    { value: Math.floor((remaining / 1000) % 60), label: 'SEG' },
  ];
}

export default function HomeView({ onNavigate }: HomeViewProps) {
  const [countdown, setCountdown] = useState(getCountdown);
  const { state: musicState, toggle: toggleMusic } = useWeddingMusic();

  useEffect(() => {
    const updateCountdown = () => setCountdown(getCountdown());
    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>('[data-reveal]');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion || !('IntersectionObserver' in window)) {
      elements.forEach((element) => { element.dataset.reveal = 'visible'; });
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        (entry.target as HTMLElement).dataset.reveal = 'visible';
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -32px 0px' });

    elements.forEach((element) => {
      element.dataset.reveal = 'pending';
      observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="wedding-page">
      <section className="wedding-hero" aria-label="Portada de la invitación">
        <div className="wedding-hero__image" />
        <div className="wedding-hero__overlay" />
        <img className="wedding-hero__seal" src="/images/recuperados/originales/wax-seal-original.png" alt="Sello de Esteban y Priscila" />
      </section>

      <section id="invitacion" className="wedding-invitation paper-texture">
        <RevealText as="h1" className="wedding-invitation__names" text="Esteban & Priscila" />
        <span className="wedding-eyebrow wedding-countdown__eyebrow">tiempo restante</span>
        <RevealText className="wedding-countdown__title" text="HASTA EL SÍ." />
        <div className="wedding-countdown" aria-label="Cuenta regresiva">
          {countdown.map((part) => (
            <div className="wedding-countdown__item" key={part.label}>
              <span className="wedding-countdown__number">{part.value.toString().padStart(2, '0')}</span>
              <small className="wedding-countdown__unit">{part.label}</small>
            </div>
          ))}
        </div>
        <section className="wedding-music" aria-labelledby="music-heading">
          <RevealText id="music-heading" className="wedding-music__title" text="Dale play para reproducir nuestra canción" />
          <div className="wedding-music__media" data-reveal>
            <div id="wedding-youtube-player" aria-label="Video musical de Esteban y Priscila" />
            <button
              className="wedding-music__play"
              type="button"
              onClick={toggleMusic}
              disabled={musicState === 'error'}
              aria-label={musicState === 'playing' ? 'Pausar música' : 'Reproducir música'}
              aria-pressed={musicState === 'playing'}
            >
              {musicState === 'playing' ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}
            </button>
          </div>
          <p className="wedding-music__status" role="status" aria-live="polite">
            {musicState === 'playing' && 'Reproduciendo nuestra canción'}
            {musicState === 'loading' && 'Intentando reproducir nuestra canción…'}
            {musicState === 'paused' && 'La canción está en pausa.'}
            {musicState === 'blocked' && 'El navegador bloqueó la reproducción automática. Toca reproducir para activar la música.'}
            {musicState === 'error' && (
              <>No se pudo cargar la canción. <a href="https://youtu.be/q25_mYOSa-Q" target="_blank" rel="noopener noreferrer">Abrir en YouTube</a>.</>
            )}
          </p>
          <img className="wedding-music__rope" src="/images/recuperados/ornamentos/nudo-cuerda.svg" alt="" aria-hidden="true" />
        </section>
      </section>

      <section id="versiculo" className="wedding-verse" aria-labelledby="verse-heading">
        <div className="wedding-verse__ornament" aria-hidden="true"></div>
        <h2 id="verse-heading" className="wedding-verse__title" data-reveal>
          <span>“Mejores son dos que uno.</span>
          <em>Porque si cayeren el uno levantará a su compañero</em>
          <span>Y cordón de tres dobleces no se rompe pronto.”</span>
        </h2>
        <p className="wedding-verse__reference">ECLESIASTÉS 4: 9-12</p>
      </section>

      <section id="detalles" className="wedding-details paper-texture" aria-labelledby="detalles-heading">
        <RevealText as="span" className="wedding-eyebrow wedding-details__eyebrow" text="¡Nos Casamos!" />
        <RevealText id="detalles-heading" className="wedding-display wedding-details__title" text="26.09.27" />
        <p className="wedding-details__intro">Estás cordialmente invitado a celebrar nuestra unión junto a nosotros.</p>
        <div className="wedding-details__content">
          <div className="wedding-details__info">
            <article className="wedding-detail-card">
              <img className="wedding-detail__icon" src="/images/recuperados/ornamentos/icono-calendario.svg" alt="" aria-hidden="true" data-reveal />
              <h3>Recepción</h3>
              <p>Domingo 26 de septiembre de 2027</p>
              <strong>15:00 hs</strong>
            </article>
            <article className="wedding-detail-card">
              <img className="wedding-detail__icon" src="/images/recuperados/ornamentos/icono-reloj.svg" alt="" aria-hidden="true" data-reveal />
              <h3>Ceremonia</h3>
              <p>16:00 hs</p>
              <strong></strong>
            </article>
            <article className="wedding-detail-card">
              <img className="wedding-detail__icon" src="/images/recuperados/ornamentos/icono-ubicacion.svg" alt="" aria-hidden="true" data-reveal />
              <h3>BOLGHERT</h3>
              <p>Santiago Derqui 703<br />Villa Allende</p>
              <strong>Finaliza 23:00 hs</strong>
            </article>
          </div>
          <a className="wedding-button wedding-button--light wedding-details__como-llegar" href="https://www.google.com/maps/search/?api=1&query=BOLGHERT%2C+Santiago+Derqui+703%2C+Villa+Allende" target="_blank" rel="noopener noreferrer">
            ¿Cómo llegar?
          </a>
        </div>
      </section>

      <section id="historia" className="wedding-history" aria-labelledby="historia-heading">
        <div className="wedding-history__moment">
          <div className="wedding-history__moment-content">
            <RevealText id="historia-heading" className="wedding-history__moment-title" text="Un encuentro casual" />
            <p className="wedding-history__moment-copy">
              Con la bendición de Dios y el amor como guía, comenzó nuestra historia. Ya nos conocíamos de vista, entre un “hola” y un “chau”, pero fue aquella tarde, al salir de la Escuela de Policía, cuando Dios cruzó nuestros caminos de una manera inesperada. Un viaje, un gesto y un nombre revelado… y así comenzó lo que Él ya había escrito para nosotros.
            </p>
          </div>
          <div className="wedding-history__moment-photos">
            <figure className="wedding-history__photo wedding-history__photo--tilted-left" data-reveal>
              <img src="/images/recuperados/originales/historia-foto-1.jpg" alt="Esteban y Priscila en su encuentro casual" />
              <img className="wedding-history__clip" src="/images/recuperados/ornamentos/clip-papeleria.svg" alt="" aria-hidden="true" />
            </figure>
            <figure className="wedding-history__photo wedding-history__photo--tilted-right" data-reveal>
              <img src="/images/recuperados/originales/historia-foto-2.jpg" alt="Esteban y Priscila al comienzo de su historia" />
              <img className="wedding-history__clip" src="/images/recuperados/ornamentos/clip-papeleria.svg" alt="" aria-hidden="true" />
            </figure>
          </div>
        </div>

        <div className="wedding-history__moment">
          <div className="wedding-history__moment-content">
            <RevealText id="historia-heading" className="wedding-history__moment-title" text="Un amor que eligió quedarse" />
            <p className="wedding-history__moment-copy">
              Aunque la vida nos puso a prueba y hubo momentos en los que parecía que todo estaba perdido, este amor siempre encontró la manera de permanecer. Porque, incluso cuando todo parecía llevarnos por caminos diferentes, entre todas las posibilidades, siempre encontramos una razón para volver a elegirnos.
            </p>
          </div>
          <div className="wedding-history__moment-photos">
            <figure className="wedding-history__photo wedding-history__photo--main" data-reveal>
              <img src="/images/recuperados/originales/historia-foto-3.jpg" alt="Esteban y Priscila eligiéndose una vez más" />
              <img className="wedding-history__clip" src="/images/recuperados/ornamentos/clip-papeleria.svg" alt="" aria-hidden="true" />
            </figure>
            <figure className="wedding-history__photo wedding-history__photo--tilted-left" data-reveal>
              <img src="/images/recuperados/originales/historia-foto-5.jpg" alt="Un recuerdo de Esteban y Priscila juntos" />
              <img className="wedding-history__clip" src="/images/recuperados/ornamentos/clip-papeleria.svg" alt="" aria-hidden="true" />
            </figure>
          </div>
        </div>

        <div className="wedding-history__moment">
          <div className="wedding-history__moment-content">
            <p className="wedding-history__handwritten">Que se volvió</p>
            <h2 className="wedding-history__moment-title">Una promesa para siempre</h2>
            <p className="wedding-history__moment-copy">
              Primero amigos, luego novios y hoy, de la mano de Dios, elegimos ser uno para siempre y prometernos una vida juntos. Con el corazón lleno de amor y alegría, los invitamos a celebrar el comienzo de nuestra vida.
            </p>
            <p className="wedding-history__couple">Esteban y Priscila</p>
          </div>
          <div className="wedding-history__moment-photos">
            <div className="wedding-history__aves">
              <img src="/images/recuperados/originales/ornamento-fondo-3.png" alt="" aria-hidden="true" />
            </div>
            <figure className="wedding-history__photo wedding-history__photo--main" data-reveal>
              <img src="/images/recuperados/originales/historia-foto-4.jpg" alt="Esteban y Priscila celebrando su compromiso" />
              <img className="wedding-history__clip" src="/images/recuperados/ornamentos/clip-papeleria.svg" alt="" aria-hidden="true" />
            </figure>
            <figure className="wedding-history__photo wedding-history__photo--tilted-right" data-reveal>
              <img src="/images/recuperados/originales/historia-foto-6.jpg" alt="Un momento especial de Esteban y Priscila" />
              <img className="wedding-history__clip" src="/images/recuperados/ornamentos/clip-papeleria.svg" alt="" aria-hidden="true" />
            </figure>
          </div>
        </div>
      </section>

      <section id="rsvp" className="wedding-rsvp" aria-labelledby="rsvp-heading">
        <img className="wedding-rsvp__icon" src="/images/recuperados/ornamentos/icono-asistencia.svg" alt="" aria-hidden="true" data-reveal />
        <span className="wedding-eyebrow wedding-eyebrow--light">ASISTENCIA</span>
        <RevealText id="rsvp-heading" className="wedding-display wedding-display--light" text="Confirma tu presencia" />
        <p className="wedding-rsvp__copy">Hasta el 11 de septiembre de 2027.</p>
        <button className="wedding-button wedding-button--light" onClick={() => onNavigate('/confirmacion')}>
          Registro de asistencia <ArrowRight size={17} />
        </button>
      </section>

      <section className="wedding-dress-code" aria-labelledby="dress-code-heading">
        <img src="/images/recuperados/ornamentos/icono-traje.svg" alt="" aria-hidden="true" />
        <RevealText as="h2" id="dress-code-heading" text="DRESS CODE" />
        <p>Elegante</p>
      </section>

      <section id="regalos" className="wedding-gifts" aria-labelledby="regalos-heading">
        <img className="wedding-gifts__icon" src="/images/recuperados/ornamentos/icono-regalo.svg" alt="" aria-hidden="true" />
        <RevealText as="h2" id="regalos-heading" className="wedding-display" text="REGALOS" />
        <ul className="wedding-gifts__list">
          <li><span aria-hidden="true">○○</span> Presencial en el casamiento</li>
          <li><span aria-hidden="true">○○</span> Transferencia</li>
        </ul>
      </section>

      <section className="wedding-registration paper-texture" aria-labelledby="registration-heading">
        <h2 id="registration-heading">Registro de asistencia</h2>
        <p>Registrá tu asistencia aquí por favor</p>
        <button className="wedding-button wedding-button--light" onClick={() => onNavigate('/confirmacion')}>
          Completar formulario <ArrowRight size={17} />
        </button>
      </section>

      <section id="precios" className="wedding-prices paper-texture" aria-labelledby="precios-heading">
        <RevealText as="h2" id="precios-heading" className="wedding-display" text="Tarjetas" />
        <dl className="wedding-prices__list">
          <div className="wedding-prices__item">
            <dt>Adultos</dt>
            <dd>$130.000</dd>
          </div>
          <div className="wedding-prices__item">
            <dt>Niños de 2 a 10 años</dt>
            <dd>$50.000</dd>
          </div>
          <div className="wedding-prices__item">
            <dt>Después del almuerzo</dt>
            <dd>$70.000</dd>
          </div>
          <div className="wedding-prices__item">
            <dt>Bebés de 0 a 1 año</dt>
            <dd>Sin cargo</dd>
          </div>
        </dl>
        <p className="wedding-prices__note">Los valores se actualizarán según el (IPC). Antes de transferir, verificá el precio vigente en esta sección.</p>
      </section>

      <section className="wedding-bank-details" aria-label="Datos para transferencia">
        <dl>
          <div><dt>Alias:</dt><dd>bodatebypri.bbnk</dd></div>
          <div><dt>CVU:</dt><dd>1430001713010373680017</dd></div>
          <div><dt>Nombre:</dt><dd>Moya Priscila Abigail</dd></div>
          <div><dt>Cuenta:</dt><dd>Brubank</dd></div>
        </dl>
      </section>

      <footer className="wedding-footer paper-texture" id="footer">
        <div className="wedding-footer__banner">
          <img className="wedding-footer__photo" src="/images/recuperados/originales/ornamento-movil-2.png" alt="Esteban y Priscila compartiendo un momento juntos" />
          <div className="wedding-footer__message">
            <p>¡NOSOTROS NO PODEMOS ESPERAR</p>
            <span>a compartir este momento con vos!</span>
          </div>
        </div>
        <div className="wedding-footer__contacts">
          <h2>CONTÁCTATE<br />CON NOSOTROS</h2>
          <div className="wedding-footer__contact">
            <h3>Novio</h3>
            <a href="tel:+543516617692">351 661 7692</a>
            <a href="mailto:ep402768@gmail.com">ep402768@gmail.com</a>
          </div>
          <div className="wedding-footer__contact">
            <h3>Novia</h3>
            <a href="tel:+543512053680">351 205 3680</a>
            <a href="mailto:iampriscilamoya1@gmail.com">iampriscilamoya1@gmail.com</a>
          </div>
          <div className="wedding-footer__welcome">
            <h2>¡Te esperamos!</h2>
            <a href="/login-admin" className="wedding-footer__admin">Administración</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
