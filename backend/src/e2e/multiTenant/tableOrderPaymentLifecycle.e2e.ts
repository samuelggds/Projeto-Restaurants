import assert from 'node:assert/strict';
import test from 'node:test';
import { OrderType, PaymentMethod, TableOrderSettlementMode } from '@prisma/client';
import { ZodError } from 'zod';
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
import { withTenantDbContext } from '../../database/tenantDbContext.js';

test(
  'mesa PAY_NOW: reserva, pagamento e desbloqueio atomicos com RLS e retry',
  { timeout: 120_000 },
  async (t) => {
    await resetTenantE2EDatabase();
    const fixture = await seedTenantE2EFixture();
    const app = await startTenantTestApplication();
    const originalGetPaymentStatus = pix.getPaymentStatus;
    const originalRelease = tableParticipantStateService.releaseOrderingAfterPayment;

    t.after(async () => {
      pix.getPaymentStatus = originalGetPaymentStatus;
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
    const makePending = async () => {
      const order = await createOrderService.execute({
        restaurantId,
        userRestaurantId: restaurantId,
        userId: fixture.users.customerB.id,
        tableSessionId,
        tableSessionTableId: fixture.tables.b.id,
        participantId,
        settlementMode: TableOrderSettlementMode.PAY_NOW,
        type: OrderType.MESA,
        paymentMethod: PaymentMethod.PIX,
        deferRealtimeUntilPaid: true,
        paid: false,
        items: [{ productId: fixture.products.b.id, quantity: 1 }],
      });
      assert.ok(await blockedAt(), 'o bloqueio deve existir logo depois do commit do pedido');
      return order;
    };

    // Simulamos apenas a resposta remota. A verificação real de
    // tenant, ID do pedido, valor e moeda permanece em ensurePaymentApproved.
    const approvedPayments = new Map<string, number>();
    pix.getPaymentStatus = async ({ paymentId, restaurantId: queriedTenantId }) => {
      assert.equal(Number(queriedTenantId), restaurantId);
      const expectedOrderId = approvedPayments.get(paymentId);
      assert.ok(expectedOrderId, 'somente PIX conhecidos pelo gateway simulado podem ser aprovados');
      return {
        paymentId,
        status: 'approved',
        statusDetail: null,
        provider: 'MERCADO_PAGO' as const,
        isApproved: true,
        sameRestaurant: true,
        externalReference: `orderpix:${restaurantId}:${expectedOrderId}`,
        amount: 35,
        currency: 'BRL',
        requiresStatusCheck: true,
      };
    };

    const first = await makePending();
    const paymentId = `mesa-e2e-pix-${first.id}`;
    await prisma.order.update({
      where: { id: first.id },
      data: { pixPaymentId: paymentId, pixExpiresAt: new Date(Date.now() + 600_000) },
    });
    approvedPayments.set(paymentId, first.id);
    const confirmPix = () =>
      finalizePix.execute({ orderId: first.id, restaurantId, paymentId });
    const [one, two] = await Promise.all([confirmPix(), confirmPix()]);
    assert.equal(one?.paid, true);
    assert.equal(two?.paid, true);
    assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: first.id } })).paid, true);
    assert.equal(await blockedAt(), null, 'o RLS nao pode impedir o desbloqueio');
    await confirmPix();
    assert.equal(await blockedAt(), null, 'retry nao deve reabrir estado financeiro');

    const second = await makePending();
    const retryPaymentId = `mesa-e2e-retry-${second.id}`;
    await prisma.order.update({
      where: { id: second.id },
      data: { pixPaymentId: retryPaymentId, pixExpiresAt: new Date(Date.now() + 600_000) },
    });
    approvedPayments.set(retryPaymentId, second.id);
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

    const third = await makePending();
    const cancelled = await failPendingPayment.execute({ orderId: third.id, restaurantId });
    assert.equal(cancelled?.status, 'CANCELADO');
    assert.equal(await blockedAt(), null, 'falha no pagamento deve desbloquear no mesmo commit');
    await failPendingPayment.execute({ orderId: third.id, restaurantId });
    assert.equal(await blockedAt(), null);

    // Uma nova compra PAY_NOW da mesa somente permite PIX: não abrir exceção
    // de checkout com cartão para satisfazer artificialmente este teste.
    await assert.rejects(
      createOrderService.execute({
        restaurantId,
        userRestaurantId: restaurantId,
        userId: fixture.users.customerB.id,
        tableSessionId,
        tableSessionTableId: fixture.tables.b.id,
        participantId,
        settlementMode: TableOrderSettlementMode.PAY_NOW,
        type: OrderType.MESA,
        paymentMethod: PaymentMethod.CARTAO,
        deferRealtimeUntilPaid: true,
        paid: false,
        items: [{ productId: fixture.products.b.id, quantity: 1 }],
      }),
      ZodError,
      'cartão não deve ser aceito ao criar PAY_NOW na mesa',
    );

    // Compatibilidade com pedidos de mesa antigos que ainda tenham cartão.
    // O teste persiste a situação legada no banco, sem permitir criá-la pela API.
    const legacyCardOrder = await prisma.order.create({
      data: {
        restaurantId,
        tableId: fixture.tables.b.id,
        tableSessionId,
        participantId,
        userId: fixture.users.customerB.id,
        type: OrderType.MESA,
        paymentMethod: PaymentMethod.CARTAO,
        settlementMode: TableOrderSettlementMode.PAY_NOW,
        tableFinancialStatus: 'PROCESSING',
        status: 'PENDENTE',
        paid: false,
        total: 35,
        itemsSubtotal: 35,
        cardCheckoutSessionId: 'legacy-card-table-e2e',
      },
    });
    const legacyItem = await prisma.orderItem.create({
      data: {
        restaurantId,
        orderId: legacyCardOrder.id,
        tableSessionId,
        participantId,
        productId: fixture.products.b.id,
        quantity: 1,
        price: 35,
      },
    });
    await prisma.tableBillItem.create({
      data: {
        restaurantId,
        tableSessionId,
        participantId,
        orderId: legacyCardOrder.id,
        orderItemId: legacyItem.id,
        unitIndex: 1,
        productName: fixture.products.b.name,
        unitPriceCents: 3500n,
        financialStatus: 'PROCESSING',
      },
    });
    await withTenantDbContext(restaurantId, (tx) =>
      tableParticipantStateService.blockOrderingUntilPayment(tx, {
        restaurantId,
        tableSessionId,
        participantId,
      }),
    );
    assert.ok(await blockedAt(), 'registro legado está bloqueado antes da confirmação');
    await finalizeCard.execute({
      orderId: legacyCardOrder.id,
      restaurantId,
      checkoutSessionId: 'legacy-card-table-e2e',
    });
    assert.equal(
      (await prisma.order.findUniqueOrThrow({ where: { id: legacyCardOrder.id } })).paid,
      true,
    );
    assert.equal(await blockedAt(), null, 'pagamento legado por cartão também libera a mesa');
  },
);
