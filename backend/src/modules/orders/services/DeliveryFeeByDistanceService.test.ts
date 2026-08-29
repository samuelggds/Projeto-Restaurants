import assert from 'node:assert/strict';
import test from 'node:test';
import deliveryFeeByDistanceService from './DeliveryFeeByDistanceService.js';

function createDb(ranges: Array<{ maxDistanceKm: number; fee: number; active?: boolean }>) {
  return {
    deliveryFeeRange: {
      findFirst: async ({ where }: any) => {
        const minimumDistance = Number(where?.maxDistanceKm?.gte ?? 0);
        return (
          ranges
            .filter((range) => range.active !== false && range.maxDistanceKm >= minimumDistance)
            .sort((first, second) => first.maxDistanceKm - second.maxDistanceKm)[0] ?? null
        );
      },
    },
  };
}

const ranges = [
  { maxDistanceKm: 2, fee: 5, active: true },
  { maxDistanceKm: 5, fee: 8, active: true },
  { maxDistanceKm: 8, fee: 12, active: true },
  { maxDistanceKm: 12, fee: 18, active: true },
];

test('usa a primeira faixa quando a rota tem 1 km', async () => {
  const result = await deliveryFeeByDistanceService.calculate({
    restaurantId: 1,
    distanceMeters: 1000,
    db: createDb(ranges) as any,
  });

  assert.equal(result.deliveryFeeAmount, 5);
  assert.equal(result.maxDistanceKm, 2);
});

test('usa a faixa de até 5 km quando a rota tem 4 km', async () => {
  const result = await deliveryFeeByDistanceService.calculate({
    restaurantId: 1,
    distanceMeters: 4000,
    db: createDb(ranges) as any,
  });

  assert.equal(result.deliveryFeeAmount, 8);
  assert.equal(result.maxDistanceKm, 5);
});

test('usa a faixa de até 8 km quando a rota tem 6,4 km', async () => {
  const result = await deliveryFeeByDistanceService.calculate({
    restaurantId: 1,
    distanceMeters: 6400,
    db: createDb(ranges) as any,
  });

  assert.equal(result.deliveryFeeAmount, 12);
  assert.equal(result.maxDistanceKm, 8);
});

test('considera fora da área quando a rota ultrapassa a maior faixa ativa', async () => {
  await assert.rejects(
    deliveryFeeByDistanceService.calculate({
      restaurantId: 1,
      distanceMeters: 13000,
      db: createDb(ranges) as any,
    }),
    /Este endereço está fora da área de entrega do restaurante\./,
  );
});

test('ignora faixas inativas', async () => {
  const result = await deliveryFeeByDistanceService.calculate({
    restaurantId: 1,
    distanceMeters: 2500,
    db: createDb([
      { maxDistanceKm: 3, fee: 6, active: false },
      { maxDistanceKm: 5, fee: 9, active: true },
    ]) as any,
  });

  assert.equal(result.deliveryFeeAmount, 9);
  assert.equal(result.maxDistanceKm, 5);
});
