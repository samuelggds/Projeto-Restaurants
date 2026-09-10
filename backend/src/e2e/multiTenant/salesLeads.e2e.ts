import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import {
  apiRequest,
  prisma,
  runtimePrisma,
  resetTenantE2EDatabase,
  seedTenantE2EFixture,
  startTenantTestApplication,
} from './tenantE2EHarness.js';
import authTokenService from '../../modules/auth/services/AuthTokenService.js';
import { SalesLeadService } from '../../modules/salesLeads/services/SalesLeadService.js';
import { deliverSalesLeadEmails } from '../../modules/salesLeads/services/SalesLeadEmailOutboxService.js';

after(async () => {
  await prisma.$disconnect();
  await runtimePrisma.$disconnect();
});

test(
  'contatos comerciais: HTTP, isolamento, PostgreSQL e fila durável com dois workers',
  { timeout: 90_000 },
  async (t) => {
    await resetTenantE2EDatabase();
    const fixture = await seedTenantE2EFixture();
    const owner = await prisma.user.create({
      data: {
        name: 'Administrador da plataforma',
        email: 'platform@tenant-e2e.test',
        password: fixture.users.adminA.password,
        role: 'SUPER_ADMIN',
        active: true,
      },
    });
    const ownerToken = authTokenService.createAccessToken(owner);
    const app = await startTenantTestApplication();
    const payload = {
      name: 'Joana Teste',
      restaurantName: 'Bistrô Fictício',
      email: 'joana@example.test',
      phone: '11999998888',
      city: 'São Paulo',
      state: 'SP',
      businessType: 'Restaurante',
      channels: ['TABLE'],
      planInterest: 'PREMIUM',
      consent: true,
      message: 'Contato de teste isolado.',
    };
    const key = randomUUID();
    const send = (body: unknown, requestKey = key) =>
      apiRequest(app.baseUrl, '/sales-leads', undefined, {
        method: 'POST',
        json: body,
        headers: { 'Idempotency-Key': requestKey },
      });
    try {
      const first = await send(payload);
      assert.equal(first.response.status, 201, JSON.stringify(first.data));
      assert.equal(first.data.received, true);
      const id = first.data.id as string;
      assert.equal((await send(payload)).response.status, 200);
      assert.equal((await send({ ...payload, name: 'Outro nome' })).response.status, 409);
      assert.equal((await send({ ...payload, consent: false }, randomUUID())).response.status, 400);
      assert.equal(
        (await send({ ...payload, restaurantName: 'Segundo Restaurante' }, randomUUID())).response
          .status,
        201,
      );
      assert.equal((await send(payload, randomUUID())).response.status, 429);
      assert.equal(await runtimePrisma.salesLead.count(), 2);
      assert.equal(await runtimePrisma.salesLeadEmailOutbox.count(), 2);

      await t.test(
        'visitante, clientes e funcionários de outros restaurantes não acessam contatos',
        async () => {
          for (const token of [undefined, ...Object.values(fixture.tokens)]) {
            const expected = token ? 403 : 401;
            assert.equal(
              (await apiRequest(app.baseUrl, '/super-admin/sales-leads', token)).response.status,
              expected,
            );
            assert.equal(
              (
                await apiRequest(app.baseUrl, `/super-admin/sales-leads/${id}/status`, token, {
                  method: 'PATCH',
                  json: { status: 'ARCHIVED' },
                })
              ).response.status,
              expected,
            );
          }
        },
      );

      await t.test(
        'super administrador consulta, pagina, filtra e registra atendimento auditado',
        async () => {
          const list = await apiRequest(
            app.baseUrl,
            '/super-admin/sales-leads?page=1&pageSize=1',
            ownerToken,
          );
          assert.equal(list.response.status, 200, JSON.stringify(list.data));
          assert.equal(list.response.headers.get('cache-control'), 'no-store');
          assert.equal(list.data.total, 2);
          assert.equal(list.data.items.length, 1);
          const second = await apiRequest(
            app.baseUrl,
            '/super-admin/sales-leads?page=2&pageSize=1',
            ownerToken,
          );
          assert.notEqual(list.data.items[0].id, second.data.items[0].id);
          const updated = await apiRequest(
            app.baseUrl,
            `/super-admin/sales-leads/${id}/status`,
            ownerToken,
            { method: 'PATCH', json: { status: 'CONTACTED' } },
          );
          assert.equal(updated.response.status, 200, JSON.stringify(updated.data));
          const filtered = await apiRequest(
            app.baseUrl,
            '/super-admin/sales-leads?status=CONTACTED&q=Joana',
            ownerToken,
          );
          assert.equal(filtered.data.total, 1);
          assert.equal(filtered.data.items[0].id, id);
          assert.equal(
            await prisma.auditLog.count({
              where: { action: 'UPDATE_SALES_LEAD_STATUS', userId: owner.id },
            }),
            1,
          );
        },
      );

      await t.test('requisições simultâneas criam uma só linha e um só aviso', async () => {
        const service = new SalesLeadService(runtimePrisma);
        const concurrentKey = randomUUID();
        const results = await Promise.all(
          Array.from({ length: 8 }, () => service.create(payload, concurrentKey)),
        );
        assert.equal(new Set(results.map((result) => result.response.id)).size, 1);
        assert.equal(await runtimePrisma.salesLead.count(), 3);
        assert.equal(await runtimePrisma.salesLeadEmailOutbox.count(), 3);
      });

      await t.test('prazos da fila preservam o instante mesmo fora do fuso UTC', async () => {
        const columns = await runtimePrisma.$queryRaw<{ data_type: string }[]>`
          SELECT data_type FROM information_schema.columns
          WHERE table_schema = 'public'
            AND ((table_name = 'SalesLead' AND column_name IN ('consentedAt', 'createdAt', 'updatedAt'))
              OR (table_name = 'SalesLeadEmailOutbox' AND column_name IN ('availableAt', 'lockedUntil', 'sentAt', 'createdAt')))`;
        assert.equal(columns.length, 7);
        assert.ok(columns.every((column) => column.data_type === 'timestamp with time zone'));
        await runtimePrisma.salesLeadEmailOutbox.updateMany({
          data: { availableAt: new Date(Date.now() + 60_000) },
        });
        let sent = 0;
        const result = await runtimePrisma.$transaction(async (tx) => {
          await tx.$executeRaw`SET LOCAL TIME ZONE 'Asia/Tokyo'`;
          return deliverSalesLeadEmails(tx, async () => {
            sent++;
          });
        });
        assert.equal(result.processed, 0);
        assert.equal(sent, 0);
        await runtimePrisma.salesLeadEmailOutbox.updateMany({
          data: { availableAt: new Date(Date.now() - 1_000) },
        });
        const rollback = new Error('Reverter somente o envio sintético do teste de fuso');
        await assert.rejects(
          runtimePrisma.$transaction(async (tx) => {
            await tx.$executeRaw`SET LOCAL TIME ZONE 'America/Sao_Paulo'`;
            const due = await deliverSalesLeadEmails(tx, async () => {
              sent++;
            });
            assert.equal(due.sent, 3);
            throw rollback;
          }),
          (error) => error === rollback,
        );
        assert.equal(sent, 3);
        assert.equal(
          await runtimePrisma.salesLeadEmailOutbox.count({
            where: { status: 'PENDING', attempts: 0 },
          }),
          3,
        );
      });

      await t.test(
        'falha no e-mail preserva contatos; workers retomam sem disputar a mesma mensagem',
        async () => {
          assert.equal((await deliverSalesLeadEmails(runtimePrisma, null)).configured, false);
          await deliverSalesLeadEmails(runtimePrisma, async () => {
            throw new Error('SMTP sintético offline');
          });
          assert.equal(
            await runtimePrisma.salesLeadEmailOutbox.count({
              where: { status: 'PENDING', attempts: 1 },
            }),
            3,
          );
          assert.equal(await runtimePrisma.salesLead.count(), 3);
          await runtimePrisma.salesLeadEmailOutbox.updateMany({
            data: { availableAt: new Date(Date.now() - 1_000) },
          });
          const delivered: string[] = [];
          const fakeSender = async (lead: { id: string }) => {
            delivered.push(lead.id);
          };
          await Promise.all([
            deliverSalesLeadEmails(runtimePrisma, fakeSender),
            deliverSalesLeadEmails(runtimePrisma, fakeSender),
          ]);
          assert.equal(delivered.length, 3);
          assert.equal(new Set(delivered).size, 3);
          assert.equal(
            await runtimePrisma.salesLeadEmailOutbox.count({
              where: { status: 'SENT', attempts: 2 },
            }),
            3,
          );
          await deliverSalesLeadEmails(runtimePrisma, fakeSender);
          assert.equal(delivered.length, 3);
        },
      );

      await t.test('migração da marca preserva o ID do convidado e suas relações', async () => {
        const guest = fixture.users.customerA;
        await prisma.user.update({
          where: { id: guest.id },
          data: { email: `guest.${guest.restaurantId}.12345678909@pecaja.local` },
        });
        const before = await prisma.order.count({ where: { userId: guest.id } });
        const migration = await readFile(
          new URL(
            '../../../prisma/migrations/20260910130000_gastronexa_branding/migration.sql',
            import.meta.url,
          ),
          'utf8',
        );
        for (const sql of migration
          .split(';')
          .map((part) => part.trim())
          .filter(Boolean))
          await prisma.$executeRawUnsafe(sql);
        const migrated = await prisma.user.findUniqueOrThrow({ where: { id: guest.id } });
        assert.equal(migrated.email, `guest.${guest.restaurantId}.12345678909@gastronexa.local`);
        assert.equal(await prisma.order.count({ where: { userId: guest.id } }), before);
      });
    } finally {
      await app.close();
    }
  },
);
