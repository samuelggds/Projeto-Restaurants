import assert from 'node:assert/strict';
import test from 'node:test';
import { CourierCompensationModel } from '@prisma/client';

import {
  calculateCourierCompensation,
  compensationRequiresDistance,
  normalizeCompensationPolicy,
} from './courierCompensation.js';
import { centsToMoney, moneyToCents } from './money.js';

test('valor fixo é calculado sem depender da distância', () => {
  assert.equal(
    calculateCourierCompensation(
      { model: CourierCompensationModel.FIXED_PER_DELIVERY, fixedAmount: '8.75' },
      null,
    ),
    '8.75',
  );
});

test('faixas incluem exatamente o limite configurado', () => {
  const policy = {
    model: CourierCompensationModel.DISTANCE_RANGES,
    ranges: [
      { maxDistanceMeters: 3000, amount: '7.00' },
      { maxDistanceMeters: 6000, amount: '11.50' },
    ],
  };
  assert.equal(calculateCourierCompensation(policy, 3000), '7.00');
  assert.equal(calculateCourierCompensation(policy, 3001), '11.50');
});

test('faixas são ordenadas antes do cálculo', () => {
  const policy = normalizeCompensationPolicy({
    model: CourierCompensationModel.DISTANCE_RANGES,
    ranges: [
      { maxDistanceMeters: 9000, amount: '15' },
      { maxDistanceMeters: 2000, amount: '5' },
    ],
  });
  assert.deepEqual(
    policy.ranges.map((range) => range.maxDistanceMeters),
    [2000, 9000],
  );
});

test('distância fora das faixas falha fechada', () => {
  assert.throws(
    () =>
      calculateCourierCompensation(
        {
          model: CourierCompensationModel.DISTANCE_RANGES,
          ranges: [{ maxDistanceMeters: 1000, amount: 5 }],
        },
        1001,
      ),
    /não está coberta/,
  );
});

test('modelo base não cobra adicional dentro da franquia', () => {
  assert.equal(
    calculateCourierCompensation(
      {
        model: CourierCompensationModel.BASE_PLUS_DISTANCE,
        baseAmount: '6.25',
        includedDistanceMeters: 2500,
        extraPerKmAmount: '2.00',
      },
      2500,
    ),
    '6.25',
  );
});

test('modelo base calcula adicional proporcional por metro', () => {
  assert.equal(
    calculateCourierCompensation(
      {
        model: CourierCompensationModel.BASE_PLUS_DISTANCE,
        baseAmount: '5.00',
        includedDistanceMeters: 1000,
        extraPerKmAmount: '2.00',
      },
      2750,
    ),
    '8.50',
  );
});

test('arredondamento monetário por metro é half-up e determinístico', () => {
  assert.equal(
    calculateCourierCompensation(
      {
        model: CourierCompensationModel.BASE_PLUS_DISTANCE,
        baseAmount: 0,
        includedDistanceMeters: 0,
        extraPerKmAmount: 1,
      },
      5,
    ),
    '0.01',
  );
  assert.equal(
    calculateCourierCompensation(
      {
        model: CourierCompensationModel.BASE_PLUS_DISTANCE,
        baseAmount: 0,
        includedDistanceMeters: 0,
        extraPerKmAmount: 1,
      },
      4,
    ),
    '0.00',
  );
});

test('modelos por distância rejeitam distância ausente ou negativa', () => {
  for (const distance of [null, undefined, -1, 1.5]) {
    assert.throws(
      () =>
        calculateCourierCompensation(
          {
            model: CourierCompensationModel.BASE_PLUS_DISTANCE,
            baseAmount: 1,
            extraPerKmAmount: 1,
          },
          distance,
        ),
      /distância segura/,
    );
  }
});

test('normalização rejeita valores negativos, precisão indevida e NaN', () => {
  for (const amount of ['-1', '1.999', Number.NaN]) {
    assert.throws(() => moneyToCents(amount), /valor monetário válido/);
  }
});

test('normalização aceita vírgula e mantém centavos exatos', () => {
  assert.equal(moneyToCents('123,45'), 12345n);
  assert.equal(centsToMoney(12345n), '123.45');
  assert.equal(centsToMoney(-7n), '-0.07');
});

test('faixas duplicadas são rejeitadas', () => {
  assert.throws(
    () =>
      normalizeCompensationPolicy({
        model: CourierCompensationModel.DISTANCE_RANGES,
        ranges: [
          { maxDistanceMeters: 1000, amount: 5 },
          { maxDistanceMeters: 1000, amount: 7 },
        ],
      }),
    /não podem terminar na mesma distância/,
  );
});

test('modelo por faixa exige ao menos uma faixa', () => {
  assert.throws(
    () =>
      normalizeCompensationPolicy({
        model: CourierCompensationModel.DISTANCE_RANGES,
        ranges: [],
      }),
    /pelo menos uma faixa/,
  );
});

test('somente os modelos geográficos exigem distância confiável', () => {
  assert.equal(compensationRequiresDistance(CourierCompensationModel.FIXED_PER_DELIVERY), false);
  assert.equal(compensationRequiresDistance(CourierCompensationModel.DISTANCE_RANGES), true);
  assert.equal(compensationRequiresDistance(CourierCompensationModel.BASE_PLUS_DISTANCE), true);
});

test('modelo desconhecido é recusado', () => {
  assert.throws(
    () => normalizeCompensationPolicy({ model: 'CLIENT_CONTROLLED_VALUE' }),
    /Modelo de remuneração inválido/,
  );
});
