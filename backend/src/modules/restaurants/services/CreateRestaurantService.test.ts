// @ts-nocheck
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcrypt';
import { PlanType } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import restaurantRepository from '../repositories/RestaurantRepository.js';
import userRepository from '../../auth/repositories/UserRepository.js';
import subscriptionRepository from '../../subscription/repositories/SubscriptionRepository.js';
import platformPlanCatalogService from '../../billing/services/PlatformPlanCatalogService.js';
import { addBusinessDays } from '../../billing/utils/dateUtils.js';
import createRestaurantService from './CreateRestaurantService.js';

const originals = {
  transaction: prisma.$transaction,
  findRestaurantByEmail: restaurantRepository.findByEmail,
  findRestaurantBySlug: restaurantRepository.findBySlug,
  createRestaurant: restaurantRepository.create,
  findUserByEmail: userRepository.findByEmail,
  createUser: userRepository.create,
  createSubscription: subscriptionRepository.create,
  getPlanByCode: platformPlanCatalogService.getByCode,
};

afterEach(() => {
  prisma.$transaction = originals.transaction;
  restaurantRepository.findByEmail = originals.findRestaurantByEmail;
  restaurantRepository.findBySlug = originals.findRestaurantBySlug;
  restaurantRepository.create = originals.createRestaurant;
  userRepository.findByEmail = originals.findUserByEmail;
  userRepository.create = originals.createUser;
  subscriptionRepository.create = originals.createSubscription;
  platformPlanCatalogService.getByCode = originals.getPlanByCode;
});

function validPayload() {
  return {
    plan: PlanType.PREMIUM,
    restaurant: {
      name: 'Pizza Segura',
      slug: 'pizza-segura',
      email: 'contato@pizzasegura.com',
    },
    admin: {
      name: 'Administrador',
      email: 'admin@pizzasegura.com',
      password: 'Segura1!',
    },
  };
}

test('usa trial do plano, senha forte de oito caracteres e auditoria no mesmo contexto', async () => {
  const transaction = {
    user: {
      findUnique: async ({ where }) => ({
        id: where.id,
        name: 'Desenvolvedor da Plataforma',
        role: 'SUPER_ADMIN',
      }),
    },
    restaurantImplementation: {
      create: async ({ data }) => {
        state.implementation = data;
        return { id: 'initial-test-id', ...data };
      },
    },
    auditLog: {
      create: async ({ data }) => {
        state.audit = data;
        return { id: 1, ...data };
      },
    },
  };
  const state = {
    subscription: null,
    implementation: null,
    admin: null,
    audit: null,
    planDatabase: null,
  };

  prisma.$transaction = async (callback) => callback(transaction);
  restaurantRepository.findByEmail = async () => null;
  restaurantRepository.findBySlug = async () => null;
  userRepository.findByEmail = async () => null;
  restaurantRepository.create = async (data, db) => {
    assert.equal(db, transaction);
    return { id: 51, ...data };
  };
  userRepository.create = async (data, db) => {
    assert.equal(db, transaction);
    state.admin = data;
    return { id: 81, ...data };
  };
  subscriptionRepository.create = async (data, db) => {
    assert.equal(db, transaction);
    state.subscription = data;
    return { id: 91, ...data };
  };
  platformPlanCatalogService.getByCode = async (plan, options) => {
    assert.equal(plan, PlanType.PREMIUM);
    assert.equal(options.activeOnly, true);
    state.planDatabase = options.db;
    return {
      plan,
      name: 'Premium',
      description: 'Plano persistido',
      monthlyFee: 300,
      trialDays: 45,
      features: ['Mesas'],
      featured: true,
      active: true,
    };
  };

  await createRestaurantService.execute({
    ...validPayload(),
    actor: {
      userId: 2,
      ipAddress: '127.0.0.1',
      requestId: 'req-123',
      userAgent: 'unit-test',
    },
  });

  assert.equal(state.planDatabase, transaction);
  assert.equal(state.admin.mustChangePassword, true);
  assert.equal(state.admin.mfaEnabled, false);
  assert.equal(await bcrypt.compare(validPayload().admin.password, state.admin.password), true);
  assert.equal(
    Math.round(
      (state.subscription.trialEndsAt.getTime() - state.subscription.currentPeriodStart.getTime()) /
        86_400_000,
    ),
    45,
  );
  assert.equal(state.implementation.restaurantId, 51);
  assert.equal(state.implementation.initialSetupExpiresAt instanceof Date, true);
  assert.equal(state.audit.userId, 2);
  assert.equal(state.audit.userName, 'Desenvolvedor da Plataforma');
  assert.equal(state.audit.userRole, 'SUPER_ADMIN');
  assert.equal(state.audit.restaurantId, 51);
  assert.equal(state.audit.metadata.adminUserId, 81);
  assert.equal(state.audit.metadata.trialDays, 45);
  assert.equal(JSON.stringify(state.audit).includes(validPayload().admin.password), false);
});

test('rejeita senha temporária fraca antes de consultar ou gravar dados', async () => {
  let repositoryCalls = 0;
  restaurantRepository.findByEmail = async () => {
    repositoryCalls += 1;
    return null;
  };

  const payload = validPayload();
  payload.admin.password = 'senha123';

  await assert.rejects(
    () => createRestaurantService.execute(payload),
    /senha temporária.*(?:maiúscula|previsível)/u,
  );
  assert.equal(repositoryCalls, 0);
});

test('o teste público provisiona o dono verificado, portal, loja fechada e cardápio na mesma transação', async () => {
  const writes = {};
  let categories = 0;
  let requiresApproval = true;
  const tx = {
    platformSettings: { findUnique: async () => ({ allowRestaurantSignup: true, requireManualApproval: requiresApproval }) },
    $queryRaw: async (_query, tenantId) => { assert.equal(tenantId, '51'); return []; },
    restaurantSettings: { create: async ({ data }) => { writes.settings = data; } },
    auditLog: { create: async ({ data }) => { writes.portal = data; return { id: 89 }; } },
    category: { create: async ({ data }) => { assert.equal(data.restaurantId, 51); return { id: ++categories }; } },
    product: { createMany: async ({ data }) => { writes.products = data; } },
  };
  prisma.$transaction = async (run) => run(tx);
  restaurantRepository.findByEmail = restaurantRepository.findBySlug = userRepository.findByEmail = async () => null;
  restaurantRepository.create = async (data, db) => { assert.equal(db, tx); return { id: 51, ...data }; };
  userRepository.create = async (data, db) => { assert.equal(db, tx); writes.owner = data; return { id: 81, ...data }; };
  subscriptionRepository.create = async (data, db) => { assert.equal(db, tx); writes.subscription = data; return data; };
  platformPlanCatalogService.getByCode = async (plan, { db }) => {
    assert.equal(db, tx);
    return { plan, active: true, trialDays: 7, monthlyFee: 79.9 };
  };
  const payload = validPayload();
  payload.restaurant.category = 'PADARIA';
  const trial = { portalKey: 'a'.repeat(43), quotedMonthlyFee: 79.9, quotedTrialDays: 7 };
  await assert.rejects(() => createRestaurantService.createVerifiedOwnerTrial(payload, trial), /ativação automática está indisponível/u);
  assert.deepEqual(writes, {});
  requiresApproval = false;
  await assert.rejects(
    () => createRestaurantService.createVerifiedOwnerTrial(payload, { ...trial, quotedTrialDays: 8 }),
    /plano mudou/u,
  );
  assert.deepEqual(writes, {});
  const result = await createRestaurantService.createVerifiedOwnerTrial(payload, trial);
  assert.equal(writes.owner.emailVerifiedAt instanceof Date, true);
  assert.equal(writes.owner.mustChangePassword, false);
  assert.equal(writes.owner.role, 'ADMIN');
  assert.equal(writes.settings.isOpenForOrders, false);
  assert.equal(writes.subscription.status, 'TESTE');
  assert.deepEqual(result.trialEndsAt, addBusinessDays(writes.subscription.currentPeriodStart, 7, 'America/Sao_Paulo'));
  assert.equal(writes.portal.userRole, 'ADMIN');
  assert.equal(writes.portal.userId, 81);
  assert.equal(writes.portal.restaurantId, 51);
  assert.equal(JSON.stringify(writes.portal).includes(trial.portalKey), false);
  assert.ok(writes.products.length > 0 && writes.products.every((product) => product.restaurantId === 51 && product.image));
});

test('conta dias úteis do teste pelo dia civil em São Paulo mesmo com servidor em UTC', () => {
  const calendar = 'America/Sao_Paulo';
  // Quinta local, sexta em UTC.
  assert.equal(addBusinessDays(new Date('2026-11-27T01:00:00Z'), 1, calendar).toISOString(), '2026-11-28T01:00:00.000Z');
  // Sexta local, sábado em UTC.
  assert.equal(addBusinessDays(new Date('2026-11-28T01:00:00Z'), 1, calendar).toISOString(), '2026-12-01T01:00:00.000Z');
});
