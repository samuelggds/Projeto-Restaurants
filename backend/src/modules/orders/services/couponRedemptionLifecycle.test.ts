import assert from 'node:assert/strict';
import test from 'node:test';
import {
  markCouponRedemptionUsedForOrder,
  releaseCouponRedemptionForOrder,
  reserveCouponRedemption,
} from './couponRedemptionLifecycle.js';

test('reserva somente recompensa reivindicada pelo cliente no mesmo restaurante', async () => {
  let receivedWhere: Record<string, unknown> | null = null;
  const now = new Date('2026-08-23T15:00:00.000Z');
  const db = {
    couponRedemption: {
      updateMany: async ({ where }: { where: Record<string, unknown> }) => {
        receivedWhere = where;
        return { count: 1 };
      },
    },
  };

  await reserveCouponRedemption({
    redemptionId: 31,
    restaurantId: 7,
    userId: 42,
    db: db as never,
    now,
  });

  assert.deepEqual(receivedWhere, {
    id: 31,
    restaurantId: 7,
    userId: 42,
    status: 'CLAIMED',
    expiresAt: { gt: now },
  });
});

test('falha atomicamente quando a recompensa já foi reservada por outro pedido', async () => {
  const db = {
    couponRedemption: {
      updateMany: async () => ({ count: 0 }),
    },
  };

  await assert.rejects(
    () =>
      reserveCouponRedemption({
        redemptionId: 31,
        restaurantId: 7,
        userId: 42,
        db: db as never,
      }),
    /já foi reservado ou utilizado/,
  );
});

test('marca CLAIMED vencido como EXPIRED durante a reserva atômica', async () => {
  const now = new Date('2026-08-23T15:00:00.000Z');
  let calls = 0;
  let expirationWhere;
  const db = {
    couponRedemption: {
      updateMany: async ({ where, data }: any) => {
        calls += 1;
        if (calls === 1) return { count: 0 };
        expirationWhere = where;
        assert.equal(data.status, 'EXPIRED');
        return { count: 1 };
      },
    },
  };

  await assert.rejects(
    () =>
      reserveCouponRedemption({
        redemptionId: 31,
        restaurantId: 7,
        userId: 42,
        db: db as never,
        now,
      }),
    /cupom expirou/,
  );

  assert.equal(expirationWhere.restaurantId, 7);
  assert.equal(expirationWhere.userId, 42);
  assert.deepEqual(expirationWhere.expiresAt, { lte: now });
});

test('confirma uso e não restaura a recompensa ao cancelar ou estornar', async () => {
  let status: 'RESERVED' | 'USED' | 'CLAIMED' = 'RESERVED';
  let attachedRedemptionId: number | null = 31;
  const db = {
    order: {
      findFirst: async () => ({ couponRedemptionId: attachedRedemptionId }),
      updateMany: async ({ data }: { data: { couponRedemptionId: null } }) => {
        attachedRedemptionId = data.couponRedemptionId;
        return { count: 1 };
      },
    },
    couponRedemption: {
      updateMany: async ({ where, data }: any) => {
        const allowed = [where.status];
        if (!allowed.includes(status)) return { count: 0 };
        status = data.status;
        return { count: 1 };
      },
      findFirst: async () => ({ status }),
    },
  };

  await markCouponRedemptionUsedForOrder(90, 7, db as never);
  assert.equal(status, 'USED');

  await releaseCouponRedemptionForOrder(90, 7, db as never);
  assert.equal(status, 'USED');
  assert.equal(attachedRedemptionId, 31);
});

test('libera reserva ainda não usada e remove o vínculo do pedido', async () => {
  let status: 'RESERVED' | 'CLAIMED' = 'RESERVED';
  let attachedRedemptionId: number | null = 31;
  const db = {
    order: {
      findFirst: async ({ where }: any) => {
        assert.deepEqual(where, { id: 90, restaurantId: 7 });
        return { couponRedemptionId: attachedRedemptionId };
      },
      updateMany: async ({ where, data }: any) => {
        assert.deepEqual(where, { id: 90, restaurantId: 7 });
        attachedRedemptionId = data.couponRedemptionId;
        return { count: 1 };
      },
    },
    couponRedemption: {
      updateMany: async ({ where, data }: any) => {
        assert.equal(where.id, 31);
        assert.equal(where.restaurantId, 7);
        assert.equal(where.status, 'RESERVED');
        status = data.status;
        return { count: 1 };
      },
      findFirst: async () => ({ status }),
    },
  };

  await releaseCouponRedemptionForOrder(90, 7, db as never);

  assert.equal(status, 'CLAIMED');
  assert.equal(attachedRedemptionId, null);
});

test('reserva vencida vira EXPIRED ao ser liberada e não volta para a carteira', async () => {
  const now = new Date('2026-08-23T15:00:00.000Z');
  let updateCalls = 0;
  let status: 'RESERVED' | 'EXPIRED' = 'RESERVED';
  let attachedRedemptionId: number | null = 31;
  const db = {
    order: {
      findFirst: async () => ({ couponRedemptionId: attachedRedemptionId }),
      updateMany: async ({ data }: any) => {
        attachedRedemptionId = data.couponRedemptionId;
        return { count: 1 };
      },
    },
    couponRedemption: {
      updateMany: async ({ where, data }: any) => {
        updateCalls += 1;
        if (updateCalls === 1) {
          assert.deepEqual(where.expiresAt, { gt: now });
          return { count: 0 };
        }
        assert.deepEqual(where.expiresAt, { lte: now });
        status = data.status;
        return { count: 1 };
      },
      findFirst: async () => ({ status }),
    },
  };

  await releaseCouponRedemptionForOrder(90, 7, db as never, { now });

  assert.equal(status, 'EXPIRED');
  assert.equal(attachedRedemptionId, null);
});
