// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import express from 'express';
import restaurantAccessService from '../../billing/services/RestaurantAccessService.js';
import controller from './GetRestaurantAvailabilityController.js';

const originalEvaluate = restaurantAccessService.evaluate;

afterEach(() => {
  restaurantAccessService.evaluate = originalEvaluate;
});

async function requestAvailability(id = 7) {
  const app = express();
  app.get('/restaurants/:id/availability', (req, res) => controller.handle(req, res));
  const server = app.listen(0);
  const address = server.address();
  try {
    return await fetch(`http://127.0.0.1:${address.port}/restaurants/${id}/availability`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('expõe somente id e disponibilidade, sem motivo ou fatura', async () => {
  restaurantAccessService.evaluate = async () => ({
    allowed: false,
    restaurantId: 7,
    reason: 'BILLING',
    code: 'BILLING_BLOCKED',
    message: 'segredo operacional',
    invoiceId: 99,
    paymentLink: 'https://payment.test',
    dueDate: new Date(),
  });

  const response = await requestAvailability();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { restaurantId: 7, available: false });
});

test('informa quando o acesso foi restabelecido', async () => {
  restaurantAccessService.evaluate = async () => ({ allowed: true, restaurantId: 7 });
  const response = await requestAvailability();
  assert.deepEqual(await response.json(), { restaurantId: 7, available: true });
});
