import { useEffect, useState } from 'react';
import { ArrowRight, CalendarDays, ClipboardCheck, MapPin } from 'lucide-react';
import RevealText from './RevealText';
import { DEFAULT_INVITATION_CONTENT } from '../domain/invitation-content';
import type { InvitationContent } from '../domain/invitation-content';
import {
  getPublicInvitation,
} from '../lib/data-service';
import { isAppsScriptEndpointConfigured } from '../lib/apps-script-client';
import {
  DEFAULT_PUBLIC_EVENT_CONFIG,
  formatWeddingDate,
  resolvePublicEventConfig,
  weddingCountdownTimestamp,
} from '../domain/event-config';
import type { PublicEventConfig } from '../domain/event-config';
import type { PriceRule } from '../types';

interface HomeViewProps {
  onNavigate: (path: string) => void;
}

function getCountdown(config: PublicEventConfig) {
  const remaining = Math.max(0, weddingCountdownTimestamp(config) - Date.now());
  return [
    { value: Math.floor(remaining / (1000 * 60 * 60 * 24)), label: 'DÍAS' },
    { value: Math.floor((remaining / (1000 * 60 * 60)) % 24), label: 'HORAS' },
    { value: Math.floor((remaining / (1000 * 60)) % 60), label: 'MIN' },
    { value: Math.floor((remaining / 1000) % 60), label: 'SEG' },
  ];
}

export default function HomeView({ onNavigate }: HomeViewProps) {
  const [eventConfig, setEventConfig] = useState(DEFAULT_PUBLIC_EVENT_CONFIG);
  const [countdown, setCountdown] = useState(() => getCountdown(DEFAULT_PUBLIC_EVENT_CONFIG));
  const [pricingRules, setPricingRules] = useState<PriceRule[]>([]);
  const [pricingError, setPricingError] = useState(false);
  const [pricingLoading, setPricingLoading] = useState(true);
  const [content, setContent] = useState<InvitationContent>(DEFAULT_INVITATION_CONTENT);
  const [contentError, setContentError] = useState(false);
  const [eventConfigError, setEventConfigError] = useState(false);

  useEffect(() => {
    if (!isAppsScriptEndpointConfigured) {
      setPricingLoading(false);
      setPricingError(true);
      setEventConfigError(true);
      setContentError(true);
      return;
    }
    let active = true;
    void getPublicInvitation().then(
      (invitation) => {
        if (!active) return;
        setEventConfig(resolvePublicEventConfig(invitation.eventConfig));
        setEventConfigError(false);
        if (invitation.invitationContent) setContent(invitation.invitationContent);
        else setContentError(true);
        setPricingRules(invitation.pricingRules);
        setPricingError(invitation.pricingRules.length === 0);
        setPricingLoading(false);
      },
      (error: unknown) => {
        if (!active) return;
        console.error('Error al cargar la invitación pública:', error);
        setEventConfigError(true);
        setContentError(true);
        setPricingError(true);
        setPricingLoading(false);
      }
    );

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const updateCountdown = () => setCountdown(getCountdown(eventConfig));
    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [eventConfig]);

  const sortedPricingRules = ['adulto', 'nino', 'post-almuerzo', 'bebe']
    .map((category) => pricingRules.find((rule) => rule.category === category))
    .filter((rule): rule is PriceRule => Boolean(rule));
  const formatPrice = (rule: PriceRule) =>
    Number(rule.price) === 0
      ? 'Sin cargo'
      : new Intl.NumberFormat('es-AR', {
          style: 'currency',
          currency: rule.currency,
          maximumFractionDigits: 0,
        }).format(Number(rule.price));
  const eventDateLong = formatWeddingDate(eventConfig.event_date, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const rsvpDeadline = formatWeddingDate(eventConfig.rsvp_deadline, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const [eventYear, eventMonth, eventDay] = eventConfig.event_date.split('-');
  const eventDateShort = `${eventDay}.${eventMonth}.${eventYear.slice(-2)}`;

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
      <section className="wedding-hero" aria-labelledby="event-date-heading">
        <div className="wedding-hero__composition">
          <div className="wedding-hero__message">
            <span className="wedding-eyebrow">INFORMACIÓN DEL EVENTO</span>
            <h1 id="event-date-heading">26 de septiembre <span>de 2027.</span></h1>
            <p>Confirmá tu asistencia y consultá los datos importantes para acompañarnos.</p>
            <button className="wedding-button wedding-hero__button" onClick={() => onNavigate('/confirmacion')}>
              Confirmar asistencia <ArrowRight size={17} />
            </button>
          </div>
          <div className="wedding-hero__visual" aria-label="Registro e información del evento">
            <div className="wedding-hero__visual-card wedding-hero__visual-card--main">
              <span className="wedding-hero__visual-icon"><ClipboardCheck aria-hidden="true" /></span>
              <span className="wedding-hero__visual-copy">
                <strong>Registro de asistencia</strong>
                <span>Confirmá quiénes te acompañan</span>
              </span>
            </div>
            <div className="wedding-hero__visual-card">
              <CalendarDays aria-hidden="true" />
              <span>Recepción y ceremonia</span>
            </div>
            <div className="wedding-hero__visual-card">
              <MapPin aria-hidden="true" />
              <span>Ubicación y cómo llegar</span>
            </div>
          </div>
        </div>
      </section>

      <section id="invitacion" className="wedding-invitation paper-texture">
        {contentError && (
          <p role="status" className="wedding-content-fallback">
            No pudimos cargar una actualización de la invitación. Se muestra la versión incorporada.
          </p>
        )}
        {eventConfigError && (
          <p role="status" className="wedding-content-fallback">
            No pudimos cargar la configuración del evento. Se muestran los datos incorporados.
          </p>
        )}
        <RevealText as="h2" className="wedding-countdown__title" text="Cuenta regresiva" />
        <div className="wedding-countdown" aria-label="Cuenta regresiva">
          {countdown.map((part) => (
            <div className="wedding-countdown__item" key={part.label}>
              <span className="wedding-countdown__number">{part.value.toString().padStart(2, '0')}</span>
              <small className="wedding-countdown__unit">{part.label}</small>
            </div>
          ))}
        </div>
      </section>

      <section id="detalles" className="wedding-details paper-texture" aria-labelledby="detalles-heading">
        <div className="wedding-details__composition">
          <div className="wedding-details__content">
            <RevealText
              as="h2"
              id="detalles-heading"
              className="wedding-display wedding-details__title"
              text={eventDateShort}
            />
            <div className="wedding-details__info">
              <article className="wedding-detail-card">
                <img className="wedding-detail__icon" src="/images/recuperados/ornamentos/icono-calendario.svg" alt="" aria-hidden="true" data-reveal />
                <h3>Recepción</h3>
                {eventConfig.reception_name && <p>{eventConfig.reception_name}</p>}
                <p>{eventDateLong}</p>
                {eventConfig.reception_address && <p>{eventConfig.reception_address}</p>}
                <strong>{eventConfig.reception_time} hs</strong>
              </article>
              <article className="wedding-detail-card">
                <img className="wedding-detail__icon" src="/images/recuperados/ornamentos/icono-reloj.svg" alt="" aria-hidden="true" data-reveal />
                <h3>Ceremonia</h3>
                {eventConfig.ceremony_name && <p>{eventConfig.ceremony_name}</p>}
                {eventConfig.ceremony_address && <p>{eventConfig.ceremony_address}</p>}
                <p>{eventConfig.ceremony_time} hs</p>
              </article>
              <article className="wedding-detail-card">
                <img className="wedding-detail__icon" src="/images/recuperados/ornamentos/icono-ubicacion.svg" alt="" aria-hidden="true" data-reveal />
                <h3>{eventConfig.venue_name}</h3>
                <p>{eventConfig.venue_address}</p>
                <strong>Finaliza {eventConfig.event_end_time} hs</strong>
              </article>
            </div>
            <a className="wedding-button wedding-button--light wedding-details__como-llegar" href={eventConfig.directions_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${eventConfig.venue_name}, ${eventConfig.venue_address}`)}`} target="_blank" rel="noopener noreferrer">
              ¿Cómo llegar?
            </a>
          </div>
        </div>
      </section>

      <section id="rsvp" className="wedding-rsvp" aria-labelledby="rsvp-heading">
        <img className="wedding-rsvp__icon" src="/images/recuperados/ornamentos/icono-asistencia.svg" alt="" aria-hidden="true" data-reveal />
        <span className="wedding-eyebrow wedding-eyebrow--light">ASISTENCIA</span>
        <RevealText id="rsvp-heading" className="wedding-display wedding-display--light" text={content.rsvp_title} />
        <p className="wedding-rsvp__copy">Hasta el {rsvpDeadline}.</p>
        <button className="wedding-button wedding-button--light" onClick={() => onNavigate('/confirmacion')}>
          Registro de asistencia <ArrowRight size={17} />
        </button>
      </section>

      <section className="wedding-dress-code" aria-labelledby="dress-code-heading">
        <img src="/images/recuperados/ornamentos/icono-traje.svg" alt="" aria-hidden="true" />
        <RevealText as="h2" id="dress-code-heading" text="DRESS CODE" />
        <p>{eventConfig.dress_code}</p>
      </section>

      <section id="precios" className="wedding-prices paper-texture" aria-labelledby="precios-heading">
        <RevealText as="h2" id="precios-heading" className="wedding-display" text="Tarjetas" />
        {pricingLoading && <p role="status">Cargando precios vigentes…</p>}
        {!pricingLoading && pricingError && (
          <p role="status" className="wedding-content-fallback">
            No se pudieron cargar los precios vigentes. Consultá antes de transferir.
          </p>
        )}
        {!pricingLoading && !pricingError && (
          <dl className="wedding-prices__list">
            {sortedPricingRules.map((rule) => (
              <div className="wedding-prices__item" key={rule.id}>
                <dt>{rule.category === 'bebe'
                  ? 'Menores de 2 años'
                  : rule.category === 'nino'
                    ? `Niños de ${rule.min_age} a ${rule.max_age} años`
                    : rule.label}</dt>
                <dd>{formatPrice(rule)}</dd>
              </div>
            ))}
          </dl>
        )}
        <p className="wedding-prices__note">Los valores se actualizarán según el (IPC). Antes de transferir, verificá el precio vigente en esta sección.</p>
      </section>

      {eventConfig.bank_details && (
        <section className="wedding-bank-details" aria-label="Datos para transferencia">
          <dl>
            <div><dt>Alias:</dt><dd>{eventConfig.bank_details.alias}</dd></div>
            <div><dt>Nombre:</dt><dd>{eventConfig.bank_details.holder}</dd></div>
            <div><dt>Banco:</dt><dd>{eventConfig.bank_details.bank}</dd></div>
          </dl>
        </section>
      )}

      <footer className="wedding-footer paper-texture" id="footer">
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
            <a href="/login-admin" className="wedding-footer__admin">Administración</a>
          </div>
        </div>
        <p className="wedding-footer__closing">¡Te esperamos!</p>
      </footer>
    </div>
  );
}
