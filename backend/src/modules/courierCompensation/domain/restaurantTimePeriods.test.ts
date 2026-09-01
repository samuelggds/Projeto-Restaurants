import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getRestaurantPeriodBoundaries,
  normalizeRestaurantTimeZone,
} from './restaurantTimePeriods.js';

test('dia, semana e mês seguem America/Sao_Paulo e semana começa segunda', () => {
  const periods = getRestaurantPeriodBoundaries(
    new Date('2026-09-01T12:00:00.000Z'),
    'America/Sao_Paulo',
  );
  assert.equal(periods.today.gte.toISOString(), '2026-09-01T03:00:00.000Z');
  assert.equal(periods.today.lt.toISOString(), '2026-09-02T03:00:00.000Z');
  assert.equal(periods.week.gte.toISOString(), '2026-08-31T03:00:00.000Z');
  assert.equal(periods.week.lt.toISOString(), '2026-09-07T03:00:00.000Z');
  assert.equal(periods.month.gte.toISOString(), '2026-09-01T03:00:00.000Z');
  assert.equal(periods.month.lt.toISOString(), '2026-10-01T03:00:00.000Z');
});

test('limites usam intervalo fechado-aberto para não contar duas vezes', () => {
  const periods = getRestaurantPeriodBoundaries(new Date('2026-09-01T03:00:00Z'));
  assert.equal(periods.today.gte.getTime(), new Date('2026-09-01T03:00:00Z').getTime());
  assert.ok(periods.today.lt > periods.today.gte);
});

test('mudança de horário de verão preserva meia-noite local', () => {
  const periods = getRestaurantPeriodBoundaries(
    new Date('2026-03-08T16:00:00.000Z'),
    'America/New_York',
  );
  assert.equal(periods.today.gte.toISOString(), '2026-03-08T05:00:00.000Z');
  assert.equal(periods.today.lt.toISOString(), '2026-03-09T04:00:00.000Z');
});

test('virada do ano gera o próximo mês corretamente', () => {
  const periods = getRestaurantPeriodBoundaries(
    new Date('2026-12-31T15:00:00.000Z'),
    'America/Sao_Paulo',
  );
  assert.equal(periods.month.lt.toISOString(), '2027-01-01T03:00:00.000Z');
});

test('fuso ausente usa o padrão seguro brasileiro', () => {
  assert.equal(normalizeRestaurantTimeZone(), 'America/Sao_Paulo');
});

test('fuso IANA inválido é rejeitado', () => {
  assert.throws(() => normalizeRestaurantTimeZone('UTC+25/tenant'), /fuso horário IANA válido/);
});
