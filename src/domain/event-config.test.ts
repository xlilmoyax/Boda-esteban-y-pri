import assert from 'node:assert/strict';
import {
  DEFAULT_PUBLIC_EVENT_CONFIG,
  formatWeddingDate,
  resolvePublicEventConfig,
  weddingCountdownTimestamp,
} from './event-config';

assert.deepEqual(resolvePublicEventConfig({}), DEFAULT_PUBLIC_EVENT_CONFIG);
assert.equal(
  resolvePublicEventConfig({ event_date: '2030-01-01' }).event_date,
  '2027-09-26'
);
assert.equal(
  resolvePublicEventConfig({ reception_time: '14:30', venue_name: 'Salón nuevo' }).reception_time,
  '14:30'
);
assert.equal(
  resolvePublicEventConfig({ reception_time: '25:99' }).reception_time,
  DEFAULT_PUBLIC_EVENT_CONFIG.reception_time
);
assert.equal(resolvePublicEventConfig({ bank_details: { alias: 'alias', holder: 'titular', bank: 'banco' } }).bank_details?.alias, 'alias');
assert.equal(resolvePublicEventConfig({ bank_details: null }).bank_details, null);
assert.equal(
  formatWeddingDate('2027-09-20', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
  'lunes, 20 de septiembre de 2027'
);
assert.equal(
  new Date(weddingCountdownTimestamp(DEFAULT_PUBLIC_EVENT_CONFIG)).toISOString(),
  '2027-09-26T18:00:00.000Z'
);

console.log('Pruebas de configuración pública del evento completadas.');
