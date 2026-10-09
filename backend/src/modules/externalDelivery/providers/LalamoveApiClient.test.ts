import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import {
  createLalamoveApiClient,
  selectThermalBagMotorcycle,
  signLalamoveRequest,
  THERMAL_BAG_SERVICE,
} from './LalamoveApiClient.js';

const credentials = {
  apiKey: ['pk', 'test', 'synthetic'].join('_'),
  apiSecret: ['sk', 'test', 'synthetic'].join('_'),
  environment: 'sandbox' as const,
};
const cities = [
  {
    name: 'Fortaleza',
    locode: 'BR FOR',
    services: [
      { key: 'CAR', specialRequests: [] },
      {
        key: 'LALAGO',
        specialRequests: [{ name: THERMAL_BAG_SERVICE, effective_time: '', offline_time: '' }],
      },
    ],
  },
];
const quote = {
  quotationId: '1514140994227007571',
  expiresAt: '2030-01-01T00:00:00.000Z',
  serviceType: 'LALAGO',
  specialRequests: [THERMAL_BAG_SERVICE],
  stops: [{ stopId: '111' }, { stopId: '222' }],
  priceBreakdown: { total: '12.80', currency: 'BRL' },
};

test('assina os mesmos bytes JSON enviados à API', () => {
  const body = JSON.stringify({ data: { serviceType: 'LALAGO' } });
  const expected = createHmac('sha256', credentials.apiSecret)
    .update('1600000000000\r\nPOST\r\n/v3/quotations\r\n\r\n' + body)
    .digest('hex');
  assert.equal(
    signLalamoveRequest('1600000000000', 'POST', '/v3/quotations', body, credentials.apiSecret),
    expected,
  );
});

test('somente LalaGo ou LalaPro com bolsa térmica da cidade são elegíveis', () => {
  assert.equal(selectThermalBagMotorcycle(cities, 'Fortaleza', 1600000000000), 'LALAGO');
  assert.throws(
    () => selectThermalBagMotorcycle(cities, 'Recife', 1600000000000),
    /indisponível/,
  );
  const withoutBag = [{ name: 'Fortaleza', services: [{ key: 'LALAGO', specialRequests: [] }] }];
  assert.throws(
    () => selectThermalBagMotorcycle(withoutBag, 'Fortaleza', 1600000000000),
    /indisponível/,
  );
});

test('ignora especial térmico desativado ou que ainda não iniciou', () => {
  const expiringCity = [
    {
      name: 'Fortaleza',
      services: [
        {
          key: 'LALAGO',
          specialRequests: [
            { name: THERMAL_BAG_SERVICE, effective_time: '', offline_time: '2020-01-01T00:00:00Z' },
          ],
        },
      ],
    },
  ];
  assert.throws(
    () => selectThermalBagMotorcycle(expiringCity, 'Fortaleza', 1600000000000),
    /indisponível/,
  );
});

test('cotação de alimento exige a opção bolsa térmica na requisição e resposta', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const client = createLalamoveApiClient(credentials, {
    clock: () => 1600000000000,
    nonce: () => 'test-nonce',
    transport: async (url, init) => {
      calls.push({ url: String(url), init });
      if (String(url).endsWith('/v3/cities')) {
        return new Response(JSON.stringify({ data: cities }), { status: 200 });
      }
      return new Response(JSON.stringify({ data: quote }), { status: 201 });
    },
  });
  const result = await client.quotation({
    cityName: 'Fortaleza',
    stops: [
      { coordinates: { lat: '-3.72', lng: '-38.52' }, address: 'Fortaleza - Ceará' },
      { coordinates: { lat: '-3.75', lng: '-38.50' }, address: 'Fortaleza - Centro' },
    ],
  });

  assert.equal(result.total, '12.80');
  assert.equal(result.serviceType, 'LALAGO');
  assert.equal(result.thermalBagRequired, true);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, 'https://rest.sandbox.lalamove.com/v3/cities');
  assert.equal(calls[1].url, 'https://rest.sandbox.lalamove.com/v3/quotations');
  const headers = calls[1].init?.headers as Record<string, string>;
  assert.equal(headers.Market, 'BR');
  assert.equal(headers['Request-ID'], 'test-nonce');
  const body = String(calls[1].init?.body);
  assert.deepEqual(JSON.parse(body).data.specialRequests, [THERMAL_BAG_SERVICE]);
  assert.equal(JSON.parse(body).data.serviceType, 'LALAGO');
  const signature = signLalamoveRequest(
    '1600000000000',
    'POST',
    '/v3/quotations',
    body,
    credentials.apiSecret,
  );
  assert.equal(
    headers.Authorization,
    'hmac ' + credentials.apiKey + ':1600000000000:' + signature,
  );
});

test('não consulta preço se a cidade não oferece bolsa térmica', async () => {
  let quotationRequests = 0;
  const client = createLalamoveApiClient(credentials, {
    transport: async (url) => {
      if (String(url).endsWith('/v3/quotations')) quotationRequests++;
      return new Response(
        JSON.stringify({ data: [{ name: 'Fortaleza', services: [{ key: 'LALAGO', specialRequests: [] }] }] }),
        { status: 200 },
      );
    },
  });
  await assert.rejects(
    () => client.quotation({
      cityName: 'Fortaleza',
      stops: [
        { coordinates: { lat: '-3.72', lng: '-38.52' }, address: 'Fortaleza - Ceará' },
        { coordinates: { lat: '-3.75', lng: '-38.50' }, address: 'Fortaleza - Centro' },
      ],
    }),
    /indisponível/,
  );
  assert.equal(quotationRequests, 0);
});

test('recusa cotação sem confirmação expressa do serviço térmico', async () => {
  const client = createLalamoveApiClient(credentials, {
    clock: () => 1600000000000,
    transport: async (url) =>
      new Response(
        JSON.stringify({
          data: String(url).endsWith('/v3/cities')
            ? cities
            : { ...quote, specialRequests: [] },
        }),
        { status: 200 },
      ),
  });
  await assert.rejects(
    () => client.quotation({
      cityName: 'Fortaleza',
      stops: [
        { coordinates: { lat: '-3.72', lng: '-38.52' }, address: 'Fortaleza - Ceará' },
        { coordinates: { lat: '-3.75', lng: '-38.50' }, address: 'Fortaleza - Centro' },
      ],
    }),
    /sem confirmação de bolsa térmica/,
  );
});

test('não reserva entrega se cotação real não inclui bolsa térmica', async () => {
  let bookings = 0;
  const client = createLalamoveApiClient(credentials, {
    clock: () => 1600000000000,
    transport: async (url) => {
      if (String(url).endsWith('/v3/orders')) bookings++;
      return new Response(JSON.stringify({ data: { ...quote, specialRequests: [] } }), { status: 200 });
    },
  });
  await assert.rejects(
    () => client.placeOrder({
      quotationId: quote.quotationId,
      sender: { stopId: '111', name: 'Restaurante', phone: '+5585999999999' },
      recipients: [{ stopId: '222', name: 'Cliente', phone: '+5585888888888' }],
    }),
    /sem confirmação de bolsa térmica/,
  );
  assert.equal(bookings, 0);
});

test('reserva explicitamente após reverificar a cotação térmica', async () => {
  let bookingCalls = 0;
  const client = createLalamoveApiClient(credentials, {
    clock: () => 1600000000000,
    transport: async (url) => {
      if (String(url).endsWith('/v3/orders')) {
        bookingCalls++;
        return new Response(
          JSON.stringify({ data: { orderId: '1234567890123456789', status: 'ASSIGNING_DRIVER' } }),
          { status: 201 },
        );
      }
      return new Response(JSON.stringify({ data: quote }), { status: 200 });
    },
  });
  assert.equal(bookingCalls, 0);
  const booked = await client.placeOrder({
    quotationId: quote.quotationId,
    sender: { stopId: '111', name: 'Restaurante', phone: '+5585999999999' },
    recipients: [{ stopId: '222', name: 'Cliente', phone: '+5585888888888' }],
  });
  assert.equal(booked.orderId, '1234567890123456789');
  assert.equal(bookingCalls, 1);
});

test('bloqueia produção acidental e credenciais cruzadas', () => {
  assert.throws(
    () => createLalamoveApiClient({
      apiKey: ['pk', 'prod', 'fake'].join('_'),
      apiSecret: ['sk', 'prod', 'fake'].join('_'),
      environment: 'production',
    }),
    /reais ainda não/,
  );
  assert.throws(
    () => createLalamoveApiClient({
      apiKey: ['pk', 'prod', 'fake'].join('_'),
      apiSecret: ['sk', 'test', 'fake'].join('_'),
      environment: 'sandbox',
    }),
    /incompatíveis/,
  );
});

test('oculta corpo de erro com informações pessoais e rejeita IDs inseguros', async () => {
  const client = createLalamoveApiClient(credentials, {
    transport: async () => new Response(
      JSON.stringify({ error: 'Telefone pessoal +5585999999999' }),
      { status: 422 },
    ),
  });
  await assert.rejects(
    () => client.getCities(),
    (error: unknown) => {
      assert.match(String(error), /HTTP 422/);
      assert.doesNotMatch(String(error), /5585999999999/);
      return true;
    },
  );
  await assert.rejects(() => client.orderDetails('../../other'), /Identificador inválido/);
  await assert.rejects(() => client.cancelOrder('a/b'), /Identificador inválido/);
});
