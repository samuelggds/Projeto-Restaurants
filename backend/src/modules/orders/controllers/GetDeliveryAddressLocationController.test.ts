// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach, mock } from 'node:test';
import controller from './GetDeliveryAddressLocationController.js';
import googleAddressGeocodingService from '../services/GoogleAddressGeocodingService.js';
import geoapifyDeliveryRoutingProvider from '../services/GeoapifyDeliveryRoutingProvider.js';
import getOsrmDeliveryRouteService from '../services/GetOsrmDeliveryRouteService.js';

afterEach(() => {
  mock.restoreAll();
});

function makeRequest(overrides = {}) {
  return {
    body: {
      restaurantId: 7,
      type: 'DELIVERY',
      address: 'Rua das Flores',
      number: '120',
      district: 'Centro',
      city: 'Fortaleza',
      state: 'ce',
      zipCode: '60000-000',
      ...overrides,
    },
  };
}

function makeResponse() {
  const state = { status: 200, body: null };
  return {
    state,
    status(code) {
      state.status = code;
      return this;
    },
    json(body) {
      state.body = body;
      return this;
    },
  };
}

test('usa o Google quando o endereço é localizado pela fonte principal', async () => {
  mock.method(googleAddressGeocodingService, 'isConfigured', () => true);
  mock.method(geoapifyDeliveryRoutingProvider, 'isGeocodingConfigured', () => false);
  mock.method(getOsrmDeliveryRouteService, 'isGeocodingConfigured', () => false);
  const google = {
    latitude: -3.7319,
    longitude: -38.5267,
    formattedAddress: 'Rua das Flores, 120, Fortaleza - CE',
    locationType: 'ROOFTOP',
    partialMatch: false,
  };
  let fallbackCalls = 0;
  mock.method(googleAddressGeocodingService, 'execute', async () => google);
  mock.method(geoapifyDeliveryRoutingProvider, 'geocodeAddress', async () => {
    fallbackCalls += 1;
    return null;
  });
  mock.method(getOsrmDeliveryRouteService, 'geocodeAddress', async () => {
    fallbackCalls += 1;
    return null;
  });

  const res = makeResponse();
  await controller.handle(makeRequest(), res);

  assert.equal(res.state.status, 200);
  assert.deepEqual(res.state.body, { location: google });
  assert.equal(fallbackCalls, 0);
});

test('usa Geoapify como fallback e normaliza endereço quando o Google não localiza', async () => {
  mock.method(googleAddressGeocodingService, 'isConfigured', () => false);
  mock.method(geoapifyDeliveryRoutingProvider, 'isGeocodingConfigured', () => true);
  mock.method(getOsrmDeliveryRouteService, 'isGeocodingConfigured', () => false);
  mock.method(googleAddressGeocodingService, 'execute', async () => null);
  mock.method(geoapifyDeliveryRoutingProvider, 'geocodeAddress', async () => ({
    latitude: -3.732,
    longitude: -38.527,
  }));
  mock.method(getOsrmDeliveryRouteService, 'geocodeAddress', async () => null);

  const res = makeResponse();
  await controller.handle(makeRequest(), res);

  assert.equal(res.state.status, 200);
  assert.deepEqual(res.state.body.location, {
    latitude: -3.732,
    longitude: -38.527,
    formattedAddress: 'Rua das Flores, 120, Centro, Fortaleza, CE, 60000000, Brasil',
    locationType: 'GEOAPIFY_FALLBACK',
    partialMatch: true,
  });
});

test('usa Nominatim/OSRM quando o fallback Geoapify falha', async () => {
  mock.method(googleAddressGeocodingService, 'isConfigured', () => false);
  mock.method(geoapifyDeliveryRoutingProvider, 'isGeocodingConfigured', () => true);
  mock.method(getOsrmDeliveryRouteService, 'isGeocodingConfigured', () => true);
  mock.method(googleAddressGeocodingService, 'execute', async () => null);
  mock.method(geoapifyDeliveryRoutingProvider, 'geocodeAddress', async () => {
    throw new Error('geoapify indisponível');
  });
  mock.method(getOsrmDeliveryRouteService, 'geocodeAddress', async () => ({
    latitude: -3.733,
    longitude: -38.528,
  }));

  const res = makeResponse();
  await controller.handle(makeRequest(), res);

  assert.equal(res.state.status, 200);
  assert.equal(res.state.body.location.locationType, 'NOMINATIM_FALLBACK');
  assert.equal(res.state.body.location.partialMatch, true);
});

test('responde 422 quando há provedor configurado, mas o endereço não é localizado', async () => {
  mock.method(googleAddressGeocodingService, 'isConfigured', () => true);
  mock.method(geoapifyDeliveryRoutingProvider, 'isGeocodingConfigured', () => true);
  mock.method(getOsrmDeliveryRouteService, 'isGeocodingConfigured', () => true);
  mock.method(googleAddressGeocodingService, 'execute', async () => null);
  mock.method(geoapifyDeliveryRoutingProvider, 'geocodeAddress', async () => null);
  mock.method(getOsrmDeliveryRouteService, 'geocodeAddress', async () => null);

  const res = makeResponse();
  await controller.handle(makeRequest(), res);

  assert.equal(res.state.status, 422);
  assert.deepEqual(res.state.body, {
    error: 'Não foi possível localizar este endereço no mapa.',
    code: 'ADDRESS_NOT_GEOCODED',
  });
});

test('responde indisponibilidade sem expor provedor quando nenhum geocoder está configurado', async () => {
  let calls = 0;
  mock.method(googleAddressGeocodingService, 'isConfigured', () => false);
  mock.method(geoapifyDeliveryRoutingProvider, 'isGeocodingConfigured', () => false);
  mock.method(getOsrmDeliveryRouteService, 'isGeocodingConfigured', () => false);
  mock.method(googleAddressGeocodingService, 'execute', async () => {
    calls += 1;
    return null;
  });

  const res = makeResponse();
  await controller.handle(makeRequest(), res);

  assert.equal(res.state.status, 503);
  assert.deepEqual(res.state.body, {
    error: 'Não foi possível validar o endereço no momento. Tente novamente em instantes.',
    code: 'ADDRESS_VALIDATION_UNAVAILABLE',
  });
  assert.equal(calls, 0);
});

test('rejeita endereço incompleto antes de consultar os provedores', async () => {
  let calls = 0;
  mock.method(googleAddressGeocodingService, 'execute', async () => {
    calls += 1;
    return null;
  });

  const res = makeResponse();
  await controller.handle(makeRequest({ address: '' }), res);

  assert.equal(res.state.status, 400);
  assert.equal(res.state.body.code, 'ADDRESS_INCOMPLETE');
  assert.equal(calls, 0);
});
