import { parseSubmission } from '../../supabase/functions/_shared/rsvp-validation';

const validPayload = {
  request_id: '80000000-0000-4000-8000-000000000001',
  contact_name: ' Priscila ',
  contact_surname: ' Moya ',
  email: ' PRI@example.com ',
  phone: ' ',
  attending: true,
  attendees: [{
    name: ' Esteban ',
    surname: ' Moya ',
    age_at_event: 30,
    after_lunch: false,
  }],
  observations: '',
  song_suggestion: ' Canción ',
  dietary_restrictions: ['celiaquia', 'vegana'],
  dietary_details: ' Sin contaminación ',
};

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function assertInvalid(payload: unknown, message: string): void {
  try {
    parseSubmission(payload);
  } catch {
    return;
  }
  throw new Error(message);
}

const normalized = parseSubmission(validPayload);
assert(normalized.email === 'pri@example.com', 'El email no se normalizó.');
assert(normalized.song_suggestion === 'Canción', 'La sugerencia de canción no se normalizó.');
assert(normalized.dietary_details === 'Sin contaminación', 'El detalle no se normalizó.');
assert(
  normalized.dietary_restrictions.join(',') === 'celiaquia,vegana',
  'No se preservaron las opciones alimentarias.',
);

const noOptionalFields = parseSubmission({
  ...validPayload,
  attending: false,
  attendees: [],
  song_suggestion: '',
  dietary_restrictions: [],
  dietary_details: '',
});
assert(noOptionalFields.song_suggestion === null, 'La sugerencia vacía no se convirtió en null.');
assert(noOptionalFields.dietary_details === null, 'El detalle vacío no se convirtió en null.');
assert(noOptionalFields.dietary_restrictions.length === 0, 'Las restricciones vacías no se conservaron.');

assertInvalid(
  { ...validPayload, dietary_restrictions: ['otra'] },
  'Se aceptó una categoría que no ofrece el formulario.',
);
assertInvalid(
  { ...validPayload, dietary_restrictions: ['vegana', 'vegana'] },
  'Se aceptaron categorías duplicadas.',
);
assertInvalid(
  { ...validPayload, song_suggestion: 'x'.repeat(201) },
  'Se aceptó una sugerencia que supera el límite.',
);
assertInvalid(
  { ...validPayload, dietary_details: 'x'.repeat(501) },
  'Se aceptó un detalle que supera el límite.',
);
assertInvalid(
  { ...validPayload, unknown: true },
  'Se aceptó una propiedad fuera del contrato.',
);
assertInvalid(
  { ...validPayload, attending: false },
  'Se aceptó una respuesta negativa con asistentes.',
);

console.log('Pruebas de validación RSVP completadas.');
