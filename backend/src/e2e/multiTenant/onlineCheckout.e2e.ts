import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import {
  apiRequest,
  prisma,
  runtimePrisma,
  resetTenantE2EDatabase,
  seedTenantE2EFixture,
  startTenantTestApplication,
} from './tenantE2EHarness.js';
import pix from '../../modules/orders/services/OrderPixPaymentService.js';
import { getCardCheckoutProviderHandler } from '../../modules/orders/services/cardCheckoutProviders.js';

test(
  'checkout online: resposta perdida, concorrência e retry não repetem pedido ou gateway',
  { timeout: 90_000 },
  async (t) => {
    await resetTenantE2EDatabase();
    const fixture = await seedTenantE2EFixture();
    const app = await startTenantTestApplication();
    t.after(async () => {
      await app.close();
      await runtimePrisma.$disconnect();
      await prisma.$disconnect();
    });
    const restaurantId = fixture.restaurants.a.id;
    const productId = fixture.products.a.id;
    await prisma.restaurantSettings.update({
      where: { restaurantId },
      data: { cardGateway: 'PAGBANK', pixProvider: 'MERCADO_PAGO' },
    });
    await prisma.product.update({ where: { id: productId }, data: { stock: 10 } });
    const card = getCardCheckoutProviderHandler('PAGBANK');
    const originalPix = pix.createPixPayment;
    const originalCard = card.createCheckout;
    const initialOrders = await prisma.order.count({ where: { restaurantId } });
    let consumed = 0;
    try {
      for (const method of ['PIX', 'CARTAO'] as const)
        for (const ambiguous of [false, true]) {
          await t.test(`${method}, gateway ambíguo=${ambiguous}`, async () => {
            let calls = 0;
            pix.createPixPayment = async (payload) => {
              calls++;
              if (ambiguous) throw new Error('synthetic lost gateway response');
              return {
                paymentId: String(900000 + Number(payload.orderId)),
                status: 'pending',
                provider: 'MERCADO_PAGO',
                totalAmount: 25,
                qrCode: 'synthetic-qr',
                qrCodeBase64: null,
                requiresStatusCheck: true,
              };
            };
            card.createCheckout = async () => {
              calls++;
              if (ambiguous) throw new Error('synthetic lost gateway response');
              return {
                provider: 'PAGBANK',
                sessionId: `checkout-${randomUUID()}`,
                checkoutUrl: 'https://payments.example.test/checkout',
              };
            };
            const payload = {
              restaurantId,
              type: 'RETIRADA',
              paymentMethod: method,
              items: [{ productId, quantity: 1 }],
            };
            const key = randomUUID();
            const endpoint = method === 'PIX' ? '/orders/pix/payment' : '/orders/card/checkout';
            const post = (body = payload) =>
              apiRequest(app.baseUrl, endpoint, fixture.tokens.adminA, {
                method: 'POST',
                headers: { 'Idempotency-Key': key },
                json: body,
              });
            const pair = await Promise.all([post(), post()]);
            assert.deepEqual(
              pair.map((r) => r.response.status).sort(),
              ambiguous ? [502, 502] : [201, 502],
              JSON.stringify(pair.map((r) => r.data)),
            );
            const orderId = pair[0].data.orderId;
            assert.equal(pair[1].data.orderId, orderId);
            // Treat the first HTTP response as lost, then retry from the same browser attempt.
            const retry = await post();
            assert.equal(retry.response.status, 502);
            assert.equal(retry.data.code, 'PAYMENT_CREATION_UNCERTAIN');
            assert.equal(retry.data.orderId, orderId);
            assert.equal(calls, 1, 'only the transaction winner invokes the external gateway');
            consumed++;
            assert.equal(
              await prisma.order.count({ where: { restaurantId } }),
              initialOrders + consumed,
            );
            assert.equal(
              (await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stock,
              10 - consumed,
            );
            const conflict = await post({ ...payload, items: [{ productId, quantity: 2 }] });
            assert.equal(conflict.response.status, 409);
            assert.equal(conflict.data.code, 'IDEMPOTENCY_CONFLICT');
          });
        }
    } finally {
      pix.createPixPayment = originalPix;
      card.createCheckout = originalCard;
    }
  },
);
