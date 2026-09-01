import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertSecureRuntimeDatabaseRole,
  withTenantDbContext,
} from '../../database/tenantDbContext.js';
import {
  prisma,
  resetTenantE2EDatabase,
  runtimePrisma,
  seedTenantE2EFixture,
} from './tenantE2EHarness.js';

function assertRlsRejection(error: unknown) {
  assert.match(
    String(error),
    /row-level security|violates.*policy|operation failed/iu,
    'A escrita adulterada deve ser rejeitada pelo PostgreSQL/RLS.',
  );
  return true;
}

test(
  'RLS piloto bloqueia acesso cross-tenant mesmo sem filtro na aplicação',
  { timeout: 90_000 },
  async (t) => {
    await resetTenantE2EDatabase();
    const fixture = await seedTenantE2EFixture();

    const issueThreadA = await prisma.orderIssueThread.create({
      data: {
        orderId: fixture.orders.a.id,
        userId: fixture.users.customerA.id,
        restaurantId: fixture.restaurants.a.id,
        customerName: fixture.users.customerA.name,
        customerPhone: fixture.users.customerA.phone,
        orderStatus: fixture.orders.a.status,
        orderType: fixture.orders.a.type,
        paymentMethod: fixture.orders.a.paymentMethod,
        total: fixture.orders.a.total,
        orderCreatedAt: fixture.orders.a.createdAt,
        itemsSummary: ['Produto A'],
      },
    });
    const paymentMethodA = await prisma.customerPaymentMethod.create({
      data: {
        userId: fixture.users.customerA.id,
        restaurantId: fixture.restaurants.a.id,
        provider: 'PAGBANK',
        providerPaymentMethodId: 'rls-card-a',
        brand: 'visa',
        last4: '1001',
        expMonth: 12,
        expYear: 2099,
      },
    });
    const paymentMethodB = await prisma.customerPaymentMethod.create({
      data: {
        userId: fixture.users.customerB.id,
        restaurantId: fixture.restaurants.b.id,
        provider: 'PAGBANK',
        providerPaymentMethodId: 'rls-card-b',
        brand: 'mastercard',
        last4: '2002',
        expMonth: 12,
        expYear: 2099,
      },
    });
    const printerSettingsA = await prisma.restaurantPrinterSettings.create({
      data: { restaurantId: fixture.restaurants.a.id, enabled: true },
    });
    const printerSettingsB = await prisma.restaurantPrinterSettings.create({
      data: { restaurantId: fixture.restaurants.b.id, enabled: true },
    });
    const printJobA = await prisma.kitchenPrintJob.create({
      data: {
        restaurantId: fixture.restaurants.a.id,
        orderId: fixture.orders.a.id,
        type: 'ORDER',
        source: 'AUTOMATIC',
        trigger: 'NEW_ORDER',
        payload: { version: 1, kind: 'ORDER', tenant: 'A' },
        paperWidth: 'MM80',
        deduplicationKey: `AUTO:KITCHEN:ORDER:${fixture.orders.a.id}`,
      },
    });
    const printJobB = await prisma.kitchenPrintJob.create({
      data: {
        restaurantId: fixture.restaurants.b.id,
        orderId: fixture.orders.b.id,
        type: 'ORDER',
        source: 'AUTOMATIC',
        trigger: 'NEW_ORDER',
        payload: { version: 1, kind: 'ORDER', tenant: 'B' },
        paperWidth: 'MM58',
        deduplicationKey: `AUTO:KITCHEN:ORDER:${fixture.orders.b.id}`,
      },
    });
    const compensationPolicyA = await prisma.courierCompensationPolicy.create({
      data: {
        restaurantId: fixture.restaurants.a.id,
        courierId: fixture.users.courierA.id,
        model: 'DISTANCE_RANGES',
      },
    });
    const compensationRangeA = await prisma.courierCompensationRange.create({
      data: {
        restaurantId: fixture.restaurants.a.id,
        policyId: compensationPolicyA.id,
        maxDistanceMeters: 5000,
        amount: 9,
      },
    });
    const compensationPolicyB = await prisma.courierCompensationPolicy.create({
      data: {
        restaurantId: fixture.restaurants.b.id,
        courierId: fixture.users.courierB.id,
        model: 'FIXED_PER_DELIVERY',
        fixedAmount: 12,
      },
    });
    const settlementA = await prisma.courierSettlement.create({
      data: {
        restaurantId: fixture.restaurants.a.id,
        courierId: fixture.users.courierA.id,
        grossCourierEarnings: 5,
        cashCollectedAmount: 0,
        netAmount: 5,
        adminDeclaredPaidAt: new Date(),
        createdByUserId: fixture.users.adminA.id,
      },
    });
    const settlementItemA = await prisma.courierSettlementItem.create({
      data: {
        settlementId: settlementA.id,
        restaurantId: fixture.restaurants.a.id,
        orderId: fixture.orders.a.id,
        courierEarningSnapshot: 5,
        cashCollectedSnapshot: 0,
      },
    });
    const settlementB = await prisma.courierSettlement.create({
      data: {
        restaurantId: fixture.restaurants.b.id,
        courierId: fixture.users.courierB.id,
        grossCourierEarnings: 12,
        cashCollectedAmount: 0,
        netAmount: 12,
        adminDeclaredPaidAt: new Date(),
        createdByUserId: fixture.users.adminB.id,
      },
    });
    const settlementItemB = await prisma.courierSettlementItem.create({
      data: {
        settlementId: settlementB.id,
        restaurantId: fixture.restaurants.b.id,
        orderId: fixture.orders.b.id,
        courierEarningSnapshot: 12,
        cashCollectedSnapshot: 0,
      },
    });
    const ingredientA = await prisma.ingredient.create({
      data: {
        restaurantId: fixture.restaurants.a.id,
        name: 'Ingrediente genérico A',
        category: 'Teste RLS',
        price: 2,
      },
    });
    const optionGroupA = await prisma.productOptionGroup.create({
      data: {
        restaurantId: fixture.restaurants.a.id,
        productId: fixture.products.a.id,
        name: 'Etapa RLS A',
      },
    });
    const optionGroupB = await prisma.productOptionGroup.create({
      data: {
        restaurantId: fixture.restaurants.b.id,
        productId: fixture.products.b.id,
        name: 'Etapa RLS B',
      },
    });
    const optionA = await prisma.productOption.create({
      data: {
        restaurantId: fixture.restaurants.a.id,
        groupId: optionGroupA.id,
        ingredientId: ingredientA.id,
        additionalPrice: 2,
      },
    });
    const optionB = await prisma.productOption.create({
      data: {
        restaurantId: fixture.restaurants.b.id,
        groupId: optionGroupB.id,
        ingredientId: fixture.ingredients.b.id,
        additionalPrice: 3,
      },
    });
    const compositionA = await prisma.productCompositionItem.create({
      data: {
        restaurantId: fixture.restaurants.a.id,
        productId: fixture.products.a.id,
        ingredientId: ingredientA.id,
        removable: true,
      },
    });
    const compositionB = await prisma.productCompositionItem.create({
      data: {
        restaurantId: fixture.restaurants.b.id,
        productId: fixture.products.b.id,
        ingredientId: fixture.ingredients.b.id,
        removable: true,
      },
    });
    const portionsA = await prisma.productPortionConfiguration.create({
      data: {
        restaurantId: fixture.restaurants.a.id,
        productId: fixture.products.a.id,
        optionGroupId: optionGroupA.id,
      },
    });
    const portionsB = await prisma.productPortionConfiguration.create({
      data: {
        restaurantId: fixture.restaurants.b.id,
        productId: fixture.products.b.id,
        optionGroupId: optionGroupB.id,
      },
    });
    const templateA = await prisma.productConfigurationTemplate.create({
      data: {
        restaurantId: fixture.restaurants.a.id,
        name: 'Modelo privado A',
        configuration: { optionGroups: [], compositionItems: [] },
      },
    });
    const templateB = await prisma.productConfigurationTemplate.create({
      data: {
        restaurantId: fixture.restaurants.b.id,
        name: 'Modelo privado B',
        configuration: { optionGroups: [], compositionItems: [] },
      },
    });

    try {
      await t.test(
        'a role runtime não pode ignorar RLS e não possui as tabelas piloto',
        async () => {
          const role = await assertSecureRuntimeDatabaseRole();
          assert.equal(role.roleName, 'tenant_e2e_runtime');
          assert.equal(role.isSuperuser, false);
          assert.equal(role.bypassesRls, false);
          assert.equal(role.ownsPilotTables, false);
        },
      );

      await t.test('catálogo confirma ENABLE, FORCE e policies completas', async () => {
        const tables = await runtimePrisma.$queryRaw<
          Array<{ table_name: string; rls_enabled: boolean; rls_forced: boolean }>
        >`
        SELECT
          relations.relname AS table_name,
          relations.relrowsecurity AS rls_enabled,
          relations.relforcerowsecurity AS rls_forced
        FROM pg_catalog.pg_class AS relations
        JOIN pg_catalog.pg_namespace AS namespaces
          ON namespaces.oid = relations.relnamespace
        WHERE namespaces.nspname = 'public'
          AND relations.relname IN (
            'CustomerPaymentMethod',
            'CourierCompensationPolicy',
            'CourierCompensationRange',
            'CourierSettlement',
            'CourierSettlementItem',
            'KitchenPrintJob',
            'OrderIssueThread',
            'ProductCompositionItem',
            'ProductConfigurationTemplate',
            'ProductOption',
            'ProductOptionGroup',
            'ProductPortionConfiguration',
            'RestaurantPrinterSettings'
          )
        ORDER BY relations.relname
      `;
        assert.deepEqual(tables, [
          { table_name: 'CourierCompensationPolicy', rls_enabled: true, rls_forced: true },
          { table_name: 'CourierCompensationRange', rls_enabled: true, rls_forced: true },
          { table_name: 'CourierSettlement', rls_enabled: true, rls_forced: true },
          { table_name: 'CourierSettlementItem', rls_enabled: true, rls_forced: true },
          { table_name: 'CustomerPaymentMethod', rls_enabled: true, rls_forced: true },
          { table_name: 'KitchenPrintJob', rls_enabled: true, rls_forced: true },
          { table_name: 'OrderIssueThread', rls_enabled: true, rls_forced: true },
          { table_name: 'ProductCompositionItem', rls_enabled: true, rls_forced: true },
          { table_name: 'ProductConfigurationTemplate', rls_enabled: true, rls_forced: true },
          { table_name: 'ProductOption', rls_enabled: true, rls_forced: true },
          { table_name: 'ProductOptionGroup', rls_enabled: true, rls_forced: true },
          { table_name: 'ProductPortionConfiguration', rls_enabled: true, rls_forced: true },
          { table_name: 'RestaurantPrinterSettings', rls_enabled: true, rls_forced: true },
        ]);

        const policies = await runtimePrisma.$queryRaw<
          Array<{
            table_name: string;
            policy_name: string;
            is_permissive: boolean;
            command: string;
            has_using: boolean;
            has_with_check: boolean;
          }>
        >`
        SELECT
          relations.relname AS table_name,
          policies.polname AS policy_name,
          policies.polpermissive AS is_permissive,
          policies.polcmd::text AS command,
          policies.polqual IS NOT NULL AS has_using,
          policies.polwithcheck IS NOT NULL AS has_with_check
        FROM pg_catalog.pg_policy AS policies
        JOIN pg_catalog.pg_class AS relations ON relations.oid = policies.polrelid
        JOIN pg_catalog.pg_namespace AS namespaces ON namespaces.oid = relations.relnamespace
        WHERE namespaces.nspname = 'public'
          AND relations.relname IN (
            'CustomerPaymentMethod',
            'CourierCompensationPolicy',
            'CourierCompensationRange',
            'CourierSettlement',
            'CourierSettlementItem',
            'KitchenPrintJob',
            'OrderIssueThread',
            'ProductCompositionItem',
            'ProductConfigurationTemplate',
            'ProductOption',
            'ProductOptionGroup',
            'ProductPortionConfiguration',
            'RestaurantPrinterSettings'
          )
        ORDER BY relations.relname
      `;
        assert.equal(policies.length, 13);
        for (const policy of policies) {
          assert.equal(policy.policy_name, `${policy.table_name}_tenant_isolation`);
          assert.equal(policy.is_permissive, true);
          assert.equal(policy.command, '*');
          assert.equal(policy.has_using, true);
          assert.equal(policy.has_with_check, true);
        }
      });

      await t.test(
        'OrderIssueThread permite B e bloqueia A usando query sem restaurantId',
        async () => {
          const own = await withTenantDbContext(fixture.restaurants.b.id, (db) =>
            db.orderIssueThread.findUnique({ where: { id: fixture.issueThreadB.id } }),
          );
          assert.equal(own?.id, fixture.issueThreadB.id);

          const attack = await withTenantDbContext(fixture.restaurants.a.id, (db) =>
            db.orderIssueThread.findUnique({ where: { id: fixture.issueThreadB.id } }),
          );
          assert.equal(attack, null);
        },
      );

      await t.test(
        'CustomerPaymentMethod permite B e bloqueia A usando query sem restaurantId',
        async () => {
          const own = await withTenantDbContext(fixture.restaurants.b.id, (db) =>
            db.customerPaymentMethod.findUnique({ where: { id: paymentMethodB.id } }),
          );
          assert.equal(own?.id, paymentMethodB.id);

          const attack = await withTenantDbContext(fixture.restaurants.a.id, (db) =>
            db.customerPaymentMethod.findUnique({ where: { id: paymentMethodB.id } }),
          );
          assert.equal(attack, null);
        },
      );

      await t.test('sem contexto nenhuma tabela piloto revela linhas', async () => {
        assert.equal(await runtimePrisma.orderIssueThread.count(), 0);
        assert.equal(await runtimePrisma.customerPaymentMethod.count(), 0);
        assert.equal(await runtimePrisma.restaurantPrinterSettings.count(), 0);
        assert.equal(await runtimePrisma.kitchenPrintJob.count(), 0);
        assert.equal(await runtimePrisma.courierCompensationPolicy.count(), 0);
        assert.equal(await runtimePrisma.courierCompensationRange.count(), 0);
        assert.equal(await runtimePrisma.courierSettlement.count(), 0);
        assert.equal(await runtimePrisma.courierSettlementItem.count(), 0);
        assert.equal(await runtimePrisma.productCompositionItem.count(), 0);
        assert.equal(await runtimePrisma.productOptionGroup.count(), 0);
        assert.equal(await runtimePrisma.productOption.count(), 0);
        assert.equal(await runtimePrisma.productPortionConfiguration.count(), 0);
        assert.equal(await runtimePrisma.productConfigurationTemplate.count(), 0);
      });

      await t.test('configuração genérica permite B e oculta suas linhas de A', async () => {
        const own = await withTenantDbContext(fixture.restaurants.b.id, async (db) => ({
          group: await db.productOptionGroup.findUnique({ where: { id: optionGroupB.id } }),
          option: await db.productOption.findUnique({ where: { id: optionB.id } }),
          composition: await db.productCompositionItem.findUnique({
            where: { id: compositionB.id },
          }),
          portions: await db.productPortionConfiguration.findUnique({
            where: { id: portionsB.id },
          }),
          template: await db.productConfigurationTemplate.findUnique({
            where: { id: templateB.id },
          }),
        }));
        assert.equal(own.group?.restaurantId, fixture.restaurants.b.id);
        assert.equal(own.option?.restaurantId, fixture.restaurants.b.id);
        assert.equal(own.composition?.restaurantId, fixture.restaurants.b.id);
        assert.equal(own.portions?.restaurantId, fixture.restaurants.b.id);
        assert.equal(own.template?.restaurantId, fixture.restaurants.b.id);

        const attack = await withTenantDbContext(fixture.restaurants.a.id, async (db) => ({
          group: await db.productOptionGroup.findUnique({ where: { id: optionGroupB.id } }),
          option: await db.productOption.findUnique({ where: { id: optionB.id } }),
          composition: await db.productCompositionItem.findUnique({
            where: { id: compositionB.id },
          }),
          portions: await db.productPortionConfiguration.findUnique({
            where: { id: portionsB.id },
          }),
          template: await db.productConfigurationTemplate.findUnique({
            where: { id: templateB.id },
          }),
        }));
        assert.equal(attack.group, null);
        assert.equal(attack.option, null);
        assert.equal(attack.composition, null);
        assert.equal(attack.portions, null);
        assert.equal(attack.template, null);
      });

      await t.test('RLS rejeita tenant adulterado em modelo de configuração', async () => {
        await assert.rejects(
          () =>
            withTenantDbContext(fixture.restaurants.a.id, (db) =>
              db.productConfigurationTemplate.create({
                data: {
                  restaurantId: fixture.restaurants.b.id,
                  name: 'Tentativa cross-tenant',
                  configuration: { optionGroups: [], compositionItems: [] },
                },
              }),
            ),
          assertRlsRejection,
        );
      });

      await t.test('RLS rejeita grupos e opções adulterados de outro tenant', async () => {
        await assert.rejects(
          () =>
            withTenantDbContext(fixture.restaurants.a.id, (db) =>
              db.productOptionGroup.create({
                data: {
                  restaurantId: fixture.restaurants.b.id,
                  productId: fixture.products.b.id,
                  name: 'Grupo cross-tenant',
                },
              }),
            ),
          assertRlsRejection,
        );
        await assert.rejects(
          () =>
            withTenantDbContext(fixture.restaurants.a.id, (db) =>
              db.productOption.create({
                data: {
                  restaurantId: fixture.restaurants.b.id,
                  groupId: optionGroupB.id,
                  ingredientId: fixture.ingredients.b.id,
                  additionalPrice: 3,
                },
              }),
            ),
          assertRlsRejection,
        );
      });

      assert.equal(compositionA.restaurantId, fixture.restaurants.a.id);
      assert.equal(optionA.restaurantId, fixture.restaurants.a.id);
      assert.equal(portionsA.restaurantId, fixture.restaurants.a.id);
      assert.equal(templateA.restaurantId, fixture.restaurants.a.id);

      await t.test('RLS financeiro permite B e oculta políticas e acertos B de A', async () => {
        const own = await withTenantDbContext(fixture.restaurants.b.id, async (db) => ({
          policy: await db.courierCompensationPolicy.findUnique({
            where: { id: compensationPolicyB.id },
          }),
          settlement: await db.courierSettlement.findUnique({ where: { id: settlementB.id } }),
          item: await db.courierSettlementItem.findUnique({
            where: { id: settlementItemB.id },
          }),
        }));
        assert.equal(own.policy?.restaurantId, fixture.restaurants.b.id);
        assert.equal(own.settlement?.restaurantId, fixture.restaurants.b.id);
        assert.equal(own.item?.restaurantId, fixture.restaurants.b.id);

        const attack = await withTenantDbContext(fixture.restaurants.a.id, async (db) => ({
          policy: await db.courierCompensationPolicy.findUnique({
            where: { id: compensationPolicyB.id },
          }),
          settlement: await db.courierSettlement.findUnique({ where: { id: settlementB.id } }),
          item: await db.courierSettlementItem.findUnique({
            where: { id: settlementItemB.id },
          }),
        }));
        assert.equal(attack.policy, null);
        assert.equal(attack.settlement, null);
        assert.equal(attack.item, null);
      });

      await t.test('RLS rejeita política financeira adulterada no INSERT', async () => {
        await assert.rejects(
          () =>
            withTenantDbContext(fixture.restaurants.a.id, (db) =>
              db.courierCompensationPolicy.create({
                data: {
                  restaurantId: fixture.restaurants.b.id,
                  model: 'FIXED_PER_DELIVERY',
                  fixedAmount: 999,
                },
              }),
            ),
          assertRlsRejection,
        );
      });

      await t.test('RLS rejeita troca de tenant em política, faixa, acerto e item', async () => {
        const operations = [
          () =>
            withTenantDbContext(fixture.restaurants.a.id, (db) =>
              db.courierCompensationPolicy.update({
                where: { id: compensationPolicyA.id },
                data: { restaurantId: fixture.restaurants.b.id },
              }),
            ),
          () =>
            withTenantDbContext(fixture.restaurants.a.id, (db) =>
              db.courierCompensationRange.update({
                where: { id: compensationRangeA.id },
                data: { restaurantId: fixture.restaurants.b.id },
              }),
            ),
          () =>
            withTenantDbContext(fixture.restaurants.a.id, (db) =>
              db.courierSettlement.update({
                where: { id: settlementA.id },
                data: { restaurantId: fixture.restaurants.b.id },
              }),
            ),
          () =>
            withTenantDbContext(fixture.restaurants.a.id, (db) =>
              db.courierSettlementItem.update({
                where: { id: settlementItemA.id },
                data: { restaurantId: fixture.restaurants.b.id },
              }),
            ),
        ];
        for (const operation of operations) await assert.rejects(operation, assertRlsRejection);
      });

      await t.test(
        'fila e configuração permitem B e bloqueiam A sem filtro de aplicação',
        async () => {
          const own = await withTenantDbContext(fixture.restaurants.b.id, async (db) => ({
            settings: await db.restaurantPrinterSettings.findUnique({
              where: { id: printerSettingsB.id },
            }),
            job: await db.kitchenPrintJob.findUnique({ where: { id: printJobB.id } }),
          }));
          assert.equal(own.settings?.restaurantId, fixture.restaurants.b.id);
          assert.equal(own.job?.restaurantId, fixture.restaurants.b.id);

          const attack = await withTenantDbContext(fixture.restaurants.a.id, async (db) => ({
            settings: await db.restaurantPrinterSettings.findUnique({
              where: { id: printerSettingsB.id },
            }),
            job: await db.kitchenPrintJob.findUnique({ where: { id: printJobB.id } }),
          }));
          assert.equal(attack.settings, null);
          assert.equal(attack.job, null);
        },
      );

      await t.test('RLS rejeita INSERT adulterado nas novas tabelas privadas', async () => {
        await assert.rejects(
          () =>
            withTenantDbContext(fixture.restaurants.a.id, (db) =>
              db.kitchenPrintJob.create({
                data: {
                  restaurantId: fixture.restaurants.b.id,
                  orderId: fixture.orders.b.id,
                  type: 'ORDER',
                  source: 'MANUAL',
                  payload: { version: 1, kind: 'ORDER' },
                  paperWidth: 'MM80',
                  deduplicationKey: 'RLS:ATTACK:JOB',
                },
              }),
            ),
          assertRlsRejection,
        );
      });

      await t.test('RLS rejeita UPDATE A para restaurantId B na fila e configuração', async () => {
        await assert.rejects(
          () =>
            withTenantDbContext(fixture.restaurants.a.id, (db) =>
              db.kitchenPrintJob.update({
                where: { id: printJobA.id },
                data: { restaurantId: fixture.restaurants.b.id },
              }),
            ),
          assertRlsRejection,
        );
        await assert.rejects(
          () =>
            withTenantDbContext(fixture.restaurants.a.id, (db) =>
              db.restaurantPrinterSettings.update({
                where: { id: printerSettingsA.id },
                data: { restaurantId: fixture.restaurants.b.id },
              }),
            ),
          assertRlsRejection,
        );
      });

      await t.test('OrderIssueThread rejeita INSERT adulterado via WITH CHECK', async () => {
        await assert.rejects(
          () =>
            withTenantDbContext(fixture.restaurants.a.id, (db) =>
              db.orderIssueThread.create({
                data: {
                  orderId: fixture.orders.realtimeB.id,
                  userId: fixture.users.customerB.id,
                  restaurantId: fixture.restaurants.b.id,
                  customerName: fixture.users.customerB.name,
                  orderStatus: fixture.orders.realtimeB.status,
                  orderType: fixture.orders.realtimeB.type,
                  paymentMethod: fixture.orders.realtimeB.paymentMethod,
                  total: fixture.orders.realtimeB.total,
                  orderCreatedAt: fixture.orders.realtimeB.createdAt,
                },
              }),
            ),
          assertRlsRejection,
        );
      });

      await t.test('CustomerPaymentMethod rejeita INSERT adulterado via WITH CHECK', async () => {
        await assert.rejects(
          () =>
            withTenantDbContext(fixture.restaurants.a.id, (db) =>
              db.customerPaymentMethod.create({
                data: {
                  userId: fixture.users.customerB.id,
                  restaurantId: fixture.restaurants.b.id,
                  provider: 'PAGBANK',
                  providerPaymentMethodId: 'rls-card-insert-attack',
                  brand: 'visa',
                  last4: '9999',
                  expMonth: 12,
                  expYear: 2099,
                },
              }),
            ),
          assertRlsRejection,
        );
      });

      await t.test('OrderIssueThread rejeita UPDATE A para restaurantId B', async () => {
        await assert.rejects(
          () =>
            withTenantDbContext(fixture.restaurants.a.id, (db) =>
              db.orderIssueThread.update({
                where: { id: issueThreadA.id },
                data: { restaurantId: fixture.restaurants.b.id },
              }),
            ),
          assertRlsRejection,
        );
      });

      await t.test('CustomerPaymentMethod rejeita UPDATE A para restaurantId B', async () => {
        await assert.rejects(
          () =>
            withTenantDbContext(fixture.restaurants.a.id, (db) =>
              db.customerPaymentMethod.update({
                where: { id: paymentMethodA.id },
                data: { restaurantId: fixture.restaurants.b.id },
              }),
            ),
          assertRlsRejection,
        );
      });

      await t.test('DELETE do tenant A não afeta linhas B nas duas tabelas', async () => {
        const deleted = await withTenantDbContext(fixture.restaurants.a.id, async (db) => ({
          threads: await db.orderIssueThread.deleteMany({ where: { id: fixture.issueThreadB.id } }),
          methods: await db.customerPaymentMethod.deleteMany({ where: { id: paymentMethodB.id } }),
        }));
        assert.equal(deleted.threads.count, 0);
        assert.equal(deleted.methods.count, 0);
        assert.ok(
          await prisma.orderIssueThread.findUnique({ where: { id: fixture.issueThreadB.id } }),
        );
        assert.ok(
          await prisma.customerPaymentMethod.findUnique({ where: { id: paymentMethodB.id } }),
        );
      });

      await t.test('contextos A e B concorrentes permanecem isolados no pool', async () => {
        const [visibleToA, visibleToB] = await Promise.all([
          withTenantDbContext(fixture.restaurants.a.id, (db) =>
            db.customerPaymentMethod.findMany({ select: { restaurantId: true } }),
          ),
          withTenantDbContext(fixture.restaurants.b.id, (db) =>
            db.customerPaymentMethod.findMany({ select: { restaurantId: true } }),
          ),
        ]);
        assert.ok(visibleToA.length > 0);
        assert.ok(visibleToB.length > 0);
        assert.ok(visibleToA.every((row) => row.restaurantId === fixture.restaurants.a.id));
        assert.ok(visibleToB.every((row) => row.restaurantId === fixture.restaurants.b.id));
      });
    } finally {
      await resetTenantE2EDatabase();
      await Promise.all([prisma.$disconnect(), runtimePrisma.$disconnect()]);
    }
  },
);
