// @ts-nocheck
import assert from "node:assert/strict";
import test, { afterEach } from "node:test";

import bannerRepository from "../banner/repositories/BannerRepository.js";
import deleteBannerService from "../banner/services/DeleteBannerService.js";
import updateBannerService from "../banner/services/UpdateBannerService.js";
import couponRepository from "../coupon/repositories/CouponRepository.js";
import deleteCouponService from "../coupon/services/DeleteCouponService.js";
import updateCouponService from "../coupon/services/UpdateCouponService.js";

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

afterEach(() => {
  Object.assign(bannerRepository, originalBannerMethods);
  Object.assign(couponRepository, originalCouponMethods);
});

test("banner update is scoped to the authenticated restaurant", async () => {
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
        title: "Outro restaurante",
      }),
    /Banner não encontrado/,
  );
  assert.equal(updateCalled, false);
});

test("banner delete is scoped to the authenticated restaurant", async () => {
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

test("coupon update is scoped to the authenticated restaurant", async () => {
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

test("coupon delete is scoped to the authenticated restaurant", async () => {
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
