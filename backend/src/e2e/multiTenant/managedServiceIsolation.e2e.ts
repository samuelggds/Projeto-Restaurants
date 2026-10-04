import assert from 'node:assert/strict';
import test from 'node:test';
import { PlanType, UserRole } from '@prisma/client';

import authTokenService from '../../modules/auth/services/AuthTokenService.js';
import {
  apiRequest,
  prisma,
  resetTenantE2EDatabase,
  seedTenantE2EFixture,
  startTenantTestApplication,
} from './tenantE2EHarness.js';

function superAdminToken(user: {
  id: number;
  role: UserRole;
  restaurantId: number | null;
  authVersion: number;
}) {
  return authTokenService.createAccessToken({
    id: user.id,
    role: user.role,
    subRole: null,
    restaurantId: user.restaurantId,
    authVersion: user.authVersion,
  });
}

test('gestão assistida mantém isolamento multi-tenant e limites de privilégio', async (t) => {
  await resetTenantE2EDatabase();
  const fixture = await seedTenantE2EFixture();

  await prisma.subscription.update({
    where: { restaurantId: fixture.restaurants.a.id },
    data: { plan: PlanType.GESTAO_TOTAL },
  });

  const superAdmin = await prisma.user.create({
    data: {
      name: 'Super Admin Managed E2E',
      email: 'super-admin-managed@tenant-e2e.test',
      password: 'hash-e2e-only',
      role: UserRole.SUPER_ADMIN,
      active: true,
    },
  });
  const superToken = superAdminToken(superAdmin);

  const app = await startTenantTestApplication();
  t.after(async () => app.close());

  await t.test('ADMIN só enxerga e cria solicitações no próprio restaurante', async () => {
    const overviewA = await apiRequest(
      app.baseUrl,
      '/managed-service',
      fixture.tokens.adminA,
    );
    assert.equal(overviewA.response.status, 200, JSON.stringify(overviewA.data));
    assert.equal(overviewA.data.plan, 'GESTAO_TOTAL');
    assert.equal(overviewA.data.continuousManagementEnabled, true);
    assert.equal(overviewA.data.implementation.restaurantId, fixture.restaurants.a.id);
    assert.equal(overviewA.data.implementation.productLimit, null);

    const valid = await apiRequest(
      app.baseUrl,
      '/managed-service/requests',
      fixture.tokens.adminA,
      {
        method: 'POST',
        json: {
          category: 'PRECO',
          title: 'Atualizar preço E2E',
          description: 'Alterar o preço do produto A sem acessar qualquer dado do restaurante B.',
        },
      },
    );
    assert.equal(valid.response.status, 201, JSON.stringify(valid.data));
    assert.equal(valid.data.restaurantId, fixture.restaurants.a.id);

    const stored = await prisma.restaurantManagedUpdateRequest.findUniqueOrThrow({
      where: { id: valid.data.id },
    });
    assert.equal(stored.restaurantId, fixture.restaurants.a.id);
    assert.equal(stored.requestedByUserId, fixture.users.adminA.id);

    const spoof = await apiRequest(
      app.baseUrl,
      '/managed-service/requests',
      fixture.tokens.adminA,
      {
        method: 'POST',
        json: {
          restaurantId: fixture.restaurants.b.id,
          category: 'PRODUTO',
          title: 'Tentar trocar tenant',
          description: 'Este payload tenta escolher explicitamente outro restaurante e deve falhar.',
        },
      },
    );
    assert.equal(spoof.response.status, 400, JSON.stringify(spoof.data));

    const afterSpoof = await prisma.restaurantManagedUpdateRequest.findMany({
      where: { requestedByUserId: fixture.users.adminA.id },
    });
    assert.equal(afterSpoof.length, 1);
    assert.ok(afterSpoof.every((request) => request.restaurantId === fixture.restaurants.a.id));

    const overviewB = await apiRequest(
      app.baseUrl,
      '/managed-service',
      fixture.tokens.adminB,
    );
    assert.equal(overviewB.response.status, 200, JSON.stringify(overviewB.data));
    assert.equal(overviewB.data.plan, 'PREMIUM');
    assert.equal(overviewB.data.continuousManagementEnabled, false);
    assert.equal(
      overviewB.data.requests.some((request: { id: string }) => request.id === valid.data.id),
      false,
    );

    const premiumContinuousAttempt = await apiRequest(
      app.baseUrl,
      '/managed-service/requests',
      fixture.tokens.adminB,
      {
        method: 'POST',
        json: {
          category: 'PRODUTO',
          title: 'Solicitação contínua Premium',
          description: 'O Premium deve ter somente implantação inicial e não gestão contínua.',
        },
      },
    );
    assert.equal(premiumContinuousAttempt.response.status, 403);

    await prisma.restaurantImplementation.update({
      where: { restaurantId: fixture.restaurants.b.id },
      data: { productLimit: 1 },
    });

    const productLimitAttempt = await apiRequest(
      app.baseUrl,
      `/super-admin/managed-service/restaurants/${fixture.restaurants.b.id}/products`,
      superToken,
      {
        method: 'POST',
        json: {
          name: 'Produto acima do limite Premium',
          price: 20,
          categoryId: fixture.categories.b.id,
          saleMode: 'COMPLETE',
        },
      },
    );
    assert.equal(productLimitAttempt.response.status, 409, JSON.stringify(productLimitAttempt.data));

    const premiumProducts = await prisma.product.count({
      where: { restaurantId: fixture.restaurants.b.id },
    });
    assert.equal(premiumProducts, 1);
  });

  await t.test('SUPER_ADMIN trabalha no tenant alvo sem expor credenciais', async () => {
    const workspace = await apiRequest(
      app.baseUrl,
      `/super-admin/managed-service/restaurants/${fixture.restaurants.a.id}/workspace`,
      superToken,
    );
    assert.equal(workspace.response.status, 200, JSON.stringify(workspace.data));
    assert.equal(workspace.data.restaurant.id, fixture.restaurants.a.id);
    assert.equal(workspace.data.restaurant.plan, 'GESTAO_TOTAL');
    assert.equal(
      Object.prototype.hasOwnProperty.call(workspace.data.settings || {}, 'mercadoPagoAccessToken'),
      false,
    );
    assert.doesNotMatch(JSON.stringify(workspace.data), /TEST-tenant-e2e-mercado-pago-a/);

    const foreignProductAttempt = await apiRequest(
      app.baseUrl,
      `/super-admin/managed-service/restaurants/${fixture.restaurants.a.id}/products/${fixture.products.b.id}`,
      superToken,
      {
        method: 'PATCH',
        json: { name: 'Produto B sequestrado pelo workspace A' },
      },
    );
    assert.ok(
      [400, 404].includes(foreignProductAttempt.response.status),
      JSON.stringify(foreignProductAttempt.data),
    );

    const productBAfter = await prisma.product.findUniqueOrThrow({
      where: { id: fixture.products.b.id },
    });
    assert.equal(productBAfter.restaurantId, fixture.restaurants.b.id);
    assert.equal(productBAfter.name, 'Produto B protegido');

    const ingredientA = await prisma.ingredient.create({
      data: {
        restaurantId: fixture.restaurants.a.id,
        name: 'Ingrediente personalização A',
        category: 'Adicionais',
        price: 3,
        active: true,
      },
    });
    const ingredientB = await prisma.ingredient.create({
      data: {
        restaurantId: fixture.restaurants.b.id,
        name: 'Ingrediente protegido B',
        category: 'Adicionais',
        price: 4,
        active: true,
      },
    });

    const personalizedProduct = await apiRequest(
      app.baseUrl,
      `/super-admin/managed-service/restaurants/${fixture.restaurants.a.id}/products`,
      superToken,
      {
        method: 'POST',
        json: {
          name: 'Produto personalizável A',
          description: 'Criado pelo workspace assistido.',
          price: 25,
          categoryId: fixture.categories.a.id,
          saleMode: 'BUILDABLE',
          pricingMode: 'BASE',
          optionGroups: [
            {
              name: 'Escolha um adicional',
              required: true,
              selectionType: 'SINGLE',
              minSelections: 1,
              maxSelections: 1,
              options: [
                {
                  ingredientId: ingredientA.id,
                  additionalPrice: 3,
                  pricingMode: 'ADDITIVE',
                },
              ],
            },
          ],
          compositionItems: [],
          portionConfiguration: null,
        },
      },
    );
    assert.equal(personalizedProduct.response.status, 201, JSON.stringify(personalizedProduct.data));
    assert.equal(personalizedProduct.data.product.saleMode, 'BUILDABLE');
    assert.equal(personalizedProduct.data.product.restaurantId, fixture.restaurants.a.id);
    assert.equal(personalizedProduct.data.product.optionGroups.length, 1);
    assert.equal(
      personalizedProduct.data.product.optionGroups[0].options[0].ingredientId,
      ingredientA.id,
    );

    const foreignIngredientAttempt = await apiRequest(
      app.baseUrl,
      `/super-admin/managed-service/restaurants/${fixture.restaurants.a.id}/products`,
      superToken,
      {
        method: 'POST',
        json: {
          name: 'Produto com ingrediente estrangeiro',
          price: 20,
          categoryId: fixture.categories.a.id,
          saleMode: 'BUILDABLE',
          optionGroups: [
            {
              name: 'Escolha inválida',
              required: true,
              selectionType: 'SINGLE',
              minSelections: 1,
              maxSelections: 1,
              options: [
                {
                  ingredientId: ingredientB.id,
                  additionalPrice: 4,
                  pricingMode: 'ADDITIVE',
                },
              ],
            },
          ],
        },
      },
    );
    assert.ok(
      [400, 404].includes(foreignIngredientAttempt.response.status),
      JSON.stringify(foreignIngredientAttempt.data),
    );

    const foreignHalfHalfProductAttempt = await apiRequest(
      app.baseUrl,
      `/super-admin/managed-service/restaurants/${fixture.restaurants.a.id}/products`,
      superToken,
      {
        method: 'POST',
        json: {
          name: 'Meio a meio com produto estrangeiro',
          categoryId: fixture.categories.a.id,
          saleMode: 'BUILDABLE',
          pricingMode: 'HIGHEST_OPTION',
          optionGroups: [
            {
              name: 'Primeira metade',
              required: true,
              selectionType: 'SINGLE',
              minSelections: 1,
              maxSelections: 1,
              options: [
                {
                  referenceProductId: fixture.products.b.id,
                  pricingMode: 'ABSOLUTE',
                  absolutePrice: 0,
                },
              ],
            },
            {
              name: 'Segunda metade',
              required: true,
              selectionType: 'SINGLE',
              minSelections: 1,
              maxSelections: 1,
              options: [
                {
                  referenceProductId: fixture.products.b.id,
                  pricingMode: 'ABSOLUTE',
                  absolutePrice: 0,
                },
              ],
            },
          ],
        },
      },
    );
    assert.ok(
      [400, 404].includes(foreignHalfHalfProductAttempt.response.status),
      JSON.stringify(foreignHalfHalfProductAttempt.data),
    );

    const sensitiveAttempt = await apiRequest(
      app.baseUrl,
      `/super-admin/managed-service/restaurants/${fixture.restaurants.a.id}/settings`,
      superToken,
      {
        method: 'PATCH',
        json: {
          restaurantName: 'Restaurante A E2E',
          mercadoPagoAccessToken: 'novo-segredo-indevido',
        },
      },
    );
    assert.equal(sensitiveAttempt.response.status, 400, JSON.stringify(sensitiveAttempt.data));

    const settingsAfter = await prisma.restaurantSettings.findUniqueOrThrow({
      where: { restaurantId: fixture.restaurants.a.id },
    });
    assert.equal(settingsAfter.mercadoPagoAccessToken, 'TEST-tenant-e2e-mercado-pago-a');
  });

  await t.test('Básico recebe implantação inicial com limite 50 e perde workspace ao concluir', async () => {
    await prisma.subscription.update({
      where: { restaurantId: fixture.restaurants.b.id },
      data: { plan: PlanType.BASICO },
    });
    await prisma.restaurantImplementation.upsert({
      where: { restaurantId: fixture.restaurants.b.id },
      create: {
        restaurantId: fixture.restaurants.b.id,
        status: 'EM_IMPLANTACAO',
        productLimit: 50,
      },
      update: {
        status: 'EM_IMPLANTACAO',
        productLimit: 50,
        completedAt: null,
      },
    });

    const overview = await apiRequest(
      app.baseUrl,
      '/managed-service',
      fixture.tokens.adminB,
    );
    assert.equal(overview.response.status, 200, JSON.stringify(overview.data));
    assert.equal(overview.data.plan, 'BASICO');
    assert.equal(overview.data.implementationEligible, true);
    assert.equal(overview.data.continuousManagementEnabled, false);
    assert.equal(overview.data.implementation.productLimit, 50);

    const workspaceBefore = await apiRequest(
      app.baseUrl,
      `/super-admin/managed-service/restaurants/${fixture.restaurants.b.id}/workspace`,
      superToken,
    );
    assert.equal(workspaceBefore.response.status, 200, JSON.stringify(workspaceBefore.data));

    const concluded = await apiRequest(
      app.baseUrl,
      `/super-admin/managed-service/implementations/${fixture.restaurants.b.id}`,
      superToken,
      {
        method: 'PATCH',
        json: {
          status: 'CONCLUIDA',
          notes: 'Implantação Básico concluída no cenário E2E.',
        },
      },
    );
    assert.equal(concluded.response.status, 200, JSON.stringify(concluded.data));
    assert.equal(concluded.data.productLimit, 50);
    assert.equal(concluded.data.status, 'CONCLUIDA');

    const workspaceAfter = await apiRequest(
      app.baseUrl,
      `/super-admin/managed-service/restaurants/${fixture.restaurants.b.id}/workspace`,
      superToken,
    );
    assert.equal(workspaceAfter.response.status, 403, JSON.stringify(workspaceAfter.data));

    await prisma.subscription.update({
      where: { restaurantId: fixture.restaurants.b.id },
      data: { plan: PlanType.PREMIUM },
    });
    await prisma.restaurantImplementation.update({
      where: { restaurantId: fixture.restaurants.b.id },
      data: { status: 'EM_IMPLANTACAO', productLimit: 100, completedAt: null },
    });
  });

  await t.test('Premium perde workspace depois da implantação concluída', async () => {
    const concluded = await apiRequest(
      app.baseUrl,
      `/super-admin/managed-service/implementations/${fixture.restaurants.b.id}`,
      superToken,
      {
        method: 'PATCH',
        json: {
          status: 'CONCLUIDA',
          notes: 'Implantação concluída no cenário E2E.',
        },
      },
    );
    assert.equal(concluded.response.status, 200, JSON.stringify(concluded.data));
    assert.equal(concluded.data.status, 'CONCLUIDA');

    const premiumWorkspace = await apiRequest(
      app.baseUrl,
      `/super-admin/managed-service/restaurants/${fixture.restaurants.b.id}/workspace`,
      superToken,
    );
    assert.equal(premiumWorkspace.response.status, 403, JSON.stringify(premiumWorkspace.data));

    const gestaoTotalWorkspace = await apiRequest(
      app.baseUrl,
      `/super-admin/managed-service/restaurants/${fixture.restaurants.a.id}/workspace`,
      superToken,
    );
    assert.equal(gestaoTotalWorkspace.response.status, 200, JSON.stringify(gestaoTotalWorkspace.data));
  });
});
