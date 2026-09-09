import assert from 'node:assert/strict';
import test from 'node:test';
import { createHmac } from 'node:crypto';
import {
  apiRequest,
  prisma,
  runtimePrisma,
  resetTenantE2EDatabase,
  seedTenantE2EFixture,
  startTenantTestApplication,
} from './tenantE2EHarness.js';
import pix from '../../modules/orders/services/OrderPixPaymentService.js';
import finalizePix from '../../modules/orders/services/FinalizeOrderPixPaymentService.js';
import finalizeCard from '../../modules/orders/services/FinalizeOrderCardPaymentService.js';
import { registerRealtimeTransport } from '../../realtime/realtimePublisher.js';
import cancelOrder from '../../modules/orders/services/CancelOrderWorkflowService.js';
import orderRepository from '../../modules/orders/repositories/OrderRepository.js';
import terminalRepository from '../../modules/paymentTerminals/repositories/PaymentTerminalRepository.js';
import terminalService from '../../modules/paymentTerminals/services/PaymentTerminalService.js';

test(
  'retirada: concorrência e retomada com HTTP/PostgreSQL reais e gateway simulado',
  { timeout: 120_000 },
  async (t) => {
    await resetTenantE2EDatabase();
    const fixture = await seedTenantE2EFixture();
    const app = await startTenantTestApplication();
    const restaurantId = fixture.restaurants.a.id;
    await prisma.restaurantSettings.update({
      where: { restaurantId },
      data: { pixProvider: 'MERCADO_PAGO', cardGateway: 'MERCADO_PAGO' },
    });
    const originalCreatePix = pix.createPixPayment;
    const originalApprovePix = pix.ensurePaymentApproved;
    const originalPointRequest = terminalService.mercadoPagoRequest;
    const newOrder = () =>
      prisma.order.create({
        data: {
          restaurantId,
          userId: fixture.users.customerA.id,
          type: 'RETIRADA',
          status: 'PENDENTE',
          total: 25,
          itemsSubtotal: 25,
          paid: false,
          paymentMethod: null,
        },
      });
    const post = (id: number, action: string, json = {}, token = fixture.tokens.adminA) =>
      apiRequest(app.baseUrl, `/pickup-payments/${id}/${action}`, token, { method: 'POST', json });
    const pixResult = (id: number) => ({
      paymentId: String(800000 + id),
      status: 'pending',
      provider: 'MERCADO_PAGO' as const,
      totalAmount: 25,
      qrCode: `pix-${id}`,
      qrCodeBase64: null,
      requiresStatusCheck: true,
    });
    try {
      await t.test('cancelado e tenant externo não recebem nem iniciam cobrança', async () => {
        const order = await newOrder();
        await prisma.order.update({ where: { id: order.id }, data: { status: 'CANCELADO' } });
        let calls = 0;
        pix.createPixPayment = async () => {
          calls++;
          throw new Error('não deve chamar gateway');
        };
        for (const action of ['start', 'cash', 'reconcile']) {
          const result = await post(order.id, action, { method: 'PIX' });
          assert.equal(result.response.status, 400, JSON.stringify(result.data));
        }
        const another = await newOrder();
        assert.equal(
          (await post(another.id, 'cash', {}, fixture.tokens.adminB)).response.status,
          400,
        );
        assert.equal(
          (await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).paid,
          false,
        );
        assert.equal(
          (await prisma.order.findUniqueOrThrow({ where: { id: another.id } })).paid,
          false,
        );
        assert.equal(calls, 0);
      });

      await t.test(
        'duas confirmações em dinheiro preservam a primeira data de pagamento',
        async () => {
          const order = await newOrder();
          const results = await Promise.all([post(order.id, 'cash'), post(order.id, 'cash')]);
          for (const result of results)
            assert.equal(result.response.status, 200, JSON.stringify(result.data));
          assert.equal(results[0].data.paidAt, results[1].data.paidAt);
          assert.equal(results[0].data.paymentMethod, 'DINHEIRO');
        },
      );

      await t.test(
        'tentativa reservada bloqueia dinheiro, troca de método e cancelamento enquanto gateway responde',
        async () => {
          const order = await newOrder();
          let entered!: () => void;
          let release!: () => void;
          const gatewayEntered = new Promise<void>((resolve) => {
            entered = resolve;
          });
          const gatewayGate = new Promise<void>((resolve) => {
            release = resolve;
          });
          pix.createPixPayment = async () => {
            entered();
            await gatewayGate;
            return pixResult(order.id);
          };
          const start = post(order.id, 'start', { method: 'PIX' });
          await gatewayEntered;
          try {
            assert.equal((await post(order.id, 'cash')).response.status, 400);
            const changed = await post(order.id, 'start', { method: 'CARTAO' });
            assert.equal(changed.response.status, 400);
            assert.match(changed.data.error, /cobrança existente/i);
            const current = await orderRepository.findById(order.id, restaurantId);
            await assert.rejects(() => cancelOrder.execute(current!), /concilie a cobrança/i);
          } finally {
            release();
          }
          assert.equal((await start).response.status, 200);
          const current = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
          assert.equal(current.status, 'PENDENTE');
          assert.equal(current.paid, false);
          assert.equal(
            (
              await runtimePrisma.$queryRaw<
                Array<{ count: bigint }>
              >`SELECT COUNT(*)::bigint AS count FROM "DeliveryPayment" WHERE "orderId" = ${order.id}`
            )[0].count,
            1n,
          );
        },
      );

      await t.test(
        'timeout PIX retoma a mesma tentativa e chave pelo botão de consulta',
        async () => {
          const order = await newOrder();
          const keys: Array<string | undefined> = [];
          pix.createPixPayment = async (payload) => {
            keys.push(payload.idempotencyKey);
            if (keys.length === 1) throw new Error('timeout depois de criar cobrança');
            assert.equal(payload.resumeOnly, true);
            return pixResult(order.id);
          };
          pix.ensurePaymentApproved = async () => {
            throw new Error('ainda pendente');
          };
          assert.equal((await post(order.id, 'start', { method: 'PIX' })).response.status, 400);
          const resumed = await post(order.id, 'reconcile');
          assert.equal(resumed.response.status, 200, JSON.stringify(resumed.data));
          assert.equal(resumed.data.payment.pixCopyPaste, `pix-${order.id}`);
          assert.equal(keys.length, 2);
          assert.ok(keys[0]);
          assert.equal(keys[0], keys[1]);
        },
      );

      await t.test(
        'webhook que vence o timeout confirma pedido e tentativa na mesma transação',
        async () => {
          const order = await newOrder();
          pix.ensurePaymentApproved = async () => ({ isApproved: true, status: 'approved' }) as any;
          pix.createPixPayment = async () => {
            await finalizePix.execute({
              orderId: order.id,
              restaurantId,
              paymentId: pixResult(order.id).paymentId,
            });
            throw new Error('resposta perdida depois do webhook');
          };
          assert.equal((await post(order.id, 'start', { method: 'PIX' })).response.status, 400);
          const current = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
          assert.equal(current.paid, true);
          assert.equal(current.paymentMethod, 'PIX');
          assert.equal(current.pixPaymentId, pixResult(order.id).paymentId);
          assert.equal(
            (await terminalRepository.findDeliveryPayment(order.id, restaurantId))?.status,
            'PAID',
          );
          assert.equal((await post(order.id, 'cash')).response.status, 400);
          const repeated = await post(order.id, 'reconcile');
          assert.equal(repeated.response.status, 200);
          assert.equal(repeated.data.order.paidAt, current.paidAt?.toISOString());
        },
      );

      await t.test('cancelamento que vence a reserva impede chamada externa', async () => {
        const order = await newOrder();
        const current = await orderRepository.findById(order.id, restaurantId);
        await cancelOrder.execute(current!);
        let calls = 0;
        pix.createPixPayment = async () => {
          calls++;
          return pixResult(order.id);
        };
        assert.equal((await post(order.id, 'start', { method: 'PIX' })).response.status, 400);
        assert.equal(calls, 0);
      });

      await t.test(
        'Point retoma com chave estável e concilia sem duplicar confirmação',
        async () => {
          const order = await newOrder();
          await terminalRepository.upsertMercadoPagoTerminal({
            restaurantId,
            providerTerminalId: 'terminal-e2e',
            operatingMode: 'PDV',
          });
          const keys: string[] = [];
          terminalService.mercadoPagoRequest = async (_restaurantId, _path, options) => {
            if (options?.method === 'POST') {
              keys.push(String((options.headers as Record<string, string>)['X-Idempotency-Key']));
              if (keys.length === 1) throw new Error('timeout Point');
              return { id: `point-${order.id}`, status: 'created' } as any;
            }
            return {
              id: `point-${order.id}`,
              external_reference: `pickup-${restaurantId}-${order.id}`,
              type: 'point',
              status: 'processed',
              total_paid_amount: '25.00',
              transactions: {
                payments: [
                  { id: `point-payment-${order.id}`, status: 'processed', paid_amount: '25.00' },
                ],
              },
            } as any;
          };
          assert.equal((await post(order.id, 'start', { method: 'CARTAO' })).response.status, 400);
          assert.equal((await post(order.id, 'start', { method: 'CARTAO' })).response.status, 200);
          assert.equal(keys.length, 2);
          assert.equal(keys[0], keys[1]);
          const pointId = `point-${order.id}`;
          const signature = createHmac('sha256', process.env.MP_WEBHOOK_SECRET!)
            .update(`id:${pointId};request-id:pickup-e2e;ts:1742505638;`)
            .digest('hex');
          const webhook = () =>
            apiRequest(
              app.baseUrl,
              `/orders/webhook/mercadopago-point?data.id=${pointId}`,
              undefined,
              {
                method: 'POST',
                headers: {
                  'x-request-id': 'pickup-e2e',
                  'x-signature': `ts=1742505638,v1=${signature}`,
                },
                json: { data: { id: pointId } },
              },
            );
          const [firstWebhook, secondWebhook, reconciled] = await Promise.all([
            webhook(),
            webhook(),
            post(order.id, 'reconcile'),
          ]);
          assert.equal(firstWebhook.response.status, 200, JSON.stringify(firstWebhook.data));
          assert.equal(secondWebhook.response.status, 200, JSON.stringify(secondWebhook.data));
          const results = [reconciled, await post(order.id, 'reconcile')];
          for (const result of results)
            assert.equal(result.response.status, 200, JSON.stringify(result.data));
          assert.equal(results[0].data.order.paidAt, results[1].data.order.paidAt);
          assert.equal(
            (await terminalRepository.findDeliveryPayment(order.id, restaurantId))?.status,
            'PAID',
          );
        },
      );

      await t.test(
        'finalizadores PIX/cartão em corrida emitem confirmação somente no commit vencedor',
        async () => {
          const events: number[] = [];
          const unregister = registerRealtimeTransport({
            emit() {},
            to(room) {
              return {
                emit(event, payload: any) {
                  if (room === `restaurant:${restaurantId}` && event === 'order:payment-confirmed')
                    events.push(payload.orderId);
                },
              };
            },
          });
          try {
            for (const method of ['PIX', 'CARTAO'] as const) {
              const initial = await newOrder();
              const order = await prisma.order.update({
                where: { id: initial.id },
                data: { type: 'DELIVERY', paymentMethod: method },
              });
              pix.ensurePaymentApproved = async () =>
                ({ isApproved: true, status: 'approved' }) as any;
              const finalize = () =>
                method === 'PIX'
                  ? finalizePix.execute({
                      orderId: order.id,
                      restaurantId,
                      paymentId: String(900000 + order.id),
                    })
                  : finalizeCard.execute({
                      orderId: order.id,
                      restaurantId,
                      checkoutSessionId: `card-${order.id}`,
                    });
              const [first, second] = await Promise.all([finalize(), finalize()]);
              assert.equal(first?.paid, true);
              assert.equal(second?.paid, true);
              assert.equal(first?.paidAt?.toISOString(), second?.paidAt?.toISOString());
              assert.equal(events.filter((id) => id === order.id).length, 1);
            }
          } finally {
            unregister();
          }
        },
      );
    } finally {
      pix.createPixPayment = originalCreatePix;
      pix.ensurePaymentApproved = originalApprovePix;
      terminalService.mercadoPagoRequest = originalPointRequest;
      await app.close();
      await runtimePrisma.$disconnect();
      await prisma.$disconnect();
    }
  },
);
