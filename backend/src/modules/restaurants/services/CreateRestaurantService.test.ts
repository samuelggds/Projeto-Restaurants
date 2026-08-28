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
    auditLog: {
      create: async ({ data }) => {
        state.audit = data;
        return { id: 1, ...data };
      },
    },
  };
  const state = {
    subscription: null,
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
  assert.equal(await bcrypt.compare(validPayload().admin.password, state.admin.password), true);
  assert.equal(
    Math.round(
      (state.subscription.trialEndsAt.getTime() - state.subscription.currentPeriodStart.getTime()) /
        86_400_000,
    ),
    45,
  );
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
