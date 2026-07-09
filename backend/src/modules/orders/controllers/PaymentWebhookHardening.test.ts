import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

const originalHttpCreateServer = http.createServer;

http.createServer = ((...args) => {
  const server = originalHttpCreateServer(...args);
  server.listen = () => server;
  return server;
}) as typeof http.createServer;

const [
  { default: StripeOrderWebhookController },
  { default: MercadoPagoOrderWebhookController },
  { default: PagBankOrderWebhookController },
  { default: finalizeOrderCardPaymentService },
] = await Promise.all([
  import("./StripeOrderWebhookController.js"),
  import("./MercadoPagoOrderWebhookController.js"),
  import("./PagBankOrderWebhookController.js"),
  import("../services/FinalizeOrderCardPaymentService.js"),
]);

http.createServer = originalHttpCreateServer;

type MockResponse = {
  statusCode: number;
  payload: unknown;
  status: (code: number) => MockResponse;
  json: (body: unknown) => MockResponse;
  sendStatus: (code: number) => MockResponse;
};

const originalFinalizeExecute = finalizeOrderCardPaymentService.execute;
const originalEnv = {
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  ALLOW_INSECURE_STRIPE_WEBHOOK: process.env.ALLOW_INSECURE_STRIPE_WEBHOOK,
  ALLOW_GLOBAL_PAYMENT_FALLBACK: process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK,
  NODE_ENV: process.env.NODE_ENV,
};

function createMockResponse(): MockResponse {
  return {
    statusCode: 200,
    payload: undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.payload = body;
      return this;
    },
    sendStatus(code: number) {
      this.statusCode = code;
      return this;
    },
  };
}

afterEach(() => {
  finalizeOrderCardPaymentService.execute = originalFinalizeExecute;

  process.env.STRIPE_WEBHOOK_SECRET = originalEnv.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_SECRET_KEY = originalEnv.STRIPE_SECRET_KEY;
  process.env.ALLOW_INSECURE_STRIPE_WEBHOOK =
    originalEnv.ALLOW_INSECURE_STRIPE_WEBHOOK;
  process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK =
    originalEnv.ALLOW_GLOBAL_PAYMENT_FALLBACK;
  process.env.NODE_ENV = originalEnv.NODE_ENV;
});

test("deve rejeitar webhook Stripe sem assinatura quando secret esta configurado", async () => {
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  process.env.NODE_ENV = "test";

  const req = {
    body: Buffer.from("{}", "utf-8"),
    headers: {},
  } as any;
  const res = createMockResponse();

  await StripeOrderWebhookController.handle(req, res as any);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.payload, {
    error: "Assinatura Stripe ausente no webhook.",
  });
});

test("deve rejeitar webhook Stripe pago sem metadata obrigatoria", async () => {
  process.env.STRIPE_WEBHOOK_SECRET = "";
  process.env.NODE_ENV = "test";

  let finalizeCalls = 0;
  finalizeOrderCardPaymentService.execute = async () => {
    finalizeCalls += 1;
    return null;
  };

  const req = {
    body: {
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_123",
          payment_status: "paid",
          metadata: {
            orderId: "99",
          },
        },
      },
    },
    headers: {},
  } as any;
  const res = createMockResponse();

  await StripeOrderWebhookController.handle(req, res as any);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.payload, {
    error:
      "Webhook Stripe invalido: metadata orderId/restaurantId obrigatoria.",
  });
  assert.equal(finalizeCalls, 0);
});

test("deve retornar erro quando assinatura Stripe for invalida", async () => {
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_invalid_signature";
  process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
  process.env.NODE_ENV = "test";

  let finalizeCalls = 0;
  finalizeOrderCardPaymentService.execute = async () => {
    finalizeCalls += 1;
    return null;
  };

  const req = {
    body: Buffer.from(
      JSON.stringify({
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_invalid_sig",
            payment_status: "paid",
            metadata: {
              orderId: "1",
              restaurantId: "1",
            },
          },
        },
      }),
      "utf-8",
    ),
    headers: {
      "stripe-signature": "t=1710000000,v1=deadbeef",
    },
  } as any;
  const res = createMockResponse();

  await StripeOrderWebhookController.handle(req, res as any);

  assert.equal(res.statusCode, 500);
  assert.equal(finalizeCalls, 0);
});

test("deve finalizar pedido no webhook Stripe quando payload valido", async () => {
  process.env.STRIPE_WEBHOOK_SECRET = "";
  process.env.NODE_ENV = "test";

  const receivedPayloads: Array<Record<string, unknown>> = [];
  finalizeOrderCardPaymentService.execute = async (payload: any) => {
    receivedPayloads.push(payload);
    return null;
  };

  const req = {
    body: {
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_ok",
          payment_status: "paid",
          metadata: {
            orderId: "321",
            restaurantId: "7",
          },
        },
      },
    },
    headers: {},
  } as any;
  const res = createMockResponse();

  await StripeOrderWebhookController.handle(req, res as any);

  assert.equal(res.statusCode, 200);
  assert.equal(receivedPayloads.length, 1);
  assert.deepEqual(receivedPayloads[0], {
    orderId: "321",
    checkoutSessionId: "cs_test_ok",
    restaurantId: 7,
    allowMissingOrder: true,
  });
});

test("deve exigir restaurantId no webhook Mercado Pago quando fallback global estiver desativado", async () => {
  process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK = "false";

  const req = {
    body: {
      data: {
        id: "mp-payment-1",
      },
    },
    query: {},
  } as any;
  const res = createMockResponse();

  await MercadoPagoOrderWebhookController.handle(req, res as any);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.payload, {
    error:
      "restaurantId obrigatorio no webhook Mercado Pago para ambiente multi-tenant.",
  });
});

test("deve exigir restaurantId no webhook PagBank quando fallback global estiver desativado", async () => {
  process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK = "false";

  const req = {
    body: {
      notificationCode: "NTF-123",
    },
    query: {},
  } as any;
  const res = createMockResponse();

  await PagBankOrderWebhookController.handle(req, res as any);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.payload, {
    error:
      "restaurantId obrigatorio no webhook PagBank para ambiente multi-tenant.",
  });
});
