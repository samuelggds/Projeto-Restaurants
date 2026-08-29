// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import geoapifyDeliveryRoutingProvider from './GeoapifyDeliveryRoutingProvider.js';
import {
  getConfiguredDeliveryRoutingProviderId,
  getDeliveryRoutingProvider,
} from './GetDeliveryRoutingProvider.js';

const originalEnv = { ...process.env };
const originalFetch = globalThis.fetch;

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) delete process.env[key];
  }
  Object.assign(process.env, originalEnv);
  globalThis.fetch = originalFetch;
});

test('usa osrm como provider padrao', () => {
  delete process.env.ROUTING_PROVIDER;

  assert.equal(getConfiguredDeliveryRoutingProviderId(), 'osrm');
  assert.equal(getDeliveryRoutingProvider().id, 'osrm');
});

test('seleciona geoapify por variavel de ambiente', () => {
  process.env.ROUTING_PROVIDER = 'geoapify';

  assert.equal(getConfiguredDeliveryRoutingProviderId(), 'geoapify');
  assert.equal(getDeliveryRoutingProvider().id, 'geoapify');
});

test('rejeita provider desconhecido', () => {
  process.env.ROUTING_PROVIDER = 'qualquer-outro';

  assert.throws(() => getDeliveryRoutingProvider(), /osrm ou geoapify/);
});

test('geoapify converte enderecos em coordenadas e retorna a distancia da rota', async () => {
  process.env.GEOAPIFY_API_KEY = 'test-key';
  process.env.GEOAPIFY_BASE_URL = 'https://api.geoapify.com';

  const calls: URL[] = [];
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    calls.push(url);

    if (url.pathname === '/v1/geocode/search') {
      const isOrigin = String(url.searchParams.get('text')).includes('Origem');
      return new Response(
        JSON.stringify({
          results: [
            isOrigin
              ? { lat: -3.73, lon: -38.52 }
              : { lat: -3.75, lon: -38.55 },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (url.pathname === '/v1/routing') {
      return new Response(JSON.stringify({ results: [{ distance: 4321 }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(null, { status: 404 });
  };

  const distance = await geoapifyDeliveryRoutingProvider.calculateDistanceMeters({
    origin: {
      address: 'Rua Origem',
      number: '10',
      district: 'Centro',
      city: 'Fortaleza',
      state: 'CE',
    },
    destination: {
      address: 'Rua Destino',
      number: '20',
      district: 'Aldeota',
      city: 'Fortaleza',
      state: 'CE',
    },
  });

  assert.equal(distance, 4321);
  assert.equal(calls.length, 3);
  assert.equal(calls[0].searchParams.get('filter'), 'countrycode:br');
  assert.equal(calls[2].searchParams.get('mode'), 'drive');
  assert.equal(calls[2].searchParams.get('apiKey'), 'test-key');
});
