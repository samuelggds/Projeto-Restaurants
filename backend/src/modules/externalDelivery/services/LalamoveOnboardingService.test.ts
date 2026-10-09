import assert from 'node:assert/strict';
import test from 'node:test';
import prisma from '../../../config/prisma.js';
import service from './LalamoveOnboardingService.js';

type Row = { status: string; requestedAt: Date; updatedAt: Date; requestedByUserId: number };
type Where = { where: { restaurantId_provider: { restaurantId: number; provider: string } } };

test('conexão assistida permanece separada por tenant, idempotente e indisponível para despacho', async (t) => {
  const originalTransaction = prisma.$transaction;
  const stored = new Map<string, Row>();
  const written: Array<{ restaurantId: number; requestedByUserId: number }> = [];
  let currentTenant = 0;
  const keyFor = ({ where }: Where) => {
    const { restaurantId, provider } = where.restaurantId_provider;
    assert.equal(restaurantId, currentTenant);
    assert.equal(provider, 'LALAMOVE');
    return restaurantId + ':' + provider;
  };
  prisma.$transaction = (async (callback: (tx: unknown) => Promise<unknown>) => {
    const tx = {
      $queryRaw: async (_literals: TemplateStringsArray, tenant: string) => {
        assert.equal(tenant, String(currentTenant));
        return [];
      },
      user: {
        findFirst: async ({ where }: { where: { id: number; restaurantId: number; role: string; active: boolean } }) => {
          if (where.restaurantId !== currentTenant || where.role !== 'ADMIN' || !where.active) return null;
          return { id: where.id, name: 'Admin de teste', role: 'ADMIN' };
        },
      },
      auditLog: {
        create: async ({ data }: { data: { restaurantId: number; action: string; userId: number } }) => {
          assert.equal(data.restaurantId, currentTenant);
          assert.equal(data.action, 'LALAMOVE_ONBOARDING_REQUESTED');
          assert.ok(data.userId > 0);
          return { id: 1 };
        },
      },
      restaurantExternalDeliveryOnboarding: {
        findUnique: async (args: Where) => stored.get(keyFor(args)) ?? null,
        findUniqueOrThrow: async (args: Where) => {
          const row = stored.get(keyFor(args));
          if (!row) throw new Error('Missing onboarding');
          return row;
        },
        createMany: async ({ data }: { data: Array<{ restaurantId: number; provider: string; requestedByUserId: number; status: string }> }) => {
          assert.equal(data.length, 1);
          const item = data[0];
          assert.equal(item.restaurantId, currentTenant);
          const key = item.restaurantId + ':' + item.provider;
          if (stored.has(key)) return { count: 0 };
          written.push({ restaurantId: item.restaurantId, requestedByUserId: item.requestedByUserId });
          stored.set(key, {
            status: item.status,
            requestedAt: new Date('2026-10-09T15:00:00.000Z'),
            updatedAt: new Date('2026-10-09T15:00:00.000Z'),
            requestedByUserId: item.requestedByUserId,
          });
          return { count: 1 };
        },
      },
    };
    return callback(tx);
  }) as typeof prisma.$transaction;
  t.after(() => { prisma.$transaction = originalTransaction; });

  currentTenant = 7;
  assert.equal((await service.getStatus(7)).status, 'NOT_REQUESTED');
  const first = await service.requestConnection(7, 91);
  assert.equal(first.status, 'REQUESTED');
  assert.equal(first.connected, false);
  assert.equal(first.canDispatch, false);

  const repeat = await service.requestConnection(7, 91);
  assert.equal(repeat.requestedAt, first.requestedAt);
  assert.equal(written.length, 1);

  currentTenant = 8;
  assert.equal((await service.getStatus(8)).status, 'NOT_REQUESTED');
  await service.requestConnection(8, 101);
  assert.deepEqual(written, [
    { restaurantId: 7, requestedByUserId: 91 },
    { restaurantId: 8, requestedByUserId: 101 },
  ]);

  await assert.rejects(() => service.requestConnection(0, 101), /Restaurante inválido/);
  await assert.rejects(() => service.requestConnection(8, 0), /Administrador inválido/);
});
