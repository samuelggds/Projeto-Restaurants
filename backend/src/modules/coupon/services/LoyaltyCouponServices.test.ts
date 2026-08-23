// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach, beforeEach } from 'node:test';
import couponRepository from '../repositories/CouponRepository.js';
import loyaltyRedemptionExpirationJob from '../jobs/LoyaltyRedemptionExpirationJob.js';
import { CreateCouponService } from './CreateCouponService.js';
import deleteCouponService from './DeleteCouponService.js';
import { ListLoyaltyCouponsService } from './ListLoyaltyCouponsService.js';
import {
  calculateRedemptionExpiresAt,
  RedeemLoyaltyCouponService,
} from './RedeemLoyaltyCouponService.js';

const baseCoupon = {
  id: 21,
  restaurantId: 7,
  code: 'FIEL10',
  title: 'Cliente fiel',
  description: 'Um presente depois de cinco compras.',
  discountType: 'PERCENTAGE',
  discount: 10,
  minimumSubtotal: 30,
  maxDiscount: 20,
  loyaltyPurchasesRequired: 5,
  perCustomerLimit: 3,
  redemptionValidityDays: 30,
  active: true,
  expiration: null,
  createdAt: new Date('2026-08-23T12:00:00.000Z'),
  updatedAt: new Date('2026-08-23T12:00:00.000Z'),
};

const originals = {
  findByCode: couponRepository.findByCode,
  create: couponRepository.create,
  findActiveLoyaltyByRestaurant: couponRepository.findActiveLoyaltyByRestaurant,
  findActiveById: couponRepository.findActiveById,
  countCompletedPurchases: couponRepository.countCompletedPurchases,
  findRedemptions: couponRepository.findRedemptions,
  findAllRedemptions: couponRepository.findAllRedemptions,
  expireClaimedRedemptions: couponRepository.expireClaimedRedemptions,
  createRedemption: couponRepository.createRedemption,
  findById: couponRepository.findById,
  hasRedemptions: couponRepository.hasRedemptions,
  delete: couponRepository.delete,
};

beforeEach(() => {
  couponRepository.expireClaimedRedemptions = async () => ({ count: 0 });
});
afterEach(() => Object.assign(couponRepository, originals));

test('cria cupom normalizado somente no restaurante autenticado', async () => {
  couponRepository.findByCode = async (code, restaurantId) => {
    assert.equal(code, 'FIEL10');
    assert.equal(restaurantId, 7);
    return null;
  };
  couponRepository.create = async (data) => ({
    id: 21,
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const result = await new CreateCouponService().execute({
    restaurantId: 7,
    code: ' fiel10 ',
    discountType: 'PERCENTAGE',
    discount: 10,
    loyaltyPurchasesRequired: 5,
    perCustomerLimit: 3,
  });

  assert.equal(result.restaurantId, 7);
  assert.equal(result.code, 'FIEL10');
  assert.equal(result.loyaltyPurchasesRequired, 5);
  assert.equal(result.redemptionValidityDays, 30);
});

test('validade do resgate respeita o menor prazo entre carteira e campanha', () => {
  const claimedAt = new Date('2026-08-23T13:00:00.000Z');
  const expiresAt = calculateRedemptionExpiresAt(
    {
      redemptionValidityDays: 30,
      expiration: new Date('2026-09-02T13:00:00.000Z'),
    },
    claimedAt,
  );

  assert.equal(expiresAt.toISOString(), '2026-09-02T13:00:00.000Z');
});

for (const status of ['CLAIMED', 'USED', 'EXPIRED']) {
  test(`preserva campanha com resgate ${status} e orienta o admin a pausá-la`, async () => {
    couponRepository.findById = async (couponId, restaurantId) => {
      assert.equal(couponId, 21);
      assert.equal(restaurantId, 7);
      return baseCoupon;
    };
    couponRepository.hasRedemptions = async (couponId, restaurantId) => {
      assert.equal(couponId, 21);
      assert.equal(restaurantId, 7);
      return Boolean(status);
    };
    let deleteCalled = false;
    couponRepository.delete = async () => {
      deleteCalled = true;
    };

    await assert.rejects(
      () => deleteCouponService.execute({ id: 21, restaurantId: 7 }),
      /possui resgates.*Pause ou arquive/i,
    );
    assert.equal(deleteCalled, false);
  });
}

test('permite excluir campanha do restaurante quando ela nunca foi resgatada', async () => {
  couponRepository.findById = async (couponId, restaurantId) => {
    assert.equal(couponId, 21);
    assert.equal(restaurantId, 7);
    return baseCoupon;
  };
  couponRepository.hasRedemptions = async (couponId, restaurantId) => {
    assert.equal(couponId, 21);
    assert.equal(restaurantId, 7);
    return false;
  };
  couponRepository.delete = async (couponId, restaurantId) => {
    assert.equal(couponId, 21);
    assert.equal(restaurantId, 7);
    return { count: 1 };
  };

  const result = await deleteCouponService.execute({ id: 21, restaurantId: 7 });

  assert.equal(result.message, 'Cupom removido com sucesso');
});

test('preserva o histórico se um resgate for criado durante a tentativa de exclusão', async () => {
  couponRepository.findById = async () => baseCoupon;
  let guardCalls = 0;
  couponRepository.hasRedemptions = async () => {
    guardCalls += 1;
    return guardCalls > 1;
  };
  couponRepository.delete = async () => {
    throw new Error('Foreign key constraint failed');
  };

  await assert.rejects(
    () => deleteCouponService.execute({ id: 21, restaurantId: 7 }),
    /possui resgates.*preservar o histórico/i,
  );
  assert.equal(guardCalls, 2);
});

test('lista progresso usando somente compras pagas e entregues do restaurante solicitado', async () => {
  couponRepository.findActiveLoyaltyByRestaurant = async (restaurantId) => {
    assert.equal(restaurantId, 7);
    return [baseCoupon];
  };
  couponRepository.countCompletedPurchases = async (userId, restaurantId) => {
    assert.equal(userId, 44);
    assert.equal(restaurantId, 7);
    return 4;
  };
  couponRepository.findAllRedemptions = async (userId, restaurantId) => {
    assert.equal(userId, 44);
    assert.equal(restaurantId, 7);
    return [];
  };

  const result = await new ListLoyaltyCouponsService().execute({
    restaurantId: 7,
    userId: 44,
  });

  assert.equal(result.purchasesCompleted, 4);
  assert.equal(result.rewards[0].remaining, 1);
  assert.equal(result.rewards[0].canRedeem, false);
  assert.equal(result.rewards[0].coupon.discount, 10);
});

test('devolve carteira e histórico mesmo quando a campanha não está ativa', async () => {
  const now = new Date('2026-08-23T15:00:00.000Z');
  const pausedCoupon = {
    ...baseCoupon,
    id: 22,
    code: 'PAUSADO',
    active: false,
  };
  const endedCoupon = {
    ...baseCoupon,
    id: 23,
    code: 'ENCERRADO',
    active: false,
    expiration: new Date('2026-08-20T15:00:00.000Z'),
  };
  couponRepository.findActiveLoyaltyByRestaurant = async () => [baseCoupon];
  couponRepository.countCompletedPurchases = async () => 2;
  couponRepository.expireClaimedRedemptions = async (scope) => {
    assert.equal(scope.restaurantId, 7);
    assert.equal(scope.userId, 44);
    assert.equal(scope.couponIds, undefined);
    return { count: 0 };
  };
  couponRepository.findAllRedemptions = async (userId, restaurantId) => {
    assert.equal(userId, 44);
    assert.equal(restaurantId, 7);
    return [
      {
        id: 92,
        restaurantId: 7,
        couponId: 22,
        userId: 44,
        cycle: 1,
        status: 'CLAIMED',
        claimedAt: new Date('2026-08-22T15:00:00.000Z'),
        expiresAt: new Date('2026-09-21T15:00:00.000Z'),
        order: null,
        coupon: pausedCoupon,
      },
      {
        id: 91,
        restaurantId: 7,
        couponId: 23,
        userId: 44,
        cycle: 1,
        status: 'EXPIRED',
        claimedAt: new Date('2026-07-20T15:00:00.000Z'),
        expiresAt: new Date('2026-08-20T15:00:00.000Z'),
        order: null,
        coupon: endedCoupon,
      },
    ];
  };

  const result = await new ListLoyaltyCouponsService().execute({
    restaurantId: 7,
    userId: 44,
    now,
  });

  assert.deepEqual(result.rewards.map((reward) => reward.coupon.id), [21]);
  assert.deepEqual(
    result.redemptions.map((redemption) => ({
      id: redemption.id,
      couponId: redemption.couponId,
      status: redemption.status,
      couponCode: redemption.coupon.code,
    })),
    [
      { id: 92, couponId: 22, status: 'CLAIMED', couponCode: 'PAUSADO' },
      { id: 91, couponId: 23, status: 'EXPIRED', couponCode: 'ENCERRADO' },
    ],
  );
});

test('resgata um ciclo, descarta o excedente anterior e reinicia o próximo em zero', async () => {
  const now = new Date('2026-08-23T13:00:00.000Z');
  couponRepository.findActiveById = async (couponId, restaurantId) => {
    assert.equal(couponId, 21);
    assert.equal(restaurantId, 7);
    return baseCoupon;
  };
  couponRepository.countCompletedPurchases = async (userId, restaurantId, completedAfter) => {
    assert.equal(userId, 44);
    assert.equal(restaurantId, 7);
    assert.equal(completedAfter, null);
    return 12;
  };
  couponRepository.findRedemptions = async (userId, restaurantId, couponIds) => {
    assert.equal(userId, 44);
    assert.equal(restaurantId, 7);
    assert.deepEqual(couponIds, [21]);
    return [];
  };
  couponRepository.createRedemption = async (data) => {
    assert.deepEqual(data, {
      restaurantId: 7,
      couponId: 21,
      userId: 44,
      cycle: 1,
      status: 'CLAIMED',
      claimedAt: now,
      expiresAt: new Date('2026-09-22T13:00:00.000Z'),
    });
    return { id: 91, ...data, order: null, createdAt: new Date(), updatedAt: new Date() };
  };

  const result = await new RedeemLoyaltyCouponService().execute({
    couponId: 21,
    restaurantId: 7,
    userId: 44,
    now,
  });

  assert.equal(result.redemption.id, 91);
  assert.equal(result.redemption.cycle, 1);
  assert.equal(result.reward.canRedeem, false);
  assert.equal(result.reward.nextCycle, 2);
  assert.equal(result.reward.purchasesCompleted, 0);
  assert.equal(result.reward.remaining, 5);
  assert.equal(result.reward.progressPercent, 0);
  assert.match(result.message, /FIEL10/);
});

test('lista CLAIMED no ciclo seguinte a partir do instante do resgate', async () => {
  const claimedAt = new Date('2026-08-23T13:00:00.000Z');
  const now = new Date('2026-08-23T14:00:00.000Z');
  couponRepository.findActiveLoyaltyByRestaurant = async () => [baseCoupon];
  couponRepository.findAllRedemptions = async (userId, restaurantId) => {
    assert.equal(userId, 44);
    assert.equal(restaurantId, 7);
    return [
      {
        id: 91,
        restaurantId: 7,
        couponId: 21,
        userId: 44,
        cycle: 1,
        status: 'CLAIMED',
        claimedAt,
        expiresAt: new Date('2026-09-22T13:00:00.000Z'),
        order: null,
        coupon: baseCoupon,
      },
    ];
  };
  couponRepository.countCompletedPurchases = async (_userId, _restaurantId, completedAfter) => {
    if (!completedAfter) return 12;
    assert.equal(completedAfter.toISOString(), claimedAt.toISOString());
    return 0;
  };

  const result = await new ListLoyaltyCouponsService().execute({
    restaurantId: 7,
    userId: 44,
    now,
  });

  assert.equal(result.purchasesCompleted, 12);
  assert.equal(result.rewards[0].purchasesCompleted, 0);
  assert.equal(result.rewards[0].remaining, 5);
  assert.equal(result.rewards[0].progressPercent, 0);
  assert.equal(result.rewards[0].nextCycle, 2);
});

test('USED mantém o mesmo ciclo iniciado no resgate, sem novo reset', async () => {
  const claimedAt = new Date('2026-08-23T13:00:00.000Z');
  couponRepository.findActiveLoyaltyByRestaurant = async () => [baseCoupon];
  couponRepository.findAllRedemptions = async () => [
    {
      id: 91,
      restaurantId: 7,
      couponId: 21,
      userId: 44,
      cycle: 1,
      status: 'USED',
      claimedAt,
      usedAt: new Date('2026-08-23T14:00:00.000Z'),
      order: { id: 300 },
      coupon: baseCoupon,
    },
  ];
  couponRepository.countCompletedPurchases = async (_userId, _restaurantId, completedAfter) =>
    completedAfter ? 2 : 14;

  const result = await new ListLoyaltyCouponsService().execute({
    restaurantId: 7,
    userId: 44,
  });

  assert.equal(result.purchasesCompleted, 14);
  assert.equal(result.rewards[0].purchasesCompleted, 2);
  assert.equal(result.rewards[0].remaining, 3);
  assert.equal(result.rewards[0].progressPercent, 40);
  assert.equal(result.rewards[0].redemptions[0].status, 'USED');
});

test('não permite resgatar de novo sem novas compras após o CLAIMED', async () => {
  const claimedAt = new Date('2026-08-23T13:00:00.000Z');
  couponRepository.findActiveById = async () => baseCoupon;
  couponRepository.findRedemptions = async () => [
    { id: 91, couponId: 21, cycle: 1, status: 'CLAIMED', claimedAt, order: null },
  ];
  couponRepository.countCompletedPurchases = async (_userId, _restaurantId, completedAfter) => {
    assert.equal(completedAfter?.toISOString(), claimedAt.toISOString());
    return 0;
  };
  let createCalled = false;
  couponRepository.createRedemption = async () => {
    createCalled = true;
  };

  await assert.rejects(
    () =>
      new RedeemLoyaltyCouponService().execute({
        couponId: 21,
        restaurantId: 7,
        userId: 44,
      }),
    /Faltam 5 compras concluídas/,
  );
  assert.equal(createCalled, false);
});

test('não libera cupom antes de o cliente completar as compras exigidas', async () => {
  couponRepository.findActiveById = async () => baseCoupon;
  couponRepository.countCompletedPurchases = async () => 2;
  couponRepository.findRedemptions = async () => [];
  let createCalled = false;
  couponRepository.createRedemption = async () => {
    createCalled = true;
  };

  await assert.rejects(
    () =>
      new RedeemLoyaltyCouponService().execute({
        couponId: 21,
        restaurantId: 7,
        userId: 44,
      }),
    /Faltam 3 compras concluídas/,
  );
  assert.equal(createCalled, false);
});

test('não cria outro resgate enquanto a carteira ativa está no limite', async () => {
  const now = new Date('2026-08-23T15:00:00.000Z');
  couponRepository.findActiveById = async () => ({ ...baseCoupon, perCustomerLimit: 1 });
  couponRepository.countCompletedPurchases = async () => 20;
  couponRepository.findRedemptions = async () => [
    {
      id: 90,
      couponId: 21,
      cycle: 1,
      status: 'CLAIMED',
      claimedAt: new Date('2026-08-20T15:00:00.000Z'),
      expiresAt: new Date('2026-09-19T15:00:00.000Z'),
      order: null,
    },
  ];

  await assert.rejects(
    () =>
      new RedeemLoyaltyCouponService().execute({
        couponId: 21,
        restaurantId: 7,
        userId: 44,
        now,
      }),
    /limite de resgates simultâneos/,
  );
});

test('permite novo resgate recorrente depois que o cupom anterior foi usado', async () => {
  const now = new Date('2026-08-23T15:00:00.000Z');
  const claimedAt = new Date('2026-08-18T15:00:00.000Z');
  couponRepository.findActiveById = async () => ({ ...baseCoupon, perCustomerLimit: 1 });
  couponRepository.findRedemptions = async () => [
    {
      id: 90,
      couponId: 21,
      cycle: 1,
      status: 'USED',
      claimedAt,
      expiresAt: new Date('2026-09-17T15:00:00.000Z'),
      usedAt: new Date('2026-08-19T15:00:00.000Z'),
      order: { id: 300 },
    },
  ];
  couponRepository.countCompletedPurchases = async (_userId, _restaurantId, completedAfter) => {
    assert.equal(completedAfter?.toISOString(), claimedAt.toISOString());
    return 5;
  };
  couponRepository.createRedemption = async (data) => ({
    id: 92,
    ...data,
    order: null,
    createdAt: now,
    updatedAt: now,
  });

  const result = await new RedeemLoyaltyCouponService().execute({
    couponId: 21,
    restaurantId: 7,
    userId: 44,
    now,
  });

  assert.equal(result.redemption.cycle, 2);
  assert.equal(result.redemption.expiresAt, '2026-09-22T15:00:00.000Z');
  assert.equal(result.reward.activeRedemptions, 1);
  assert.equal(result.reward.limitReached, true);
  assert.equal(result.reward.purchasesCompleted, 0);
});

test('expira CLAIMED vencido e libera a carteira sem devolver compras antigas', async () => {
  const now = new Date('2026-08-23T15:00:00.000Z');
  const claimedAt = new Date('2026-08-10T15:00:00.000Z');
  let status = 'CLAIMED';
  couponRepository.findActiveLoyaltyByRestaurant = async () => [
    { ...baseCoupon, perCustomerLimit: 1 },
  ];
  couponRepository.expireClaimedRedemptions = async (scope) => {
    assert.equal(scope.restaurantId, 7);
    assert.equal(scope.userId, 44);
    assert.equal(scope.couponIds, undefined);
    assert.equal(scope.now, now);
    status = 'EXPIRED';
    return { count: 1 };
  };
  couponRepository.findAllRedemptions = async () => [
    {
      id: 90,
      couponId: 21,
      cycle: 1,
      status,
      claimedAt,
      expiresAt: new Date('2026-08-20T15:00:00.000Z'),
      order: null,
      coupon: baseCoupon,
    },
  ];
  couponRepository.countCompletedPurchases = async (_userId, _restaurantId, completedAfter) =>
    completedAfter ? 5 : 15;

  const result = await new ListLoyaltyCouponsService().execute({
    restaurantId: 7,
    userId: 44,
    now,
  });

  assert.equal(result.rewards[0].redemptions[0].status, 'EXPIRED');
  assert.equal(result.rewards[0].redemptions[0].expired, true);
  assert.equal(result.rewards[0].activeRedemptions, 0);
  assert.equal(result.rewards[0].canRedeem, true);
  assert.equal(result.rewards[0].redeemableCycle, 2);
});

test('job automático expira recompensas CLAIMED vencidas', async () => {
  const now = new Date('2026-08-23T15:00:00.000Z');
  couponRepository.expireClaimedRedemptions = async (scope) => {
    assert.deepEqual(scope, { now });
    return { count: 2 };
  };

  const result = await loyaltyRedemptionExpirationJob.execute(now);

  assert.equal(result.count, 2);
});
