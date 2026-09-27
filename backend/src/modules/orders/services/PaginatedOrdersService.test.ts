import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import prisma from '../../../config/prisma.js';
import { operationalPaymentWhere, queueWhere } from '../domain/orderListQuery.js';
import { admittedCapacityWhere } from '../utils/orderCapacity.js';
import paginatedOrdersService, { staffOrderScope } from './PaginatedOrdersService.js';

const originalTransaction = prisma.$transaction;
afterEach(() => {
  prisma.$transaction = originalTransaction;
});

for (const queue of ['ALL', 'ACTIVE', 'PAYMENT', 'IN_PROGRESS'] as const) {
  test(`fila administrativa ${queue} não esconde pedidos aguardando pagamento ou capacidade`, async () => {
    const receivedOrders = [
      { id: 82, restaurantId: 7, status: 'PENDENTE', paid: false, paymentMethod: 'PIX' },
      {
        id: 81,
        restaurantId: 7,
        status: 'PENDENTE',
        paid: true,
        capacityQueuedAt: new Date('2026-09-26T12:00:00Z'),
        capacityAdmittedAt: null,
      },
    ];
    const expectedWhere = { AND: [{ restaurantId: 7 }, queueWhere(queue)] };
    const matchingOrders =
      queue === 'IN_PROGRESS'
        ? []
        : queue === 'PAYMENT'
          ? receivedOrders.slice(0, 1)
          : receivedOrders;
    let tenantContextApplied = false;
    const db = {
      $queryRaw: async (_query: TemplateStringsArray, restaurantId: string) => {
        assert.equal(restaurantId, '7');
        tenantContextApplied = true;
        return [];
      },
      order: {
        findMany: async (args: { where: unknown; take: number }) => {
          assert.equal(tenantContextApplied, true);
          assert.deepEqual(args.where, { AND: [expectedWhere] });
          assert.equal(args.take, 11);
          // Testa a query real; o banco é substituído somente na fronteira Prisma.
          return matchingOrders;
        },
        count: async (args: { where: unknown }) => {
          assert.deepEqual(args.where, expectedWhere);
          return matchingOrders.length;
        },
        groupBy: async (args: { where: unknown }) => {
          // Indicadores globais nunca devem herdar o filtro operacional nem outro tenant.
          assert.deepEqual(args.where, { restaurantId: 7 });
          return [
            { status: 'PENDENTE', paid: false, _count: 1 },
            { status: 'PENDENTE', paid: true, _count: 1 },
          ];
        },
      },
    };
    prisma.$transaction = (async (callback: (client: typeof db) => unknown) =>
      callback(db)) as unknown as typeof prisma.$transaction;

    const page = await paginatedOrdersService.staff(
      { id: 40, restaurantId: 7, role: 'ADMIN' },
      { queue, limit: 10 },
    );
    assert.equal(tenantContextApplied, true);
    assert.equal(page.summary?.active, 2);
    assert.equal(page.summary?.awaitingPayment, 1);
    assert.deepEqual(
      page.orders.map((order) => order.id),
      matchingOrders.map((order) => order.id),
    );
  });
}

for (const subRole of ['COZINHA', 'ATENDENTE', 'GARCOM']) {
  test(`${subRole} continua sem acesso à fila não admitida e ao pagamento online pendente`, () => {
    const scope = staffOrderScope({ id: 20, restaurantId: 7, role: 'FUNCIONARIO', subRole });
    assert.equal(scope.restaurantId, 7);
    assert.deepEqual(scope.AND, [operationalPaymentWhere, admittedCapacityWhere]);
  });
}

test('motoqueiro mantém escopo de tenant, capacidade, pagamento e atribuição', () => {
  const scope = staffOrderScope({ id: 20, restaurantId: 7, role: 'MOTOQUEIRO' });
  assert.equal(scope.restaurantId, 7);
  assert.deepEqual(scope.AND, [operationalPaymentWhere, admittedCapacityWhere]);
  assert.deepEqual(scope.OR, [
    { status: 'PRONTO', assignedCourierId: null },
    { assignedCourierId: 20 },
  ]);
});

test('cliente não pode usar a fila administrativa e nenhum perfil pode omitir o tenant', () => {
  assert.throws(
    () => staffOrderScope({ id: 20, restaurantId: 7, role: 'CLIENTE' }),
    /Acesso negado/,
  );
  assert.throws(
    () => staffOrderScope({ id: 20, restaurantId: 0, role: 'ADMIN' }),
    /Restaurante inválido/,
  );
});
