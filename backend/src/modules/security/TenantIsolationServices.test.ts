// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

import prisma from '../../config/prisma.js';
import bannerRepository from '../banner/repositories/BannerRepository.js';
import deleteBannerService from '../banner/services/DeleteBannerService.js';
import updateBannerService from '../banner/services/UpdateBannerService.js';
import couponRepository from '../coupon/repositories/CouponRepository.js';
import deleteCouponService from '../coupon/services/DeleteCouponService.js';
import updateCouponService from '../coupon/services/UpdateCouponService.js';

const originalBannerMethods = {
  findById: bannerRepository.findById,
  update: bannerRepository.update,
  delete: bannerRepository.delete,
};
const originalCouponMethods = {
  findById: couponRepository.findById,
  update: couponRepository.update,
  delete: couponRepository.delete,
};
const originalPrismaCouponMethods = {
  updateMany: prisma.coupon.updateMany,
  deleteMany: prisma.coupon.deleteMany,
  findFirst: prisma.coupon.findFirst,
};

afterEach(() => {
  Object.assign(bannerRepository, originalBannerMethods);
  Object.assign(couponRepository, originalCouponMethods);
  Object.assign(prisma.coupon, originalPrismaCouponMethods);
});

test('banner update is scoped to the authenticated restaurant', async () => {
  let updateCalled = false;
  bannerRepository.findById = async (id, restaurantId) => {
    assert.equal(id, 9);
    assert.equal(restaurantId, 2);
    return null;
  };
  bannerRepository.update = async () => {
    updateCalled = true;
  };

  await assert.rejects(
    () =>
      updateBannerService.execute({
        id: 9,
        restaurantId: 2,
        title: 'Outro restaurante',
      }),
    /Banner não encontrado/,
  );
  assert.equal(updateCalled, false);
});

test('banner delete is scoped to the authenticated restaurant', async () => {
  let deleteCalled = false;
  bannerRepository.findById = async (_id, restaurantId) => {
    assert.equal(restaurantId, 2);
    return null;
  };
  bannerRepository.delete = async () => {
    deleteCalled = true;
  };

  await assert.rejects(
    () => deleteBannerService.execute({ id: 9, restaurantId: 2 }),
    /Banner não encontrado/,
  );
  assert.equal(deleteCalled, false);
});

test('coupon update is scoped to the authenticated restaurant', async () => {
  let updateCalled = false;
  couponRepository.findById = async (id, restaurantId) => {
    assert.equal(id, 15);
    assert.equal(restaurantId, 3);
    return null;
  };
  couponRepository.update = async () => {
    updateCalled = true;
  };

  await assert.rejects(
    () =>
      updateCouponService.execute({
        id: 15,
        restaurantId: 3,
        discount: 100,
      }),
    /Cupom não encontrado/,
  );
  assert.equal(updateCalled, false);
});

test('coupon delete is scoped to the authenticated restaurant', async () => {
  let deleteCalled = false;
  couponRepository.findById = async (_id, restaurantId) => {
    assert.equal(restaurantId, 3);
    return null;
  };
  couponRepository.delete = async () => {
    deleteCalled = true;
  };

  await assert.rejects(
    () => deleteCouponService.execute({ id: 15, restaurantId: 3 }),
    /Cupom não encontrado/,
  );
  assert.equal(deleteCalled, false);
});

test('coupon update e delete repetem o tenant na própria escrita do Prisma', async () => {
  let updateWhere;
  let lookupWhere;
  let deleteWhere;
  prisma.coupon.updateMany = async ({ where }) => {
    updateWhere = where;
    return { count: 1 };
  };
  prisma.coupon.findFirst = async ({ where }) => {
    lookupWhere = where;
    return { id: 15, restaurantId: 3, code: 'TENANT3' };
  };
  prisma.coupon.deleteMany = async ({ where }) => {
    deleteWhere = where;
    return { count: 1 };
  };

  await couponRepository.update(15, 3, { active: false });
  await couponRepository.delete(15, 3);

  assert.deepEqual(updateWhere, { id: 15, restaurantId: 3 });
  assert.deepEqual(lookupWhere, { id: 15, restaurantId: 3 });
  assert.deepEqual(deleteWhere, { id: 15, restaurantId: 3 });
});
