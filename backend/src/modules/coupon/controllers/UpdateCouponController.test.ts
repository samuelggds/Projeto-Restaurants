// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import updateCouponService from '../services/UpdateCouponService.js';
import updateCouponController from './UpdateCouponController.js';

const originalExecute = updateCouponService.execute;

afterEach(() => {
  updateCouponService.execute = originalExecute;
});

test('ignora id e restaurantId forjados no body e usa o tenant autenticado', async () => {
  let received = null;
  updateCouponService.execute = async (payload) => {
    received = payload;
    return { id: payload.id, restaurantId: payload.restaurantId, code: payload.code };
  };
  const req = {
    params: { id: '21' },
    user: { id: 1, role: 'ADMIN', restaurantId: 7 },
    body: { id: 999, restaurantId: 88, code: ' fiel10 ' },
  };
  let statusCode = 0;
  let responseBody = null;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      responseBody = body;
      return this;
    },
  };

  await updateCouponController.handle(req, res);

  assert.equal(statusCode, 200);
  assert.equal(received.id, 21);
  assert.equal(received.restaurantId, 7);
  assert.equal(received.code, ' fiel10 ');
  assert.equal(responseBody.restaurantId, 7);
});
