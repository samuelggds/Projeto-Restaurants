import assert from 'node:assert/strict';
import test from 'node:test';
import { validateDeliveryLocationPayload } from './deliveryLocationPayload.js';

const now = Date.parse('2026-08-24T15:00:00.000Z');

test('normaliza uma posição recente e preserva zero como valor válido', () => {
  const result = validateDeliveryLocationPayload(
    {
      orderId: '91',
      latitude: -3.7319,
      longitude: -38.5267,
      heading: 0,
      speed: 0,
      accuracy: 8.7,
      sentAt: '2026-08-24T14:59:58.000Z',
    },
    now,
  );

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.value, {
      orderId: 91,
      latitude: -3.7319,
      longitude: -38.5267,
      heading: 0,
      speed: 0,
      accuracy: 9,
      sentAt: '2026-08-24T14:59:58.000Z',
      recordedAt: new Date('2026-08-24T14:59:58.000Z'),
    });
  }
});

test('recusa coordenadas, telemetria e horários manipulados', () => {
  const base = {
    orderId: 91,
    latitude: -3.7319,
    longitude: -38.5267,
    sentAt: '2026-08-24T14:59:58.000Z',
  };

  const invalidCoordinates = validateDeliveryLocationPayload({ ...base, latitude: 91 }, now);
  assert.equal(invalidCoordinates.ok, false);
  assert.match('error' in invalidCoordinates ? invalidCoordinates.error : '', /Coordenadas/);
  assert.equal(validateDeliveryLocationPayload({ ...base, speed: 101 }, now).ok, false);
  assert.equal(validateDeliveryLocationPayload({ ...base, accuracy: -1 }, now).ok, false);
  assert.equal(
    validateDeliveryLocationPayload({ ...base, sentAt: '2026-08-24T14:50:00.000Z' }, now).ok,
    false,
  );
  assert.equal(validateDeliveryLocationPayload({ ...base, sentAt: 'não é data' }, now).ok, false);
});
