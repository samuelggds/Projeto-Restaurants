import assert from 'node:assert/strict';
import test from 'node:test';
import { OrderStatus, OrderType, PaymentMethod } from '@prisma/client';
import {
  assertDisposableTenantDatabase,
  prisma,
  resetTenantE2EDatabase,
  runtimePrisma,
  seedTenantE2EFixture,
} from './tenantE2EHarness.js';
import pendingPixWorker from '../../modules/orders/jobs/OrderPendingPixPaymentReconciliationJob.js';
import finalizePix from '../../modules/orders/services/FinalizeOrderPixPaymentService.js';
import pix from '../../modules/orders/services/OrderPixPaymentService.js';

test(
  'PIX worker: falha de commit, replay e concorrencia sem nova cobranca ou vazamento de tenant',
  { timeout: 90_000 },
  async (t) => {
    // Ensaio inteiramente isolado: banco PostgreSQL descartavel da suite tenant.
    assertDisposableTenantDatabase();
    await resetTenantE2EDatabase();
    const fixture = await seedTenantE2EFixture();

    const originalGetPaymentStatus = pix.getPaymentStatus;
    const originalCreatePixPayment = pix.createPixPayment;
    t.after(async () => {
      pix.getPaymentStatus = originalGetPaymentStatus;
      pix.createPixPayment = originalCreatePixPayment;
      await runtimePrisma.$disconnect();
      await prisma.$disconnect();
    });

    type ProviderFixture = { orderId: number; restaurantId: number; amount: number };
    const approvedPayments = new Map<string, ProviderFixture>();
    const wrongTenantPayments = new Set<string>();
    let statusLookups = 0;
    let newChargeCalls = 0;

    // Substitui somente a resposta do gateway. O worker e a verificacao
    // financeira verdadeira (tenant, referencia, valor e moeda) continuam ativos.
    pix.getPaymentStatus = async ({ paymentId, restaurantId }) => {
      const expected = approvedPayments.get(paymentId);
      assert.ok(expected, 'somente cobrancas originais do fixture podem ser consultadas');
      assert.equal(restaurantId, expected.restaurantId, 'consulta sempre restrita ao tenant');
      statusLookups += 1;
      return {
        paymentId,
        provider: 'MERCADO_PAGO' as const,
        status: 'approved',
        statusDetail: null,
        isApproved: true,
        sameRestaurant: !wrongTenantPayments.has(paymentId),
        externalReference: `orderpix:${expected.restaurantId}:${expected.orderId}`,
        amount: expected.amount,
        currency: 'BRL',
        requiresStatusCheck: true,
      };
    };
    pix.createPixPayment = async () => {
      newChargeCalls += 1;
      throw new Error('A conciliacao nao pode criar nova cobranca.');
    };

    const tenantA = fixture.restaurants.a.id;
    const tenantB = fixture.restaurants.b.id;
    // Permite selecionar cobrancas criadas agora sem alterar o relogio do banco
    // ou diminuir a janela real de 90 segundos do worker.
    const sweepAt = new Date(Date.now() + 120_000);

    const createPendingPix = async (restaurantId: number, userId: number, total: number) => {
      const order = await prisma.order.create({
        data: {
          restaurantId,
          userId,
          type: OrderType.DELIVERY,
          status: OrderStatus.PENDENTE,
          paymentMethod: PaymentMethod.PIX,
          payOnDelivery: false,
          paid: false,
          total,
          itemsSubtotal: total,
          pixExpiresAt: new Date(Date.now() + 60 * 60_000),
        },
      });
      const paymentId = `tenant-e2e-worker-pix-${order.id}`;
      await prisma.order.update({
        where: { id: order.id },
        data: { pixPaymentId: paymentId },
      });
      approvedPayments.set(paymentId, { orderId: order.id, restaurantId, amount: total });
      return { id: order.id, paymentId };
    };

    const first = await createPendingPix(tenantA, fixture.users.customerA.id, 25);
    const second = await createPendingPix(tenantB, fixture.users.customerB.id, 35);
    const orderCountBefore = await prisma.order.count();

    // Injeta falha SQL na confirmacao de A. Simula indisponibilidade de escrita
    // no momento do commit, sem derrubar ou tocar no PostgreSQL de producao.
    const functionName = 'tenant_e2e_pix_worker_commit_fault';
    const triggerName = 'tenant_e2e_pix_worker_commit_fault_trigger';
    let functionCreated = false;
    let triggerCreated = false;
    try {
      await prisma.$executeRawUnsafe(`
        CREATE FUNCTION "${functionName}"() RETURNS trigger AS $$
        BEGIN
          IF NEW."id" = ${first.id}
             AND NEW."paid" IS TRUE
             AND OLD."paid" IS DISTINCT FROM TRUE THEN
            RAISE EXCEPTION 'tenant_e2e_worker_payment_commit_unavailable';
          END IF;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
      `);
      functionCreated = true;
      await prisma.$executeRawUnsafe(`
        CREATE TRIGGER "${triggerName}" BEFORE UPDATE ON "Order"
        FOR EACH ROW EXECUTE FUNCTION "${functionName}"()
      `);
      triggerCreated = true;

      // A falha de A nao pode impedir B de ser confirmado. O worker deve
      // sinalizar a falha para o sistema de agendamento/retry.
      await assert.rejects(() => pendingPixWorker.execute(sweepAt), AggregateError);
      const unavailable = await prisma.order.findUniqueOrThrow({ where: { id: first.id } });
      const independent = await prisma.order.findUniqueOrThrow({ where: { id: second.id } });
      assert.equal(unavailable.paid, false);
      assert.equal(unavailable.pixPaymentId, first.paymentId);
      assert.equal(independent.paid, true);
      assert.ok(independent.paidAt);
      assert.equal(independent.pixPaymentId, second.paymentId);
      assert.equal(await prisma.order.count(), orderCountBefore);
      assert.equal(newChargeCalls, 0);
    } finally {
      if (triggerCreated) {
        await prisma.$executeRawUnsafe(
          `DROP TRIGGER IF EXISTS "${triggerName}" ON "Order"`,
        );
      }
      if (functionCreated) {
        await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS "${functionName}"()`);
      }
    }

    // O worker retoma a cobranca original depois da recuperacao do banco.
    const recovery = await pendingPixWorker.execute(sweepAt);
    assert.deepEqual(recovery, { checkedCount: 1, confirmedCount: 1 });
    const recovered = await prisma.order.findUniqueOrThrow({ where: { id: first.id } });
    assert.equal(recovered.paid, true);
    assert.ok(recovered.paidAt);
    assert.equal(recovered.pixPaymentId, first.paymentId);
    assert.equal(await prisma.order.count(), orderCountBefore);
    assert.equal(newChargeCalls, 0);

    const third = await createPendingPix(tenantA, fixture.users.customerA.id, 45);
    const orderCountWithThird = await prisma.order.count();

    // Uma resposta remota indicando tenant incorreto nunca autoriza pagamento.
    wrongTenantPayments.add(third.paymentId);
    await assert.rejects(() => pendingPixWorker.execute(sweepAt), AggregateError);
    assert.equal(
      (await prisma.order.findUniqueOrThrow({ where: { id: third.id } })).paid,
      false,
    );
    wrongTenantPayments.delete(third.paymentId);

    // Duas instancias concorrentes, mesma cobranca aprovada: a trava do
    // finalizador impede duplicar o efeito financeiro da confirmacao.
    await Promise.all([
      pendingPixWorker.execute(sweepAt),
      pendingPixWorker.execute(sweepAt),
    ]);
    const confirmed = await prisma.order.findUniqueOrThrow({ where: { id: third.id } });
    assert.equal(confirmed.paid, true);
    assert.ok(confirmed.paidAt);
    assert.equal(confirmed.pixPaymentId, third.paymentId);

    // Repeticoes nao atualizam paidAt e nao iniciam cobrancas.
    await finalizePix.execute({
      orderId: third.id,
      restaurantId: tenantA,
      paymentId: third.paymentId,
    });
    const repeat = await pendingPixWorker.execute(sweepAt);
    assert.deepEqual(repeat, { checkedCount: 0, confirmedCount: 0 });
    const afterReplay = await prisma.order.findUniqueOrThrow({ where: { id: third.id } });
    assert.equal(afterReplay.paidAt?.toISOString(), confirmed.paidAt?.toISOString());
    assert.equal(afterReplay.pixPaymentId, third.paymentId);
    assert.equal(await prisma.order.count(), orderCountWithThird);
    assert.equal(newChargeCalls, 0);
    assert.ok(statusLookups >= 5, 'o gateway original deve ser reconsultado no retry');

    // Um restaurante nao pode consultar ou confirmar o pagamento do outro.
    await assert.rejects(() =>
      finalizePix.execute({
        orderId: second.id,
        restaurantId: tenantA,
        paymentId: second.paymentId,
      }),
    );
    assert.equal(newChargeCalls, 0);
  },
);
