export interface PublicEventConfig {
  event_date: string;
  reception_time: string;
  reception_name: string;
  reception_address: string;
  ceremony_time: string;
  ceremony_name: string;
  ceremony_address: string;
  event_end_time: string;
  venue_name: string;
  venue_address: string;
  directions_url: string;
  rsvp_deadline: string;
  dress_code: string;
  bank_details: {
    alias: string;
    holder: string;
    bank: string;
  } | null;
}

export const DEFAULT_PUBLIC_EVENT_CONFIG: PublicEventConfig = {
  event_date: '2027-09-26',
  reception_time: '15:00',
  reception_name: '',
  reception_address: '',
  ceremony_time: '16:00',
  ceremony_name: '',
  ceremony_address: '',
  event_end_time: '23:00',
  venue_name: 'BOLGHERT',
  venue_address: 'Santiago Derqui 703, Villa Allende',
  directions_url: '',
  rsvp_deadline: '2027-09-11',
  dress_code: 'Elegante',
  bank_details: null,
};

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00-03:00`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isValidTime(value: string): boolean {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  return Boolean(match);
}

export function resolvePublicEventConfig(value: unknown): PublicEventConfig {
  const values = typeof value === 'object' && value !== null
    ? value as Record<string, unknown>
    : {};
  const text = (key: keyof Omit<PublicEventConfig, 'event_date' | 'bank_details'>): string => {
    const field = values[key];
    return typeof field === 'string' && field.trim()
      ? field.trim()
      : DEFAULT_PUBLIC_EVENT_CONFIG[key];
  };
  const receptionTime = text('reception_time');
  const ceremonyTime = text('ceremony_time');
  const eventEndTime = text('event_end_time');
  const bank = values.bank_details;
  const bankDetails = typeof bank === 'object' && bank !== null
    && typeof (bank as Record<string, unknown>).alias === 'string'
    && typeof (bank as Record<string, unknown>).holder === 'string'
    && typeof (bank as Record<string, unknown>).bank === 'string'
    ? {
        alias: ((bank as Record<string, string>).alias).trim(),
        holder: ((bank as Record<string, string>).holder).trim(),
        bank: ((bank as Record<string, string>).bank).trim(),
      }
    : null;

  return {
    event_date: DEFAULT_PUBLIC_EVENT_CONFIG.event_date,
    reception_time: isValidTime(receptionTime) ? receptionTime : DEFAULT_PUBLIC_EVENT_CONFIG.reception_time,
    reception_name: text('reception_name'),
    reception_address: text('reception_address'),
    ceremony_time: isValidTime(ceremonyTime) ? ceremonyTime : DEFAULT_PUBLIC_EVENT_CONFIG.ceremony_time,
    ceremony_name: text('ceremony_name'),
    ceremony_address: text('ceremony_address'),
    event_end_time: isValidTime(eventEndTime) ? eventEndTime : DEFAULT_PUBLIC_EVENT_CONFIG.event_end_time,
    venue_name: text('venue_name'),
    venue_address: text('venue_address'),
    directions_url: text('directions_url'),
    rsvp_deadline: isValidDate(text('rsvp_deadline'))
      ? text('rsvp_deadline')
      : DEFAULT_PUBLIC_EVENT_CONFIG.rsvp_deadline,
    dress_code: text('dress_code'),
    bank_details: bankDetails,
  };
}

export function formatWeddingDate(value: string, options: Intl.DateTimeFormatOptions = {}): string {
  if (!isValidDate(value)) return value;
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    ...options,
  }).format(new Date(`${value}T12:00:00-03:00`));
}

export function weddingCountdownTimestamp(config: PublicEventConfig): number {
  return new Date(
    `${config.event_date}T${config.reception_time}:00-03:00`
  ).getTime();
}
