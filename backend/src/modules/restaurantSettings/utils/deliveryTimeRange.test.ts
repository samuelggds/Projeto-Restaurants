import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatDeliveryTimeRange,
  normalizeDeliveryTimeRangeInput,
  resolveDeliveryTimeRange,
} from './deliveryTimeRange.js';

test('normaliza intervalo de entrega válido', () => {
  assert.deepEqual(
    normalizeDeliveryTimeRangeInput({
      deliveryTimeMin: 30,
      deliveryTimeMax: 45,
    }),
    {
      deliveryTimeMin: 30,
      deliveryTimeMax: 45,
      averageDeliveryTime: '30',
    },
  );
});

test('rejeita intervalo invertido', () => {
  assert.throws(
    () =>
      normalizeDeliveryTimeRangeInput({
        deliveryTimeMin: 50,
        deliveryTimeMax: 30,
      }),
    /máximo de entrega deve ser maior ou igual/,
  );
});

test('converte campo legado numérico para intervalo compatível', () => {
  assert.deepEqual(
    normalizeDeliveryTimeRangeInput({ averageDeliveryTime: 35 }),
    {
      deliveryTimeMin: 35,
      deliveryTimeMax: 35,
      averageDeliveryTime: '35',
    },
  );
});

test('lê intervalo legado sem perder compatibilidade', () => {
  assert.deepEqual(
    resolveDeliveryTimeRange({ averageDeliveryTime: '25-40 min' }),
    { minimum: 25, maximum: 40 },
  );
  assert.equal(
    formatDeliveryTimeRange({ averageDeliveryTime: '25-40 min' }),
    '25-40 min',
  );
});

test('formata intervalo novo e valor único', () => {
  assert.equal(
    formatDeliveryTimeRange({ deliveryTimeMin: 30, deliveryTimeMax: 45 }),
    '30-45 min',
  );
  assert.equal(
    formatDeliveryTimeRange({ deliveryTimeMin: 30, deliveryTimeMax: 30 }),
    '30 min',
  );
});
