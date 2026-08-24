import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildDeliveryDestination,
  limitRouteCoordinates,
  parseOsrmRouteEstimate,
} from './deliveryRouteEstimate.js';

test('monta o destino completo do pedido para a rota', () => {
  assert.equal(
    buildDeliveryDestination({
      address: 'Rua das Flores',
      number: '123',
      district: 'Centro',
      city: 'Fortaleza',
      state: 'CE',
    }),
    'Rua das Flores, 123, Centro, Fortaleza, CE, Brasil',
  );
});

test('interpreta a duracao retornada pelo OSRM', () => {
  assert.deepEqual(
    parseOsrmRouteEstimate({
      code: 'Ok',
      routes: [{ duration: 765.4, distance: 4200.2 }],
    }),
    { durationSeconds: 765, distanceMeters: 4200, provider: 'OSRM' },
  );
  assert.equal(parseOsrmRouteEstimate({ routes: [{ duration: 0 }] }), null);
});

test('converte a geometria GeoJSON do OSRM sem aceitar coordenadas inválidas', () => {
  assert.deepEqual(
    parseOsrmRouteEstimate({
      routes: [
        {
          duration: 60,
          distance: 1500,
          geometry: {
            coordinates: [
              [-38.5, -3.7],
              ['inválida', -3.71],
              [-38.51, -3.72],
            ],
          },
        },
      ],
    }),
    {
      durationSeconds: 60,
      distanceMeters: 1500,
      provider: 'OSRM',
      routeCoordinates: [
        { latitude: -3.7, longitude: -38.5 },
        { latitude: -3.72, longitude: -38.51 },
      ],
    },
  );
});

test('reduz rotas extensas preservando o início e o destino', () => {
  const route = Array.from({ length: 501 }, (_, index) => ({
    latitude: -3.7 + index / 10_000,
    longitude: -38.5 + index / 10_000,
  }));
  const limited = limitRouteCoordinates(route, 100);

  assert.equal(limited.length, 100);
  assert.deepEqual(limited[0], route[0]);
  assert.deepEqual(limited.at(-1), route.at(-1));
});
