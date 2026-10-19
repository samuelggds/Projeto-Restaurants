import assert from 'node:assert/strict';
import test from 'node:test';
import { OrderType, PaymentMethod, TableOrderSettlementMode } from '@prisma/client';
import {
  prisma,
  runtimePrisma,
  resetTenantE2EDatabase,
  seedTenantE2EFixture,
  startTenantTestApplication,
} from './tenantE2EHarness.js';
import createOrderService from '../../modules/orders/services/CreateOrderService.js';
import finalizePix from '../../modules/orders/services/FinalizeOrderPixPaymentService.js';
import finalizeCard from '../../modules/orders/services/FinalizeOrderCardPaymentService.js';
import failPendingPayment from '../../modules/orders/services/FailPendingOrderPaymentService.js';
import pix from '../../modules/orders/services/OrderPixPaymentService.js';
import tableParticipantStateService from '../../modules/tableSession/services/TableParticipantStateService.js';

test(
  'mesa PAY_NOW: reserva, pagamento e desbloqueio atomicos com RLS e retry',
  { timeout: 120_000 },
  async (t) => {
    await resetTenantE2EDatabase();
    const fixture = await seedTenantE2EFixture();
    const app = await startTenantTestApplication();
    const originalApproval = pix.ensurePaymentApproved;
    const originalRelease = tableParticipantStateService.releaseOrderingAfterPayment;

    t.after(async () => {
      pix.ensurePaymentApproved = originalApproval;
      tableParticipantStateService.releaseOrderingAfterPayment = originalRelease;
      await app.close();
      await runtimePrisma.$disconnect();
      await prisma.$disconnect();
    });

    const restaurantId = fixture.restaurants.b.id;
    const tableSessionId = fixture.tableSessionB.id;
    const participantId = fixture.participantB.id;
    const blockedAt = async () => {
      const rows = await prisma.$queryRaw<Array<{ orderingBlockedAt: Date | null }>>`
        SELECT "orderingBlockedAt" FROM "TableParticipantState"
        WHERE "restaurantId" = ${restaurantId}
          AND "tableSessionId" = ${tableSessionId}
          AND "participantId" = ${participantId}
      `;
      assert.equal(rows.length, 1, 'o participante precisa ter estado persistido');
      return rows[0].orderingBlockedAt;
    };
    const makePending = async (paymentMethod: PaymentMethod) => {
      const order = await createOrderService.execute({
        restaurantId,
        userRestaurantId: restaurantId,
        userId: fixture.users.customerB.id,
        tableSessionId,
        tableSessionTableId: fixture.tables.b.id,
        participantId,
        settlementMode: TableOrderSettlementMode.PAY_NOW,
        type: OrderType.MESA,
        paymentMethod,
        deferRealtimeUntilPaid: true,
        paid: false,
        items: [{ productId: fixture.products.b.id, quantity: 1 }],
      });
      assert.ok(await blockedAt(), 'o bloqueio deve existir logo depois do commit do pedido');
      return order;
    };

    pix.ensurePaymentApproved = (async () => ({
      isApproved: true,
      sameRestaurant: true,
      status: 'approved',
    })) as typeof pix.ensurePaymentApproved;

    const first = await makePending(PaymentMethod.PIX);
    const paymentId = `mesa-e2e-pix-${first.id}`;
    await prisma.order.update({
      where: { id: first.id },
      data: { pixPaymentId: paymentId, pixExpiresAt: new Date(Date.now() + 600_000) },
    });
    const confirmPix = () =>
      finalizePix.execute({ orderId: first.id, restaurantId, paymentId });
    const [one, two] = await Promise.all([confirmPix(), confirmPix()]);
    assert.equal(one?.paid, true);
    assert.equal(two?.paid, true);
    assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: first.id } })).paid, true);
    assert.equal(await blockedAt(), null, 'o RLS nao pode impedir o desbloqueio');
    await confirmPix();
    assert.equal(await blockedAt(), null, 'retry nao deve reabrir estado financeiro');

    const second = await makePending(PaymentMethod.PIX);
    const retryPaymentId = `mesa-e2e-retry-${second.id}`;
    await prisma.order.update({
      where: { id: second.id },
      data: { pixPaymentId: retryPaymentId, pixExpiresAt: new Date(Date.now() + 600_000) },
    });
    tableParticipantStateService.releaseOrderingAfterPayment = (async () => {
      throw new Error('synthetic release failure before commit');
    }) as typeof tableParticipantStateService.releaseOrderingAfterPayment;
    try {
      await assert.rejects(
        finalizePix.execute({ orderId: second.id, restaurantId, paymentId: retryPaymentId }),
        /synthetic release failure/u,
      );
    } finally {
      tableParticipantStateService.releaseOrderingAfterPayment = originalRelease;
    }
    assert.equal(
      (await prisma.order.findUniqueOrThrow({ where: { id: second.id } })).paid,
      false,
      'pagamento nao pode persistir quando desbloqueio falha antes do commit',
    );
    assert.ok(await blockedAt(), 'o rollback nao pode remover o bloqueio isoladamente');
    await finalizePix.execute({ orderId: second.id, restaurantId, paymentId: retryPaymentId });
    assert.equal(await blockedAt(), null);

    const third = await makePending(PaymentMethod.PIX);
    const cancelled = await failPendingPayment.execute({ orderId: third.id, restaurantId });
    assert.equal(cancelled?.status, 'CANCELADO');
    assert.equal(await blockedAt(), null, 'falha no pagamento deve desbloquear no mesmo commit');
    await failPendingPayment.execute({ orderId: third.id, restaurantId });
    assert.equal(await blockedAt(), null);

    const fourth = await makePending(PaymentMethod.CARTAO);
    await prisma.order.update({
      where: { id: fourth.id },
      data: { cardCheckoutSessionId: `mesa-card-${fourth.id}` },
    });
    await finalizeCard.execute({
      orderId: fourth.id,
      restaurantId,
      checkoutSessionId: `mesa-card-${fourth.id}`,
    });
    assert.equal(
      (await prisma.order.findUniqueOrThrow({ where: { id: fourth.id } })).paid,
      true,
    );
    assert.equal(await blockedAt(), null, 'pagamento de cartao tambem libera a mesa');
  },
);
