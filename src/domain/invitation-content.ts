export interface InvitationPhoto {
  src: string;
  alt: string;
  focusX?: number;
  focusY?: number;
}

export interface InvitationStory {
  id?: string;
  visible?: boolean;
  design?: {
    backgroundColor?: string;
    titleColor?: string;
    textColor?: string;
  };
  title: string;
  copy: string;
  handwritten?: string;
  invitation?: string;
  couple?: string;
  photos: InvitationPhoto[];
}

export interface InvitationContent {
  schema_version: 1;
  names: string;
  music_title: string;
  verse: {
    first_line: string;
    second_line: string;
    third_line: string;
    reference: string;
  };
  story: InvitationStory[];
  rsvp_title: string;
  gifts_title: string;
  gifts_options: [string, string];
}

export const DEFAULT_INVITATION_CONTENT: InvitationContent = {
  schema_version: 1,
  names: 'Esteban & Priscila',
  music_title: 'Dale play para reproducir nuestra canción',
  verse: {
    first_line: '“Mejores son dos que uno.',
    second_line: 'Porque si cayeren el uno levantará a su compañero',
    third_line: 'Y cordón de tres dobleces no se rompe pronto.”',
    reference: 'ECLESIASTÉS 4: 9-12',
  },
  story: [
    {
      title: 'Un encuentro casual',
      copy: 'Con la bendición de Dios y el amor como guía, comenzó nuestra historia. Ya nos conocíamos de vista, entre un “hola” y un “chau”, pero fue aquella tarde, al salir de la Escuela de Policía, cuando Dios cruzó nuestros caminos de una manera inesperada. Un viaje, un gesto y un nombre revelado… y así comenzó lo que Él ya había escrito para nosotros.',
      photos: [
        {
          src: '/images/recuperados/originales/historia-foto-comienzo-1.jpg',
          alt: 'Esteban y Priscila juntos al comienzo de su historia',
          focusX: 50,
          focusY: 50,
        },
        {
          src: '/images/recuperados/originales/historia-foto-comienzo-2.jpg',
          alt: 'Esteban y Priscila sonriendo juntos',
          focusX: 50,
          focusY: 50,
        },
      ],
    },
    {
      title: 'Un amor que eligió quedarse',
      copy: 'Aunque la vida nos puso a prueba y hubo momentos en los que parecía que todo estaba perdido, este amor siempre encontró la manera de permanecer. Porque, incluso cuando todo parecía llevarnos por caminos diferentes, entre todas las posibilidades, siempre encontramos una razón para volver a elegirnos.',
      photos: [
        {
          src: '/images/recuperados/originales/historia-foto-promesa-1.jpg',
          alt: 'Esteban y Priscila juntos en una selfie',
          focusX: 50,
          focusY: 50,
        },
        {
          src: '/images/recuperados/originales/historia-foto-promesa-2.jpg',
          alt: 'Esteban y Priscila posando juntos frente a un cartel de amor',
          focusX: 50,
          focusY: 50,
        },
      ],
    },
    {
      handwritten: 'Que se volvió',
      title: 'Una promesa para siempre',
      copy: 'Primero amigos, luego novios y hoy, de la mano de Dios, elegimos ser uno para siempre y prometernos una vida juntos.',
      invitation: 'Con el corazón lleno de amor y alegría, los invitamos a celebrar el comienzo de nuestro “pa’ toda la vida”.',
      couple: 'Esteban y Priscila',
      photos: [
        {
          src: '/images/recuperados/originales/historia-foto-cierre-1.jpg',
          alt: 'Esteban y Priscila abrazados al aire libre',
          focusX: 50,
          focusY: 50,
        },
        {
          src: '/images/recuperados/originales/historia-foto-cierre-2.jpg',
          alt: 'Esteban y Priscila dándose un beso junto al agua',
          focusX: 50,
          focusY: 50,
        },
      ],
    },
  ],
  rsvp_title: 'Confirma tu presencia',
  gifts_title: 'REGALOS',
  gifts_options: ['Presencial en el casamiento', 'Transferencia'],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isText(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

function isFocusPercent(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 100;
}

function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[\da-fA-F]{6}$/.test(value);
}

function isSafePhotoPath(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    !value.includes('..') &&
    !value.includes('\\') &&
    !value.includes('?') &&
    !value.includes('#') &&
    (value.startsWith('/images/recuperados/originales/') ||
      /^invitation\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))
  );
}

function isPhoto(value: unknown): value is InvitationPhoto {
  return (
    isRecord(value) &&
    isSafePhotoPath(value.src) &&
    isText(value.alt, 180) &&
    (value.focusX === undefined || isFocusPercent(value.focusX)) &&
    (value.focusY === undefined || isFocusPercent(value.focusY))
  );
}

function isStory(value: unknown): value is InvitationStory {
  if (!isRecord(value) || !Array.isArray(value.photos) || value.photos.length !== 2) return false;
  if (value.id !== undefined && !isText(value.id, 80)) return false;
  if (value.visible !== undefined && typeof value.visible !== 'boolean') return false;
  if (value.design !== undefined) {
    if (!isRecord(value.design)) return false;
    if (
      (value.design.backgroundColor !== undefined && !isHexColor(value.design.backgroundColor)) ||
      (value.design.titleColor !== undefined && !isHexColor(value.design.titleColor)) ||
      (value.design.textColor !== undefined && !isHexColor(value.design.textColor))
    ) return false;
  }
  if (!isText(value.title, 120) || !isText(value.copy, 1600) || !value.photos.every(isPhoto)) return false;
  return (
    (value.handwritten === undefined || isText(value.handwritten, 80)) &&
    (value.invitation === undefined || isText(value.invitation, 360)) &&
    (value.couple === undefined || isText(value.couple, 80))
  );
}

export function isInvitationContent(value: unknown): value is InvitationContent {
  if (!isRecord(value) || value.schema_version !== 1) return false;
  if (
    !isRecord(value.verse) ||
    !Array.isArray(value.story) ||
    value.story.length < 1 ||
    value.story.length > 10 ||
    !value.story.some((story) => isRecord(story) && story.visible !== false)
  ) return false;
  const storyIds = value.story.flatMap((story) =>
    isRecord(story) && typeof story.id === 'string' ? [story.id] : []
  );
  if (new Set(storyIds).size !== storyIds.length) return false;

  return (
    isText(value.names, 120) &&
    isText(value.music_title, 160) &&
    isText(value.verse.first_line, 240) &&
    isText(value.verse.second_line, 360) &&
    isText(value.verse.third_line, 240) &&
    isText(value.verse.reference, 80) &&
    value.story.every(isStory) &&
    isText(value.rsvp_title, 120) &&
    isText(value.gifts_title, 100) &&
    Array.isArray(value.gifts_options) &&
    value.gifts_options.length === 2 &&
    value.gifts_options.every((option) => isText(option, 120))
  );
}

export function getInvitationImageUrl(
  path: string,
  getPublicUrl: (path: string) => string
): string {
  return path.startsWith('invitation/') ? getPublicUrl(path) : path;
}
