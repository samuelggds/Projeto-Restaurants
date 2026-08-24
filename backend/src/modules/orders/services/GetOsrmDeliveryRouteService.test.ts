import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import getOsrmDeliveryRouteService from './GetOsrmDeliveryRouteService.js';

const originalFetch = globalThis.fetch;
const originalOsrmBaseUrl = process.env.OSRM_BASE_URL;
const originalGeocoderBaseUrl = process.env.GEOCODER_BASE_URL;
const originalRouteTimeout = process.env.ROUTING_REQUEST_TIMEOUT_MS;
const originalGeocoderTimeout = process.env.GEOCODER_REQUEST_TIMEOUT_MS;
const originalCacheMaximum = process.env.ROUTING_CACHE_MAX_ENTRIES;

afterEach(() => {
  globalThis.fetch = originalFetch;
  process.env.OSRM_BASE_URL = originalOsrmBaseUrl;
  process.env.GEOCODER_BASE_URL = originalGeocoderBaseUrl;
  process.env.ROUTING_REQUEST_TIMEOUT_MS = originalRouteTimeout;
  process.env.GEOCODER_REQUEST_TIMEOUT_MS = originalGeocoderTimeout;
  process.env.ROUTING_CACHE_MAX_ENTRIES = originalCacheMaximum;
});

test('calcula rota até o endereço persistido e devolve destino e geometria segura', async () => {
  process.env.OSRM_BASE_URL = 'https://router.test';
  process.env.GEOCODER_BASE_URL = 'https://geocoder.test';
  const requestedUrls: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    requestedUrls.push(url);
    if (url.startsWith('https://geocoder.test')) {
      return new Response(JSON.stringify([{ lat: '-3.7400', lon: '-38.5100' }]), {
        status: 200,
      });
    }
    return new Response(
      JSON.stringify({
        routes: [
          {
            duration: 600,
            distance: 4200,
            geometry: {
              coordinates: [
                [-38.5267, -3.7319],
                [-38.51, -3.74],
              ],
            },
          },
        ],
      }),
      { status: 200 },
    );
  }) as typeof fetch;

  const result = await getOsrmDeliveryRouteService.execute({
    latitude: -3.7319,
    longitude: -38.5267,
    destination: {
      address: 'Rua Backend Teste Único 20260824',
      number: '123',
      district: 'Centro',
      city: 'Fortaleza',
      state: 'CE',
    },
  });

  assert.equal(result?.destination?.latitude, -3.74);
  assert.match(result?.destination?.label || '', /Rua Backend Teste Único/);
  assert.deepEqual(result?.routeCoordinates, [
    { latitude: -3.7319, longitude: -38.5267 },
    { latitude: -3.74, longitude: -38.51 },
  ]);
  assert.match(requestedUrls[1], /overview=full/);
  assert.match(requestedUrls[1], /geometries=geojson/);
});

test('cache de geometria nunca reaproveita o endereço textual de outro pedido', async () => {
  process.env.OSRM_BASE_URL = 'https://router-cache.test';
  process.env.GEOCODER_BASE_URL = 'https://geocoder-cache.test';
  let routeRequests = 0;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    if (url.startsWith('https://geocoder-cache.test')) {
      // Endereços distintos podem apontar para a mesma entrada/coordenada do prédio.
      return new Response(JSON.stringify([{ lat: '-4.2100', lon: '-39.0100' }]), {
        status: 200,
      });
    }

    routeRequests += 1;
    return new Response(
      JSON.stringify({
        routes: [
          {
            duration: 420,
            distance: 3100,
            geometry: {
              coordinates: [
                [-39.11, -4.11],
                [-39.01, -4.21],
              ],
            },
          },
        ],
      }),
      { status: 200 },
    );
  }) as typeof fetch;

  const commonInput = {
    latitude: -4.11,
    longitude: -39.11,
  };
  const first = await getOsrmDeliveryRouteService.execute({
    ...commonInput,
    destination: {
      address: 'Rua Cliente Alfa Cache 20260824',
      number: '10',
      city: 'Fortaleza',
      state: 'CE',
    },
  });
  const second = await getOsrmDeliveryRouteService.execute({
    ...commonInput,
    destination: {
      address: 'Avenida Cliente Beta Cache 20260824',
      number: '20',
      city: 'Fortaleza',
      state: 'CE',
    },
  });

  assert.match(first?.destination?.label || '', /Cliente Alfa/);
  assert.match(second?.destination?.label || '', /Cliente Beta/);
  assert.doesNotMatch(second?.destination?.label || '', /Cliente Alfa/);
  assert.equal(routeRequests, 1);
});

test('aplica timeout nas chamadas do geocoder e do OSRM', async () => {
  process.env.OSRM_BASE_URL = 'https://router-timeout-config.test';
  process.env.GEOCODER_BASE_URL = 'https://geocoder-timeout-config.test';
  process.env.ROUTING_REQUEST_TIMEOUT_MS = '1234';
  process.env.GEOCODER_REQUEST_TIMEOUT_MS = '2345';
  const signals: AbortSignal[] = [];

  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    assert.ok(init?.signal instanceof AbortSignal);
    signals.push(init.signal);
    if (String(input).startsWith('https://geocoder-timeout-config.test')) {
      return new Response(JSON.stringify([{ lat: '-3.75', lon: '-38.52' }]), { status: 200 });
    }
    return new Response(
      JSON.stringify({
        routes: [{ duration: 100, distance: 1000, geometry: { coordinates: [] } }],
      }),
      { status: 200 },
    );
  }) as typeof fetch;

  const result = await getOsrmDeliveryRouteService.execute({
    latitude: -3.73,
    longitude: -38.53,
    destination: { address: 'Rua Timeout Config', number: '1', city: 'Fortaleza', state: 'CE' },
  });

  assert.equal(result?.durationSeconds, 100);
  assert.equal(signals.length, 2);
});

test('limita caches para evitar crescimento sem controle no processo', async () => {
  process.env.OSRM_BASE_URL = 'https://router-bounded-cache.test';
  process.env.GEOCODER_BASE_URL = 'https://geocoder-bounded-cache.test';
  process.env.ROUTING_CACHE_MAX_ENTRIES = '1';
  let routeRequests = 0;

  globalThis.fetch = (async (input: string | URL | Request) => {
    if (String(input).startsWith('https://geocoder-bounded-cache.test')) {
      const firstAddress = String(input).includes('Primeiro');
      return new Response(
        JSON.stringify([{ lat: firstAddress ? '-3.70' : '-3.71', lon: '-38.50' }]),
        { status: 200 },
      );
    }
    routeRequests += 1;
    return new Response(
      JSON.stringify({ routes: [{ duration: 90, distance: 800, geometry: { coordinates: [] } }] }),
      { status: 200 },
    );
  }) as typeof fetch;

  const base = { latitude: -3.73, longitude: -38.53 };
  const first = {
    ...base,
    destination: { address: 'Rua Primeiro Cache', number: '1', city: 'Fortaleza', state: 'CE' },
  };
  const second = {
    ...base,
    destination: { address: 'Rua Segundo Cache', number: '2', city: 'Fortaleza', state: 'CE' },
  };

  await getOsrmDeliveryRouteService.execute(first);
  await getOsrmDeliveryRouteService.execute(second);
  await getOsrmDeliveryRouteService.execute(first);

  assert.equal(routeRequests, 3);
});
