import assert from 'node:assert/strict';
import test, { afterEach, beforeEach } from 'node:test';

import prisma from '../../../config/prisma.js';
import restaurantSettingsRepository from '../../restaurantSettings/repositories/RestaurantSettingsRepository.js';
import { CARD_PROVIDERS } from '../../payments/providers/providerCatalog.js';
import directOrderCardPaymentService, {
  CardPaymentDeclinedError,
  CardPaymentProviderRequestError,
  mercadoPagoDeclineDetails,
} from './DirectOrderCardPaymentService.js';

const originalFetch = globalThis.fetch;
const originalFindByRestaurantId = restaurantSettingsRepository.findByRestaurantId;
const originalEnv = { ...process.env };

beforeEach(() => {
  process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK = 'true';
  process.env.MP_ACCESS_TOKEN = 'TEST-access-token';
  restaurantSettingsRepository.findByRestaurantId = async () =>
    ({
      restaurantId: 7,
      cardGateway: 'MERCADO_PAGO',
      mercadoPagoAccessToken: null,
      mercadoPagoRefreshToken: null,
      mercadoPagoTokenExpiresAt: null,
    }) as never;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  restaurantSettingsRepository.findByRestaurantId = originalFindByRestaurantId;
  for (const name of Object.keys(process.env)) {
    if (!(name in originalEnv)) delete process.env[name];
  }
  Object.assign(process.env, originalEnv);
});

test('rastreia recusa com referência e códigos sem logar segredos nem texto do provedor', async (t) => {
  const events: Record<string, unknown>[] = [];
  t.mock.method(console, 'info', (_tag, value) => { events.push(value); });
  t.mock.method(console, 'warn', () => {});
  globalThis.fetch = async () => Response.json({
    id: 'ORD-REFUSED-001', status: 'failed',
    message: 'CVV 987 secret-card-token customer@example.test',
    errors: [{ code: 'card_payment_failed', message: 'secret-card-token' }],
    transactions: { payments: [{ id: 'PAY-REFUSED-001', status: 'failed', status_detail: 'high_risk', token: 'secret-card-token' }] },
  }, { status: 402, headers: { 'x-request-id': 'mp-request-001' } });
  await assert.rejects(directOrderCardPaymentService.execute({
    provider: CARD_PROVIDERS.MERCADO_PAGO,
    payload: { cardToken: 'secret-card-token', cardPaymentMethodId: 'visa', payerEmail: 'customer@example.test', mercadoPagoDeviceId: 'test-device-session' },
    order: { id: 500, publicId: 'order-500', restaurantId: 7, total: 10 },
    successUrlBase: 'https://pedido.local',
    idempotencyKey: '11111111-1111-4111-8111-111111111111',
    paymentAttemptId: '22222222-2222-4222-8222-222222222222',
  }), (error) => {
    assert.ok(error instanceof CardPaymentDeclinedError);
    assert.equal(error.diagnostic?.providerPaymentId, 'PAY-REFUSED-001');
    assert.equal(error.diagnostic?.providerRequestId, 'mp-request-001');
    assert.equal(error.diagnostic?.statusDetail, 'high_risk');
    assert.doesNotMatch(error.message, /987|secret|example/);
    return true;
  });
  assert.equal(events.length, 1);
  assert.equal(events[0].cardSource, 'new_card');
  assert.equal(events[0].hasDeviceSession, true);
  assert.equal(events[0].paymentAttemptId, '22222222-2222-4222-8222-222222222222');
  assert.equal(events[0].stage, 'charge');
  assert.doesNotMatch(JSON.stringify(events), /987|secret|customer@example/);
});

test('Mercado Pago não cria cobrança sem sessão antifraude', async (t) => {
  const events: Record<string, unknown>[] = [];
  t.mock.method(console, 'info', (_tag, value) => { events.push(value); });

  await assert.rejects(
    directOrderCardPaymentService.execute({
      provider: CARD_PROVIDERS.MERCADO_PAGO,
      payload: {
        cardToken: 'new-card-token',
        cardPaymentMethodId: 'master',
        payerEmail: 'cliente@example.test',
      },
      order: { id: 506, publicId: 'order-506', restaurantId: 7, total: 10 },
      successUrlBase: 'https://pedido.local',
      idempotencyKey: '11111111-1111-4111-8111-111111111506',
      paymentAttemptId: '22222222-2222-4222-8222-222222222506',
    }),
    (error) =>
      error instanceof CardPaymentProviderRequestError &&
      error.providerCode === 'missing_device_session' &&
      error.providerStatus === 422,
  );

  assert.equal(events.length, 1);
  assert.equal(events[0].stage, 'charge');
  assert.equal(events[0].outcome, 'blocked_before_charge');
  assert.equal(events[0].cardSource, 'new_card');
  assert.equal(events[0].hasDeviceSession, false);
});

test('status de pagamento desconhecido não aprova pela situação da order', async () => {
  globalThis.fetch = async () => Response.json({
    id: 'ORD-PENDING', status: 'processed', transactions: { payments: [{ status: 'future_pending_status' }] },
  }, { status: 201 });
  const result = await directOrderCardPaymentService.execute({
    provider: CARD_PROVIDERS.MERCADO_PAGO,
    payload: { cardToken: 'token-unknown', cardPaymentMethodId: 'visa', payerEmail: 'customer@example.test', mercadoPagoDeviceId: 'test-device-session' },
    order: { id: 501, publicId: 'order-501', restaurantId: 7, total: 10 },
    successUrlBase: 'https://pedido.local', idempotencyKey: '11111111-1111-4111-8111-111111111112',
  });
  assert.equal(result.paymentApproved, false);
});

test('checkout transparente Mercado Pago segue o contrato atual sem capture_mode', async () => {
  let requestBody: Record<string, unknown> | null = null;
  let requestHeaders: Headers | null = null;

  globalThis.fetch = async (input, init: RequestInit = {}) => {
    assert.equal(String(input), 'https://api.mercadopago.com/v1/orders');
    assert.equal(init.method, 'POST');
    requestHeaders = new Headers(init.headers);
    requestBody = JSON.parse(String(init.body || '{}')) as Record<string, unknown>;
    return new Response(
      JSON.stringify({
        id: 'ORD_CARD_001',
        status: 'processed',
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } },
    );
  };

  const result = await directOrderCardPaymentService.execute({
    provider: CARD_PROVIDERS.MERCADO_PAGO,
    payload: {
      cardToken: 'card-token-001',
      cardPaymentMethodId: 'master',
      customerName: 'Cliente Teste',
      customerPhone: '+55 (85) 99999-9999',
      payerEmail: 'cliente.real@example.com',
      holderTaxId: '12345678901',
      address: 'Rua Teste',
      number: '123',
      complement: 'Apto 45',
      district: 'Centro',
      city: 'Fortaleza',
      state: 'CE',
      zipCode: '60000-000',
      mercadoPagoDeviceId: 'device-session-901',
    },
    order: {
      id: 901,
      publicId: 'order-public-901',
      restaurantId: 7,
      total: 1,
      systemFee: 4.5,
      restaurant: { name: 'North Pizza' },
    },
    successUrlBase: 'https://www.gastronexa.com.br/north-pizza',
    idempotencyKey: '11111111-1111-4111-8111-111111111901',
  });

  assert.ok(requestBody);
  assert.ok(requestHeaders);
  assert.equal(requestHeaders.get('x-meli-session-id'), 'device-session-901');
  assert.equal(
    requestHeaders.get('x-idempotency-key'),
    '11111111-1111-4111-8111-111111111901',
  );
  assert.equal(requestBody.type, 'online');
  assert.equal(requestBody.processing_mode, 'automatic');
  assert.equal(Object.hasOwn(requestBody, 'capture_mode'), false);
  assert.equal(requestBody.total_amount, '1.00');
  assert.equal(requestBody.external_reference, 'ordercard_901_7');
  assert.deepEqual(requestBody.config, {
    online: {
      transaction_security: {
        validation: 'on_fraud_risk',
        liability_shift: 'required',
      },
    },
  });
  assert.equal(Object.hasOwn(requestBody, 'marketplace_fee'), false);
  assert.match(String(requestBody.external_reference), /^[A-Za-z0-9_-]+$/);
  assert.deepEqual(requestBody.payer, {
    email: 'cliente.real@example.com',
    first_name: 'Cliente',
    last_name: 'Teste',
    identification: {
      type: 'CPF',
      number: '12345678901',
    },
    phone: {
      area_code: '85',
      number: '999999999',
    },
    address: {
      zip_code: '60000000',
      street_name: 'Rua Teste',
      street_number: '123',
      neighborhood: 'Centro',
      city: 'Fortaleza',
      state: 'CE',
      complement: 'Apto 45',
    },
  });
  assert.deepEqual(requestBody.shipment, {
    address: {
      zip_code: '60000000',
      street_name: 'Rua Teste',
      street_number: '123',
      neighborhood: 'Centro',
      city: 'Fortaleza',
      state: 'CE',
      complement: 'Apto 45',
    },
  });

  const transactions = requestBody.transactions as {
    payments?: Array<{
      amount?: string;
      payment_method?: {
        id?: string;
        type?: string;
        token?: string;
        installments?: number;
      };
    }>;
  };
  assert.equal(transactions.payments?.[0]?.amount, '1.00');
  assert.deepEqual(transactions.payments?.[0]?.payment_method, {
    id: 'master',
    type: 'credit_card',
    token: 'card-token-001',
    installments: 1,
  });
  assert.equal(result.provider, CARD_PROVIDERS.MERCADO_PAGO);
  assert.equal(result.paymentApproved, true);
});

test('usuário autenticado preserva o e-mail informado no pagamento', async () => {
  let requestBody: Record<string, unknown> | null = null;

  globalThis.fetch = async (_input, init: RequestInit = {}) => {
    requestBody = JSON.parse(String(init.body || '{}')) as Record<string, unknown>;
    return new Response(
      JSON.stringify({ id: 'ORD_AUTH_EMAIL_001', status: 'processed' }),
      { status: 201, headers: { 'Content-Type': 'application/json' } },
    );
  };

  await directOrderCardPaymentService.execute({
    provider: CARD_PROVIDERS.MERCADO_PAGO,
    payload: {
      mercadoPagoDeviceId: 'test-device-session',
      userId: 33,
      cardToken: 'card-token-auth-email',
      cardPaymentMethodId: 'master',
      payerEmail: 'pagador@cartao.example',
    },
    order: {
      id: 908,
      publicId: 'order-public-908',
      restaurantId: 7,
      total: 19.9,
    },
    successUrlBase: 'https://www.gastronexa.com.br/north-pizza',
    idempotencyKey: '11111111-1111-4111-8111-111111111908',
  });

  assert.deepEqual(requestBody?.payer, { email: 'pagador@cartao.example' });
});

test('HTTP 2xx com transação failed é recusa terminal e preserva status_detail', async () => {
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        id: 'ORD_FAILED_2XX_001',
        status: 'failed',
        transactions: {
          payments: [
            {
              status: 'failed',
              status_detail: 'cc_rejected_bad_filled_security_code',
            },
          ],
        },
      }),
      {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
          'x-request-id': 'mp-request-2xx-failed-001',
        },
      },
    );

  await assert.rejects(
    () =>
      directOrderCardPaymentService.execute({
        provider: CARD_PROVIDERS.MERCADO_PAGO,
        payload: {
      mercadoPagoDeviceId: 'test-device-session',
          userId: 33,
          cardToken: 'card-token-2xx-failed',
          cardPaymentMethodId: 'master',
          payerEmail: 'pagador@example.com',
        },
        order: {
          id: 909,
          publicId: 'order-public-909',
          restaurantId: 7,
          total: 24.9,
        },
        successUrlBase: 'https://www.gastronexa.com.br/north-pizza',
        idempotencyKey: '11111111-1111-4111-8111-111111111909',
      }),
    (error) => {
      assert.ok(error instanceof CardPaymentDeclinedError);
      assert.equal(error.diagnostic?.status, 'failed');
      assert.equal(
        error.diagnostic?.statusDetail,
        'cc_rejected_bad_filled_security_code',
      );
      assert.equal(error.diagnostic?.providerOrderId, 'ORD_FAILED_2XX_001');
      return true;
    },
  );
});

test('débito Mercado Pago envia debit_card e nunca é convertido silenciosamente em crédito', async () => {
  let requestBody: Record<string, unknown> | null = null;

  globalThis.fetch = async (_input, init: RequestInit = {}) => {
    requestBody = JSON.parse(String(init.body || '{}')) as Record<string, unknown>;
    return new Response(
      JSON.stringify({ id: 'ORD_DEBIT_001', status: 'processed' }),
      { status: 201, headers: { 'Content-Type': 'application/json' } },
    );
  };

  const result = await directOrderCardPaymentService.execute({
    provider: CARD_PROVIDERS.MERCADO_PAGO,
    payload: {
      mercadoPagoDeviceId: 'test-device-session',
      cardPaymentType: 'debit',
      cardToken: 'test-debit-token',
      cardPaymentMethodId: 'visa',
      payerEmail: 'cliente@example.com',
    },
    order: {
      id: 902,
      publicId: 'order-public-debit-902',
      restaurantId: 7,
      total: 42.5,
      restaurant: { name: 'North Pizza' },
    },
    successUrlBase: 'https://www.gastronexa.com.br/north-pizza',
    idempotencyKey: '11111111-1111-4111-8111-111111111902',
  });

  const transactions = requestBody?.transactions as {
    payments?: Array<{ payment_method?: Record<string, unknown> }>;
  };
  assert.deepEqual(transactions.payments?.[0]?.payment_method, {
    id: 'visa',
    type: 'debit_card',
    token: 'test-debit-token',
  });
  assert.equal(Object.hasOwn(requestBody || {}, 'config'), false);
  assert.equal(result.paymentApproved, true);
});

test('recusa débito em gateway ainda não homologado sem expor dados do cartão', async () => {
  await assert.rejects(
    () =>
      directOrderCardPaymentService.execute({
        provider: CARD_PROVIDERS.ASAAS,
        payload: {
          cardPaymentType: 'debit',
          cardData: { number: '4111111111111111', securityCode: '123' },
        },
        order: {
          id: 906,
          publicId: 'order-public-906',
          restaurantId: 7,
          total: 20,
        },
        successUrlBase: 'https://www.gastronexa.com.br/north-pizza',
        idempotencyKey: '11111111-1111-4111-8111-111111111906',
      }),
    (error) =>
      error instanceof CardPaymentDeclinedError &&
      /débito online ainda não está disponível/i.test(error.message) &&
      !error.message.includes('4111111111111111'),
  );
});

test('Mercado Pago action_required retorna challenge 3DS seguro sem aprovar pedido', async () => {
  let requestBody: Record<string, unknown> | null = null;

  globalThis.fetch = async (_input, init: RequestInit = {}) => {
    requestBody = JSON.parse(String(init.body || '{}')) as Record<string, unknown>;
    return new Response(
      JSON.stringify({
        id: 'ORD_3DS_001',
        status: 'action_required',
        transactions: {
          payments: [
            {
              status: 'action_required',
              status_detail: 'pending_challenge',
              payment_method: {
                transaction_security: {
                  url: 'https://auth.mercadopago.com/card/validation?token=challenge',
                },
              },
            },
          ],
        },
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } },
    );
  };

  const result = await directOrderCardPaymentService.execute({
    provider: CARD_PROVIDERS.MERCADO_PAGO,
    payload: {
      mercadoPagoDeviceId: 'test-device-session',
      cardPaymentType: 'credit',
      cardToken: 'card-token-3ds',
      cardPaymentMethodId: 'master',
      payerEmail: 'cliente@example.com',
    },
    order: {
      id: 910,
      publicId: 'order-public-910',
      restaurantId: 7,
      total: 28.5,
    },
    successUrlBase: 'https://www.gastronexa.com.br/north-pizza',
    idempotencyKey: '11111111-1111-4111-8111-111111111910',
  });

  assert.deepEqual(requestBody?.config, {
    online: {
      transaction_security: {
        validation: 'on_fraud_risk',
        liability_shift: 'required',
      },
    },
  });
  assert.equal(result.paymentApproved, false);
  assert.equal(result.providerStatus, 'action_required');
  assert.equal(result.providerStatusDetail, 'pending_challenge');
  assert.equal(
    result.challengeUrl,
    'https://auth.mercadopago.com/card/validation?token=challenge',
  );
});

test('rejeita URL de challenge 3DS fora dos domínios do Mercado Pago', async () => {
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        id: 'ORD_3DS_BAD_URL',
        status: 'action_required',
        transactions: {
          payments: [
            {
              status: 'action_required',
              status_detail: 'pending_challenge',
              payment_method: {
                transaction_security: {
                  url: 'https://evil.example/phishing',
                },
              },
            },
          ],
        },
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } },
    );

  await assert.rejects(
    () =>
      directOrderCardPaymentService.execute({
        provider: CARD_PROVIDERS.MERCADO_PAGO,
        payload: {
      mercadoPagoDeviceId: 'test-device-session',
          cardPaymentType: 'credit',
          cardToken: 'card-token-3ds-bad',
          cardPaymentMethodId: 'master',
          payerEmail: 'cliente@example.com',
        },
        order: {
          id: 911,
          publicId: 'order-public-911',
          restaurantId: 7,
          total: 29.5,
        },
        successUrlBase: 'https://www.gastronexa.com.br/north-pizza',
        idempotencyKey: '11111111-1111-4111-8111-111111111911',
      }),
    (error) =>
      error instanceof CardPaymentProviderRequestError &&
      error.providerCode === 'missing_3ds_challenge_url',
  );
});

test('rejeita paymentMethodId legado e nunca envia cobrança de cartão salvo', async () => {
  let providerCalled = false;
  globalThis.fetch = async () => {
    providerCalled = true;
    return Response.json({}, { status: 500 });
  };

  await assert.rejects(
    directOrderCardPaymentService.execute({
      provider: CARD_PROVIDERS.MERCADO_PAGO,
      payload: {
        paymentMethodId: 'saved-card-public-id',
        cardToken: 'legacy-token',
        cardPaymentMethodId: 'master',
        mercadoPagoDeviceId: 'device-session',
      },
      order: { id: 912, publicId: 'order-public-912', restaurantId: 7, total: 10 },
      successUrlBase: 'https://www.gastronexa.com.br/north-pizza',
      idempotencyKey: '11111111-1111-4111-8111-111111111912',
    }),
    (error) =>
      error instanceof CardPaymentDeclinedError &&
      /Cartão salvo não está disponível/iu.test(error.message),
  );

  assert.equal(providerCalled, false);
});

test('property_value do Mercado Pago não é tratado como cartão recusado', async () => {
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        message: 'Invalid value for property',
        error: 'bad_request',
        cause: [
          {
            code: 'property_value',
            description: 'Invalid value for property',
          },
        ],
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );

  await assert.rejects(
    () =>
      directOrderCardPaymentService.execute({
        provider: CARD_PROVIDERS.MERCADO_PAGO,
        payload: {
      mercadoPagoDeviceId: 'test-device-session',
          cardToken: 'card-token-002',
          cardPaymentMethodId: 'visa',
          customerName: 'Cliente Teste',
        },
        order: {
          id: 902,
          publicId: 'order-public-902',
          restaurantId: 7,
          total: 1,
          systemFee: 0,
          restaurant: { name: 'North Pizza' },
        },
        successUrlBase: 'https://www.gastronexa.com.br/north-pizza',
      idempotencyKey: '11111111-1111-4111-8111-000000000003',
      }),
    (error) =>
      error instanceof CardPaymentProviderRequestError &&
      error.providerStatus === 400 &&
      error.providerCode === 'property_value' &&
      error.diagnostic?.provider === 'MERCADO_PAGO' &&
      error.diagnostic.httpStatus === 400 &&
      error.message === 'Não foi possível processar o cartão neste momento.',
  );
});


test('extrai status_detail seguro da recusa Mercado Pago', () => {
  assert.deepEqual(
    mercadoPagoDeclineDetails({
      errors: [{ message: 'The following transactions failed' }],
      data: {
        transactions: {
          payments: [
            {
              status: 'failed',
              status_detail: 'cc_rejected_bad_filled_security_code',
              token: 'nao-deve-ser-logado',
            },
          ],
        },
      },
    }),
    {
      transactionStatus: 'failed',
      transactionStatusDetail: 'cc_rejected_bad_filled_security_code',
    },
  );
});


test('preserva diagnóstico seguro do Mercado Pago em processing_error', async () => {
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        errors: [{ message: 'The following transactions failed' }],
        data: {
          transactions: {
            payments: [
              {
                status: 'failed',
                status_detail: 'processing_error',
                token: 'card-token-nao-deve-sair',
              },
            ],
          },
        },
      }),
      {
        status: 402,
        headers: {
          'Content-Type': 'application/json',
          'x-request-id': 'mp-request-processing-123',
        },
      },
    );

  await assert.rejects(
    () =>
      directOrderCardPaymentService.execute({
        provider: CARD_PROVIDERS.MERCADO_PAGO,
        payload: {
      mercadoPagoDeviceId: 'test-device-session',
          cardToken: 'card-token-003',
          cardPaymentMethodId: 'visa',
          payerEmail: 'cliente.real@example.com',
        },
        order: {
          id: 904,
          publicId: 'order-public-904',
          restaurantId: 7,
          total: 49.9,
          restaurant: { name: 'North Pizza' },
        },
        successUrlBase: 'https://www.gastronexa.com.br/north-pizza',
      idempotencyKey: '11111111-1111-4111-8111-000000000004',
      }),
    (error) => {
      assert.ok(error instanceof CardPaymentDeclinedError);
      assert.deepEqual(error.diagnostic, {
        provider: 'MERCADO_PAGO',
        httpStatus: 402,
        providerCode: null,
        status: 'failed',
        statusDetail: 'processing_error',
        providerRequestId: 'mp-request-processing-123',
        providerOrderId: null,
        providerPaymentId: null,
        providerCodes: [],
        hasUnrecognizedCode: false,
      });
      assert.equal(JSON.stringify(error.diagnostic).includes('card-token'), false);
      return true;
    },
  );
});

test('preserva invalid_card_token sem expor o token recebido', async () => {
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        errors: [
          {
            message: 'The following transactions failed',
            details: [{ status: 'failed', code: 'invalid_card_token' }],
          },
        ],
      }),
      {
        status: 402,
        headers: {
          'Content-Type': 'application/json',
          'x-request-id': 'mp-request-token-456',
        },
      },
    );

  await assert.rejects(
    () =>
      directOrderCardPaymentService.execute({
        provider: CARD_PROVIDERS.MERCADO_PAGO,
        payload: {
      mercadoPagoDeviceId: 'test-device-session',
          cardToken: 'secret-card-token-004',
          cardPaymentMethodId: 'master',
          payerEmail: 'cliente.real@example.com',
        },
        order: {
          id: 905,
          publicId: 'order-public-905',
          restaurantId: 7,
          total: 59.9,
          restaurant: { name: 'North Pizza' },
        },
        successUrlBase: 'https://www.gastronexa.com.br/north-pizza',
      idempotencyKey: '11111111-1111-4111-8111-000000000005',
      }),
    (error) => {
      assert.ok(error instanceof CardPaymentDeclinedError);
      assert.equal(error.diagnostic?.statusDetail, 'invalid_card_token');
      assert.equal(error.diagnostic?.providerRequestId, 'mp-request-token-456');
      assert.equal(JSON.stringify(error.diagnostic).includes('secret-card-token-004'), false);
      return true;
    },
  );
});


test('não registra texto do provedor que possa ecoar token em erro de validação', async () => {
  const originalConsoleError = console.error;
  const logged: unknown[][] = [];
  console.error = (...args: unknown[]) => {
    logged.push(args);
  };

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        message: 'invalid request',
        cause: [
          {
            code: 'property_value',
            description: 'token echoed secret-card-token-log-001',
          },
        ],
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );

  try {
    await assert.rejects(() =>
      directOrderCardPaymentService.execute({
        provider: CARD_PROVIDERS.MERCADO_PAGO,
        payload: {
      mercadoPagoDeviceId: 'test-device-session',
          cardToken: 'secret-card-token-log-001',
          cardPaymentMethodId: 'visa',
        },
        order: {
          id: 907,
          publicId: 'order-public-907',
          restaurantId: 7,
          total: 10,
        },
        successUrlBase: 'https://www.gastronexa.com.br/north-pizza',
        idempotencyKey: '11111111-1111-4111-8111-111111111907',
      }),
    );

    assert.ok(logged.length > 0);
    assert.equal(JSON.stringify(logged).includes('secret-card-token-log-001'), false);
    assert.equal(JSON.stringify(logged).includes('token echoed'), false);
  } finally {
    console.error = originalConsoleError;
  }
});
