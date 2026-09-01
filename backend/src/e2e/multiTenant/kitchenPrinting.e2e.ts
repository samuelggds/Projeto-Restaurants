import assert from 'node:assert/strict';
import test from 'node:test';

import { KitchenPrintJobStatus } from '@prisma/client';

import { withTenantDbContext } from '../../database/tenantDbContext.js';
import kitchenPrintingService from '../../modules/kitchenPrinting/services/KitchenPrintingService.js';
import orderRepository from '../../modules/orders/repositories/OrderRepository.js';
import {
  apiRequest,
  prisma,
  resetTenantE2EDatabase,
  runtimePrisma,
  seedTenantE2EFixture,
  startTenantTestApplication,
} from './tenantE2EHarness.js';

test(
  'impressão de cozinha durável permanece isolada por tenant de ponta a ponta',
  { timeout: 120_000 },
  async (t) => {
    await resetTenantE2EDatabase();
    const fixture = await seedTenantE2EFixture();
    const application = await startTenantTestApplication();

    const request = (path: string, token: string | undefined, method = 'GET', json?: unknown) =>
      apiRequest(application.baseUrl, path, token, { method, ...(json ? { json } : {}) });

    try {
      await Promise.all([
        prisma.order.update({
          where: { id: fixture.orders.a.id },
          data: {
            observation: 'Cliente: Cliente A | CPF: 123.456.789-00 | Bem passado',
            address: 'Rua segura do Cliente A',
            number: '125',
            complement: 'Apto 302',
            district: 'Aldeota',
            city: 'Fortaleza',
            state: 'CE',
            zipCode: '60150-000',
            items: {
              create: {
                quantity: 2,
                price: 25,
                productId: fixture.products.a.id,
                observation: 'Sem cebola',
                customizations: [
                  { groupName: 'Adicionais', options: [{ name: 'Bacon' }, { name: 'Cheddar' }] },
                ],
              },
            },
          },
        }),
        prisma.order.update({
          where: { id: fixture.orders.b.id },
          data: {
            address: 'Rua confidencial do Cliente B',
            number: '999',
            district: 'Outro tenant',
            city: 'Recife',
            state: 'PE',
            zipCode: '50000-000',
          },
        }),
      ]);

      await t.test('default seguro não cria job e configuração A não altera B', async () => {
        await withTenantDbContext(fixture.restaurants.a.id, (db) =>
          kitchenPrintingService.enqueueAutomatic({
            restaurantId: fixture.restaurants.a.id,
            orderId: fixture.orders.a.id,
            event: 'OPERATIONAL_NEW_ORDER',
            db,
          }),
        );
        assert.equal(await prisma.kitchenPrintJob.count(), 0);

        const updated = await request(
          '/kitchen-printing/settings',
          fixture.tokens.adminA,
          'PATCH',
          {
            enabled: true,
            autoPrintEnabled: true,
            autoPrintTrigger: 'NEW_ORDER',
            paperWidth: 'MM58',
            copies: 2,
          },
        );
        assert.equal(updated.response.status, 200);

        const configB = await request('/kitchen-printing/settings', fixture.tokens.adminB);
        assert.equal(configB.response.status, 200);
        assert.equal(configB.data.settings.enabled, false);
        assert.equal(configB.data.settings.paperWidth, 'MM80');
      });

      await t.test(
        'validação rejeita trigger, largura, cópias e restaurantId adulterados',
        async () => {
          for (const json of [
            { autoPrintTrigger: 'INSERT_ORDER' },
            { paperWidth: 'MM72' },
            { copies: 0 },
            { copies: 6 },
            { enabled: true, restaurantId: fixture.restaurants.b.id },
          ]) {
            const result = await request(
              '/kitchen-printing/settings',
              fixture.tokens.adminA,
              'PATCH',
              json,
            );
            assert.equal(result.response.status, 400);
          }
        },
      );

      await t.test('NEW_ORDER cria uma vez, preserva customizações e minimiza dados', async () => {
        await Promise.all([
          withTenantDbContext(fixture.restaurants.a.id, (db) =>
            kitchenPrintingService.enqueueAutomatic({
              restaurantId: fixture.restaurants.a.id,
              orderId: fixture.orders.a.id,
              event: 'OPERATIONAL_NEW_ORDER',
              db,
            }),
          ),
          withTenantDbContext(fixture.restaurants.a.id, (db) =>
            kitchenPrintingService.enqueueAutomatic({
              restaurantId: fixture.restaurants.a.id,
              orderId: fixture.orders.a.id,
              event: 'OPERATIONAL_NEW_ORDER',
              db,
            }),
          ),
        ]);

        const jobs = await prisma.kitchenPrintJob.findMany({
          where: { restaurantId: fixture.restaurants.a.id, source: 'AUTOMATIC' },
        });
        assert.equal(jobs.length, 1);
        assert.equal(jobs[0].deduplicationKey, `AUTO:KITCHEN:ORDER:${fixture.orders.a.id}`);
        assert.equal(jobs[0].copies, 2);
        assert.equal(jobs[0].paperWidth, 'MM58');
        const serialized = JSON.stringify(jobs[0].payload);
        assert.match(serialized, /Adicionais/);
        assert.match(serialized, /Bacon/);
        assert.match(serialized, /Cheddar/);
        assert.match(serialized, /Sem cebola/);
        assert.match(serialized, /Bem passado/);
        assert.match(serialized, /Rua segura do Cliente A/);
        assert.match(serialized, /Apto 302/);
        assert.match(serialized, /Aldeota/);
        assert.match(serialized, /Fortaleza/);
        assert.match(serialized, /60150-000/);
        assert.doesNotMatch(serialized, /Rua confidencial do Cliente B|Outro tenant|50000-000/u);
        assert.doesNotMatch(serialized, /123[.]456[.]789|CPF|password|token|secret/iu);
        assert.equal(
          await prisma.kitchenPrintJob.count({
            where: { restaurantId: fixture.restaurants.b.id },
          }),
          0,
        );
      });

      await t.test(
        'mudança de trigger e confirmação repetida não duplicam job automático',
        async () => {
          await request('/kitchen-printing/settings', fixture.tokens.adminA, 'PATCH', {
            autoPrintTrigger: 'PAYMENT_CONFIRMED',
          });
          await withTenantDbContext(fixture.restaurants.a.id, (db) =>
            orderRepository.confirmPayment(fixture.orders.a.id, fixture.restaurants.a.id, db),
          );
          await withTenantDbContext(fixture.restaurants.a.id, (db) =>
            orderRepository.confirmPayment(fixture.orders.a.id, fixture.restaurants.a.id, db),
          );
          assert.equal(
            await prisma.kitchenPrintJob.count({
              where: {
                restaurantId: fixture.restaurants.a.id,
                orderId: fixture.orders.a.id,
                source: 'AUTOMATIC',
              },
            }),
            1,
          );
        },
      );

      await t.test('PAYMENT_CONFIRMED só cria após transição paid false para true', async () => {
        await request('/kitchen-printing/settings', fixture.tokens.adminB, 'PATCH', {
          enabled: true,
          autoPrintEnabled: true,
          autoPrintTrigger: 'PAYMENT_CONFIRMED',
          paperWidth: 'MM80',
          copies: 1,
        });
        await withTenantDbContext(fixture.restaurants.b.id, (db) =>
          kitchenPrintingService.enqueueAutomatic({
            restaurantId: fixture.restaurants.b.id,
            orderId: fixture.orders.b.id,
            event: 'PAYMENT_CONFIRMED',
            db,
          }),
        );
        assert.equal(
          await prisma.kitchenPrintJob.count({
            where: { restaurantId: fixture.restaurants.b.id, orderId: fixture.orders.b.id },
          }),
          0,
        );

        await withTenantDbContext(fixture.restaurants.b.id, (db) =>
          orderRepository.confirmPayment(fixture.orders.b.id, fixture.restaurants.b.id, db),
        );
        await withTenantDbContext(fixture.restaurants.b.id, (db) =>
          orderRepository.confirmPayment(fixture.orders.b.id, fixture.restaurants.b.id, db),
        );
        assert.equal(
          await prisma.kitchenPrintJob.count({
            where: {
              restaurantId: fixture.restaurants.b.id,
              orderId: fixture.orders.b.id,
              source: 'AUTOMATIC',
            },
          }),
          1,
        );
      });

      await t.test('reimpressão manual é nova e Admin A não reimprime pedido B', async () => {
        const own = await request(
          `/kitchen-printing/orders/${fixture.orders.a.id}/reprint`,
          fixture.tokens.adminA,
          'POST',
        );
        assert.equal(own.response.status, 202);
        const attack = await request(
          `/kitchen-printing/orders/${fixture.orders.b.id}/reprint`,
          fixture.tokens.adminA,
          'POST',
        );
        assert.equal(attack.response.status, 404);
        assert.equal(
          await prisma.kitchenPrintJob.count({
            where: { restaurantId: fixture.restaurants.a.id, source: 'MANUAL' },
          }),
          1,
        );
      });

      const credentialA = await request(
        '/kitchen-printing/devices/credential',
        fixture.tokens.adminA,
        'POST',
        { name: 'Agente A' },
      );
      const credentialB = await request(
        '/kitchen-printing/devices/credential',
        fixture.tokens.adminB,
        'POST',
        { name: 'Agente B' },
      );
      assert.equal(credentialA.response.status, 201);
      assert.equal(credentialB.response.status, 201);
      let tokenA = credentialA.data.credential as string;
      const tokenB = credentialB.data.credential as string;
      const deviceAPublicId = credentialA.data.device.publicId as string;

      await t.test('token inválido e token rotacionado são rejeitados', async () => {
        const invalid = await request('/kitchen-printing/agent/heartbeat', 'invalid', 'POST', {});
        assert.equal(invalid.response.status, 401);

        const rotated = await request(
          '/kitchen-printing/devices/credential',
          fixture.tokens.adminA,
          'POST',
          { devicePublicId: deviceAPublicId },
        );
        assert.equal(rotated.response.status, 201);
        const oldToken = tokenA;
        tokenA = rotated.data.credential;
        const oldAttempt = await request('/kitchen-printing/agent/heartbeat', oldToken, 'POST', {});
        assert.equal(oldAttempt.response.status, 401);
        const newAttempt = await request('/kitchen-printing/agent/heartbeat', tokenA, 'POST', {
          printerName: 'EPSON A',
          appVersion: '1.0.0',
        });
        assert.equal(newAttempt.response.status, 200);
        const deviceA = await prisma.printerAgentDevice.findUnique({
          where: { publicId: deviceAPublicId },
        });
        assert.equal(deviceA?.restaurantId, fixture.restaurants.a.id);
        assert.equal(deviceA?.printerName, 'EPSON A');
      });

      await t.test('agente A nunca enxerga nem confirma job B', async () => {
        await prisma.kitchenPrintJob.updateMany({
          where: { restaurantId: fixture.restaurants.a.id },
          data: { status: KitchenPrintJobStatus.PRINTED, printedAt: new Date() },
        });
        const jobB = await prisma.kitchenPrintJob.findFirstOrThrow({
          where: { restaurantId: fixture.restaurants.b.id },
        });
        const claimA = await request('/kitchen-printing/agent/jobs/claim', tokenA, 'POST', {});
        assert.equal(claimA.response.status, 200);
        assert.equal(claimA.data.job, null);

        const ackAttack = await request(
          `/kitchen-printing/agent/jobs/${jobB.publicId}/printed`,
          tokenA,
          'POST',
          {},
        );
        assert.equal(ackAttack.response.status, 404);
        const unchanged = await prisma.kitchenPrintJob.findUniqueOrThrow({
          where: { id: jobB.id },
        });
        assert.notEqual(unchanged.status, KitchenPrintJobStatus.PRINTED);
      });

      await t.test('dois agentes concorrentes obtêm no máximo um lease', async () => {
        const secondCredential = await request(
          '/kitchen-printing/devices/credential',
          fixture.tokens.adminA,
          'POST',
          { name: 'Agente A reserva' },
        );
        const tokenA2 = secondCredential.data.credential as string;
        const testJob = await request('/kitchen-printing/test', fixture.tokens.adminA, 'POST', {});
        assert.equal(testJob.response.status, 202);

        const [claim1, claim2] = await Promise.all([
          request('/kitchen-printing/agent/jobs/claim', tokenA, 'POST', {}),
          request('/kitchen-printing/agent/jobs/claim', tokenA2, 'POST', {}),
        ]);
        const claimed = [claim1.data.job, claim2.data.job].filter(Boolean);
        assert.equal(claimed.length, 1);
        assert.equal(claimed[0].publicId, testJob.data.jobPublicId);

        const winnerToken = claim1.data.job ? tokenA : tokenA2;
        const loserToken = claim1.data.job ? tokenA2 : tokenA;
        const loserAck = await request(
          `/kitchen-printing/agent/jobs/${claimed[0].publicId}/printed`,
          loserToken,
          'POST',
          {},
        );
        assert.equal(loserAck.response.status, 404);

        const ack1 = await request(
          `/kitchen-printing/agent/jobs/${claimed[0].publicId}/printed`,
          winnerToken,
          'POST',
          {},
        );
        const ack2 = await request(
          `/kitchen-printing/agent/jobs/${claimed[0].publicId}/printed`,
          winnerToken,
          'POST',
          {},
        );
        assert.equal(ack1.response.status, 200);
        assert.equal(ack1.data.idempotent, false);
        assert.equal(ack2.response.status, 200);
        assert.equal(ack2.data.idempotent, true);
      });

      await t.test(
        'lease expirado é recuperado e FAILED aumenta tentativas com retry',
        async () => {
          const testJob = await request(
            '/kitchen-printing/test',
            fixture.tokens.adminA,
            'POST',
            {},
          );
          const firstClaim = await request(
            '/kitchen-printing/agent/jobs/claim',
            tokenA,
            'POST',
            {},
          );
          assert.equal(firstClaim.data.job.publicId, testJob.data.jobPublicId);
          assert.equal(firstClaim.data.job.attempts, 1);

          await prisma.kitchenPrintJob.update({
            where: { publicId: testJob.data.jobPublicId },
            data: { leaseExpiresAt: new Date(Date.now() - 1_000) },
          });
          const reclaimed = await request('/kitchen-printing/agent/jobs/claim', tokenA, 'POST', {});
          assert.equal(reclaimed.data.job.publicId, testJob.data.jobPublicId);
          assert.equal(reclaimed.data.job.attempts, 2);

          const failed = await request(
            `/kitchen-printing/agent/jobs/${testJob.data.jobPublicId}/failed`,
            tokenA,
            'POST',
            { error: `Papel ausente; Authorization: Bearer ${tokenA}` },
          );
          assert.equal(failed.response.status, 200);
          assert.equal(failed.data.attempts, 2);
          const storedFailed = await prisma.kitchenPrintJob.findUniqueOrThrow({
            where: { publicId: testJob.data.jobPublicId },
          });
          assert.equal(storedFailed.status, KitchenPrintJobStatus.FAILED);
          assert.doesNotMatch(
            storedFailed.lastError || '',
            new RegExp(tokenA.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')),
          );

          await prisma.kitchenPrintJob.update({
            where: { publicId: testJob.data.jobPublicId },
            data: { availableAt: new Date(Date.now() - 1_000) },
          });
          const retry = await request('/kitchen-printing/agent/jobs/claim', tokenA, 'POST', {});
          assert.equal(retry.data.job.publicId, testJob.data.jobPublicId);
          assert.equal(retry.data.job.attempts, 3);
        },
      );

      await t.test('sem agente o job permanece PENDING e não afeta o pedido', async () => {
        await prisma.kitchenPrintJob.updateMany({
          where: { restaurantId: fixture.restaurants.a.id, status: 'PROCESSING' },
          data: { status: 'PRINTED', printedAt: new Date(), leaseExpiresAt: null },
        });
        const testJob = await request('/kitchen-printing/test', fixture.tokens.adminA, 'POST', {});
        const stored = await prisma.kitchenPrintJob.findUniqueOrThrow({
          where: { publicId: testJob.data.jobPublicId },
        });
        assert.equal(stored.status, KitchenPrintJobStatus.PENDING);
        assert.ok(await prisma.order.findUnique({ where: { id: fixture.orders.a.id } }));
      });

      // Confirma que o agente B segue válido e restrito ao próprio tenant.
      const heartbeatB = await request('/kitchen-printing/agent/heartbeat', tokenB, 'POST', {
        printerName: 'Bematech B',
      });
      assert.equal(heartbeatB.response.status, 200);
    } finally {
      await application.close();
      await resetTenantE2EDatabase();
      await Promise.all([prisma.$disconnect(), runtimePrisma.$disconnect()]);
    }
  },
);
