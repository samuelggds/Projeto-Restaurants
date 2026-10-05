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
      payerEmail: 'cliente.real@example.com',
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

for (const scenario of ['updated', 'refresh-failed', 'shared-customer', 'unverified-email']) {
  test(`cartão salvo valida cadastro antes da Order: ${scenario}`, async () => {
    const refreshFails = scenario === 'refresh-failed';
    let requestBody: Record<string, unknown> | null = null;
    let requestHeaders = new Headers();
    const requests: string[] = [];

    restaurantSettingsRepository.findByRestaurantId = async () =>
      ({
        restaurantId: 7,
        cardGateway: 'MERCADO_PAGO',
        mercadoPagoAccessToken: 'restaurant-access-token',
        mercadoPagoRefreshToken: 'restaurant-refresh-token',
        mercadoPagoTokenExpiresAt: new Date(Date.now() + 3_600_000),
      }) as never;

    const originalTransaction = prisma.$transaction;
    prisma.$transaction = async (callback: any) =>
      callback({
        $queryRaw: async () => [{ set_config: '7' }],
        customerPaymentMethod: {
          findFirst: async (query: { where: Record<string, unknown> }) => {
            if (!query.where.publicId) {
              assert.deepEqual(query.where, {
                restaurantId: 7,
                provider: 'MERCADO_PAGO',
                providerCustomerId: 'customer-mp-123',
                userId: { not: 33 },
              });
              return scenario === 'shared-customer' ? { id: 456 } : null;
            }
            assert.deepEqual(query.where, {
              publicId: 'saved-card-public-id',
              userId: 33,
              restaurantId: 7,
              provider: 'MERCADO_PAGO',
              active: true,
            });
            return {
              publicId: 'saved-card-public-id',
              userId: 33,
              restaurantId: 7,
              provider: 'MERCADO_PAGO',
              providerCustomerId: 'customer-mp-123',
              providerPaymentMethodId: 'card-mp-123',
              brand: 'master',
              last4: '0829',
              active: true,
              user: {
                name: 'Cliente Teste',
                email: 'cliente@example.test',
                cpf: '12345678901',
                emailVerifiedAt: scenario === 'unverified-email' ? null : new Date(),
              },
            };
          },
        },
      });

    globalThis.fetch = async (input, init: RequestInit = {}) => {
      const url = String(input);
      requests.push(`${init.method} ${url}`);
      if (url.endsWith('/customers/customer-mp-123/cards/card-mp-123')) {
        return Response.json({
          id: 'card-mp-123',
          customer_id: 'customer-mp-123',
          last_four_digits: '0829',
          payment_method: { id: 'master' },
          cardholder: {
            name: 'Cliente Teste',
            identification: { type: 'CPF', number: '12345678901' },
          },
        });
      }
      if (url.endsWith('/customers/customer-mp-123')) {
        if (init.method === 'PUT') {
          assert.deepEqual(JSON.parse(String(init.body)), {
            first_name: 'Cliente Teste',
            identification: { type: 'CPF', number: '12345678901' },
          });
          if (refreshFails) return Response.json({ message: 'Unavailable' }, { status: 503 });
        }
        return Response.json({ id: 'customer-mp-123', email: 'cliente@example.test' });
      }
      assert.equal(url, 'https://api.mercadopago.com/v1/orders');
      requestBody = JSON.parse(String(init.body || '{}')) as Record<string, unknown>;
      requestHeaders = new Headers(init.headers);
      return new Response(
        JSON.stringify({
          id: 'ORD_CARD_SAVED_001',
          status: 'processed',
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      );
    };

    try {
      const payment = directOrderCardPaymentService.execute({
        provider: CARD_PROVIDERS.MERCADO_PAGO,
        payload: {
          userId: 33,
          paymentMethodId: 'saved-card-public-id',
          cardToken: 'saved-card-cvv-token',
          cardPaymentMethodId: 'master',
          mercadoPagoDeviceId: 'saved-card-device-session',
        },
        order: {
          id: 903,
          publicId: 'order-public-903',
          restaurantId: 7,
          total: 50,
          restaurant: { name: 'North Pizza' },
        },
        successUrlBase: 'https://www.gastronexa.com.br/north-pizza',
        idempotencyKey: '11111111-1111-4111-8111-111111111903',
      });

      if (refreshFails) {
        await assert.rejects(
          payment,
          (error) =>
            error instanceof CardPaymentProviderRequestError &&
            error.providerCode === 'saved_card_refresh_failed',
        );
        assert.equal(requestBody, null);
        assert.equal(
          requests.some((request) => request.endsWith('/v1/orders')),
          false,
        );
        return;
      }
      const result = await payment;

      assert.ok(requestBody);
      assert.deepEqual(requestBody.payer, { customer_id: 'customer-mp-123' });
      assert.equal(requestHeaders.get('x-meli-session-id'), 'saved-card-device-session');
      assert.equal(result.paymentApproved, true);
      if (scenario === 'updated') assert.ok(requests[2].startsWith('PUT '));
      else
        assert.equal(
          requests.some((request) => request.startsWith('PUT ')),
          false,
        );
      assert.equal(requests.at(-1), 'POST https://api.mercadopago.com/v1/orders');
    } finally {
      prisma.$transaction = originalTransaction;
    }
  });
}

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
