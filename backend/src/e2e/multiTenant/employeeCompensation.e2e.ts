import assert from 'node:assert/strict';
import test from 'node:test';

import { withTenantDbContext } from '../../database/tenantDbContext.js';
import waiterCompensationProjectionService from '../../modules/employeeCompensation/services/WaiterCompensationProjectionService.js';
import {
  apiRequest,
  prisma,
  resetTenantE2EDatabase,
  seedTenantE2EFixture,
  startTenantTestApplication,
} from './tenantE2EHarness.js';

test(
  'ledger de funcionários preserva tenant, snapshots, reversões e pagamentos parciais',
  { timeout: 120_000 },
  async (t) => {
    await resetTenantE2EDatabase();
    const fixture = await seedTenantE2EFixture();
    const application = await startTenantTestApplication();
    const request = (
      path: string,
      token: string,
      method = 'GET',
      json?: unknown,
      idempotencyKey?: string,
    ) =>
      apiRequest(application.baseUrl, path, token, {
        method,
        ...(json !== undefined ? { json } : {}),
        ...(idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : {}),
      });

    try {
      const policyPayload = {
        baseModel: 'FIXED_MONTHLY',
        fixedMonthlyCents: 300_000,
        variableModel: 'TABLE_SALES_PERCENTAGE',
        variableBasisPoints: 1_000,
        prorationMode: 'NONE',
        effectiveFrom: '2025-01-01T03:00:00.000Z',
      };

      await t.test('employeeId de outro tenant não atravessa a autorização', async () => {
        const denied = await request(
          `/employee-compensation/admin/employees/${fixture.users.employeeB.id}/policies`,
          fixture.tokens.adminA,
          'POST',
          policyPayload,
        );
        assert.equal(denied.response.status, 404);
        assert.equal(await prisma.employeeCompensationPolicy.count(), 0);
      });

      let policyPublicId = '';
      await t.test('admin cria política versionada para garçom do próprio tenant', async () => {
        const created = await request(
          `/employee-compensation/admin/employees/${fixture.users.employeeB.id}/policies`,
          fixture.tokens.adminB,
          'POST',
          policyPayload,
        );
        assert.equal(created.response.status, 201, JSON.stringify(created.data));
        assert.equal(created.data.fixedMonthlyCents, 300_000);
        assert.equal(created.data.variableBasisPoints, 1_000);
        assert.equal(created.data.version, 1);
        policyPublicId = created.data.publicId;
      });

      await t.test('assignment explícito direciona a comissão da conta canônica', async () => {
        const assigned = await request(
          `/employee-compensation/admin/table-sessions/${fixture.tableSessionB.id}/waiter`,
          fixture.tokens.adminB,
          'PUT',
          { waiterId: fixture.users.employeeB.id },
        );
        assert.equal(assigned.response.status, 200, JSON.stringify(assigned.data));
        assert.equal(assigned.data.waiterId, fixture.users.employeeB.id);

        const paidAt = new Date();
        const closedAt = new Date(paidAt.getTime() + 1_000);
        await prisma.$transaction([
          prisma.order.update({
            where: { id: fixture.tableOrderB.id },
            data: { status: 'ENTREGUE', paid: true, paidAt },
          }),
          prisma.tableBillItem.update({
            where: { id: fixture.tableBillItemB.id },
            data: { financialStatus: 'PAID', paidAt },
          }),
          prisma.tablePaymentIntent.update({
            where: { id: fixture.paymentIntentB.id },
            data: { status: 'PAID', paidAt },
          }),
          prisma.tableSession.update({
            where: { id: fixture.tableSessionB.id },
            data: { status: 'CLOSED', closedAt, closedById: fixture.users.adminB.id },
          }),
        ]);

        const projected = await withTenantDbContext(fixture.restaurants.b.id, (db) =>
          waiterCompensationProjectionService.project({
            db,
            restaurantId: fixture.restaurants.b.id,
            tableSessionId: fixture.tableSessionB.id,
            now: closedAt,
          }),
        );
        assert.equal(projected.created, true);
        const earning = await prisma.employeeEarning.findFirstOrThrow({
          where: {
            restaurantId: fixture.restaurants.b.id,
            tableSessionId: fixture.tableSessionB.id,
            direction: 'CREDIT',
          },
        });
        assert.equal(earning.amountCents, 350n);
        assert.equal(earning.policyVersion, 1);
        assert.ok(
          earning.snapshot &&
            typeof earning.snapshot === 'object' &&
            !Array.isArray(earning.snapshot),
        );
        assert.equal(earning.snapshot.policyPublicId, policyPublicId);
      });

      await t.test('reembolso total cria débito compensatório sem alterar o crédito', async () => {
        const refundedAt = new Date();
        await prisma.$transaction([
          prisma.tableBillItem.update({
            where: { id: fixture.tableBillItemB.id },
            data: { financialStatus: 'REFUNDED' },
          }),
          prisma.tablePaymentIntent.update({
            where: { id: fixture.paymentIntentB.id },
            data: { status: 'REFUNDED', refundedAt },
          }),
        ]);
        await withTenantDbContext(fixture.restaurants.b.id, (db) =>
          waiterCompensationProjectionService.project({
            db,
            restaurantId: fixture.restaurants.b.id,
            tableSessionId: fixture.tableSessionB.id,
            now: refundedAt,
          }),
        );

        const earnings = await prisma.employeeEarning.findMany({
          where: {
            restaurantId: fixture.restaurants.b.id,
            tableSessionId: fixture.tableSessionB.id,
          },
          orderBy: { createdAt: 'asc' },
        });
        assert.deepEqual(
          earnings.map((earning) => [earning.direction, earning.amountCents]),
          [
            ['CREDIT', 350n],
            ['DEBIT', 350n],
          ],
        );
        assert.equal(earnings[1].reversesEarningId, earnings[0].id);
        assert.equal(earnings[1].paymentIntentId, fixture.paymentIntentB.id);
      });

      await t.test('horas canceladas podem ser corrigidas e usam a policy vigente', async () => {
        const hourlyEmployee = await prisma.user.create({
          data: {
            name: 'Cozinha Horista B',
            email: 'hourly-employee-b@tenant-e2e.test',
            password: 'not-used-by-this-test',
            role: 'FUNCIONARIO',
            subRole: 'COZINHA',
            restaurantId: fixture.restaurants.b.id,
          },
        });
        const policy = await request(
          `/employee-compensation/admin/employees/${hourlyEmployee.id}/policies`,
          fixture.tokens.adminB,
          'POST',
          {
            baseModel: 'HOURLY',
            hourlyRateCents: 1_200,
            variableModel: 'NONE',
            prorationMode: 'NONE',
            effectiveFrom: '2025-01-01T03:00:00.000Z',
          },
        );
        assert.equal(policy.response.status, 201, JSON.stringify(policy.data));

        const mistaken = await request(
          '/employee-compensation/admin/work-entries',
          fixture.tokens.adminB,
          'POST',
          { employeeId: hourlyEmployee.id, workDate: '2025-01-10', minutesWorked: 60 },
        );
        assert.equal(mistaken.response.status, 201);
        const canceled = await request(
          `/employee-compensation/admin/work-entries/${mistaken.data.publicId}/cancel`,
          fixture.tokens.adminB,
          'POST',
          { reason: 'Minutos lançados incorretamente' },
        );
        assert.equal(canceled.response.status, 200);
        assert.equal(canceled.data.status, 'CANCELED');

        const replacement = await request(
          '/employee-compensation/admin/work-entries',
          fixture.tokens.adminB,
          'POST',
          { employeeId: hourlyEmployee.id, workDate: '2025-01-10', minutesWorked: 90 },
        );
        assert.equal(replacement.response.status, 201, JSON.stringify(replacement.data));
        const approved = await request(
          `/employee-compensation/admin/work-entries/${replacement.data.publicId}/approve`,
          fixture.tokens.adminB,
          'POST',
        );
        assert.equal(approved.response.status, 200);
        assert.equal(approved.data.status, 'APPROVED');

        const settlement = await request(
          '/employee-compensation/admin/settlements',
          fixture.tokens.adminB,
          'POST',
          { employeeId: hourlyEmployee.id, referenceMonth: '2025-01' },
        );
        assert.equal(settlement.response.status, 201, JSON.stringify(settlement.data));
        assert.equal(settlement.data.totalDueCents, 1_800);
        assert.equal(settlement.data.items.length, 1);
        const earning = await prisma.employeeEarning.findFirstOrThrow({
          where: { employeeId: hourlyEmployee.id, type: 'HOURLY' },
        });
        assert.equal(earning.amountCents, 1_800n);
        assert.equal(earning.policyVersion, 1);

        const canceledSettlement = await request(
          `/employee-compensation/admin/settlements/${settlement.data.publicId}/cancel`,
          fixture.tokens.adminB,
          'POST',
          { reason: 'Acerto será recalculado após a correção das horas' },
        );
        assert.equal(canceledSettlement.response.status, 200);
        assert.equal(canceledSettlement.data.status, 'CANCELED');

        const regeneratedSettlement = await request(
          '/employee-compensation/admin/settlements',
          fixture.tokens.adminB,
          'POST',
          { employeeId: hourlyEmployee.id, referenceMonth: '2025-01' },
        );
        assert.equal(regeneratedSettlement.response.status, 201);
        assert.equal(regeneratedSettlement.data.publicId, settlement.data.publicId);
        assert.equal(regeneratedSettlement.data.status, 'DRAFT');
        assert.equal(regeneratedSettlement.data.totalDueCents, 1_800);
        assert.equal(regeneratedSettlement.data.items.length, 1);
        assert.equal(regeneratedSettlement.data.canceledAt, null);
        assert.equal(regeneratedSettlement.data.cancelReason, null);
        assert.ok(regeneratedSettlement.data.version > canceledSettlement.data.version);
      });

      await t.test('ajustes idempotentes compõem o acerto mensal com a base', async () => {
        const bonusPayload = {
          employeeId: fixture.users.employeeB.id,
          type: 'BONUS',
          amountCents: 10_000,
          reason: 'Meta operacional de janeiro',
          occurredAt: '2025-01-15T12:00:00.000Z',
        };
        const firstBonus = await request(
          '/employee-compensation/admin/earnings/adjustments',
          fixture.tokens.adminB,
          'POST',
          bonusPayload,
          'employee-bonus-january-2025',
        );
        const repeatedBonus = await request(
          '/employee-compensation/admin/earnings/adjustments',
          fixture.tokens.adminB,
          'POST',
          bonusPayload,
          'employee-bonus-january-2025',
        );
        assert.equal(firstBonus.response.status, 201, JSON.stringify(firstBonus.data));
        assert.equal(repeatedBonus.response.status, 201);
        assert.equal(repeatedBonus.data.publicId, firstBonus.data.publicId);

        const conflictingReplay = await request(
          '/employee-compensation/admin/earnings/adjustments',
          fixture.tokens.adminB,
          'POST',
          { ...bonusPayload, amountCents: 11_000 },
          'employee-bonus-january-2025',
        );
        assert.equal(conflictingReplay.response.status, 409);

        const deduction = await request(
          '/employee-compensation/admin/earnings/adjustments',
          fixture.tokens.adminB,
          'POST',
          {
            employeeId: fixture.users.employeeB.id,
            type: 'DEDUCTION',
            amountCents: 5_000,
            reason: 'Adiantamento documentado',
            occurredAt: '2025-01-20T12:00:00.000Z',
          },
          'employee-deduction-january-2025',
        );
        assert.equal(deduction.response.status, 201);

        const settlement = await request(
          '/employee-compensation/admin/settlements',
          fixture.tokens.adminB,
          'POST',
          { employeeId: fixture.users.employeeB.id, referenceMonth: '2025-01' },
        );
        assert.equal(settlement.response.status, 201, JSON.stringify(settlement.data));
        assert.equal(settlement.data.grossCreditsCents, 310_000);
        assert.equal(settlement.data.grossDebitsCents, 5_000);
        assert.equal(settlement.data.totalDueCents, 305_000);
        assert.equal(settlement.data.items.length, 3);
      });

      let settlementPublicId = '';
      let firstPaymentPublicId = '';
      await t.test('pagamentos parciais são idempotentes, quitáveis e reversíveis', async () => {
        const listed = await request(
          `/employee-compensation/admin/settlements?employeeId=${fixture.users.employeeB.id}`,
          fixture.tokens.adminB,
        );
        settlementPublicId = listed.data[0].publicId;
        const confirmed = await request(
          `/employee-compensation/admin/settlements/${settlementPublicId}/confirm`,
          fixture.tokens.adminB,
          'POST',
        );
        assert.equal(confirmed.response.status, 200);
        assert.equal(confirmed.data.status, 'CONFIRMED');

        const firstPaymentPayload = { amountCents: 100_000, method: 'PIX', reference: 'pix-1' };
        const first = await request(
          `/employee-compensation/admin/settlements/${settlementPublicId}/payments`,
          fixture.tokens.adminB,
          'POST',
          firstPaymentPayload,
          'employee-payment-january-part-1',
        );
        const replay = await request(
          `/employee-compensation/admin/settlements/${settlementPublicId}/payments`,
          fixture.tokens.adminB,
          'POST',
          firstPaymentPayload,
          'employee-payment-january-part-1',
        );
        assert.equal(first.response.status, 201);
        assert.equal(first.data.settlement.status, 'PARTIALLY_PAID');
        assert.equal(replay.data.idempotentReplay, true);
        assert.equal(replay.data.payment.publicId, first.data.payment.publicId);
        firstPaymentPublicId = first.data.payment.publicId;

        const finalPayment = await request(
          `/employee-compensation/admin/settlements/${settlementPublicId}/payments`,
          fixture.tokens.adminB,
          'POST',
          { amountCents: 205_000, method: 'BANK_TRANSFER', reference: 'transfer-2' },
          'employee-payment-january-part-2',
        );
        assert.equal(finalPayment.response.status, 201);
        assert.equal(finalPayment.data.settlement.status, 'PAID');

        const reversed = await request(
          `/employee-compensation/admin/payments/${firstPaymentPublicId}/reverse`,
          fixture.tokens.adminB,
          'POST',
          { reason: 'Comprovante bancário estornado' },
        );
        assert.equal(reversed.response.status, 200);
        assert.equal(reversed.data.payment.status, 'REVERSED');
        assert.equal(reversed.data.settlement.status, 'PARTIALLY_PAID');
      });

      await t.test(
        'funcionário consulta somente o próprio pagamento em formato público',
        async () => {
          const own = await request(
            `/employee-compensation/me/payments/${firstPaymentPublicId}`,
            fixture.tokens.employeeB,
          );
          assert.equal(own.response.status, 200);
          assert.equal(own.data.publicId, firstPaymentPublicId);
          assert.equal(own.data.status, 'REVERSED');
          assert.equal(own.data.settlement.publicId, settlementPublicId);
          assert.equal('idempotencyKeyHash' in own.data, false);
          assert.equal('requestFingerprint' in own.data, false);
          assert.equal('restaurantId' in own.data, false);

          const foreignAdmin = await request(
            `/employee-compensation/admin/settlements/${settlementPublicId}`,
            fixture.tokens.adminA,
          );
          assert.equal(foreignAdmin.response.status, 404);
        },
      );
    } finally {
      await application.close();
    }
  },
);
