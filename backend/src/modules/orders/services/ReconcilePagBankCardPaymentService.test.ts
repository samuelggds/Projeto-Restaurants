// @ts-nocheck
import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import settings from '../../restaurantSettings/repositories/RestaurantSettingsRepository.js';
import orders from '../repositories/OrderRepository.js';
import finalize from './FinalizeOrderCardPaymentService.js';
import reconcile from './ReconcilePagBankCardPaymentService.js';
import webhook from '../controllers/PagBankOrderWebhookController.js';
import { pagBankCardReference } from '../../payments/providers/pagBankCheckout.js';

const original = {
  settings: settings.findByRestaurantId,
  find: orders.findById,
  bind: orders.bindCardPaymentReference,
  finalize: finalize.execute,
  fetch: globalThis.fetch,
};
let order, finalized;
beforeEach(() => {
  order = {
    id: 91,
    publicId: '123e4567-e89b-42d3-a456-426614174001',
    restaurantId: 7,
    paymentMethod: 'CARTAO',
    total: 25,
    paid: false,
    cardCheckoutSessionId: 'pagbank_checkout:CHEC_91',
    status: 'PENDENTE',
  };
  settings.findByRestaurantId = async () => ({ restaurantId: 7, pagbankToken: 'restaurant-7' });
  orders.findById = async (id, tenant) => {
    assert.deepEqual([Number(id), tenant], [91, 7]);
    return { ...order };
  };
  orders.bindCardPaymentReference = async (id, tenant, before, after) => {
    assert.equal(before, order.cardCheckoutSessionId);
    order.cardCheckoutSessionId = after;
    return true;
  };
  finalized = 0;
  finalize.execute = async ({ checkoutSessionId, restaurantId }) => {
    assert.equal(checkoutSessionId, 'pagbank_charge:CHAR_91');
    assert.equal(restaurantId, 7);
    finalized++;
    order.paid = true;
    return { ...order };
  };
  globalThis.fetch = async (url) =>
    new Response(
      JSON.stringify(
        String(url).includes('/checkouts/')
          ? { id: 'CHEC_91', reference_id: pagBankCardReference(order), status: 'ACTIVE' }
          : {
              id: 'ORDE_91',
              reference_id: pagBankCardReference(order),
              charges: [
                {
                  id: 'CHAR_91',
                  status: 'PAID',
                  reference_id: 'generated-by-pagbank',
                  amount: { value: 2500, currency: 'BRL' },
                  payment_method: { type: 'CREDIT_CARD' },
                },
              ],
            },
      ),
    );
});
afterEach(() => {
  settings.findByRestaurantId = original.settings;
  orders.findById = original.find;
  orders.bindCardPaymentReference = original.bind;
  finalize.execute = original.finalize;
  globalThis.fetch = original.fetch;
});

test('vincula charge do checkout e só libera após a finalização canônica', async () => {
  const result = await reconcile.execute({
    orderId: 91,
    restaurantId: 7,
    providerOrderId: 'ORDE_91',
  });
  assert.equal(result?.paid, true);
  assert.equal(order.cardCheckoutSessionId, 'pagbank_charge:CHAR_91');
  assert.equal(finalized, 1);
});

test('não sobrescreve pagamento se a referência for alterada durante a consulta', async () => {
  orders.bindCardPaymentReference = async () => false;
  await assert.rejects(
    () => reconcile.execute({ orderId: 91, restaurantId: 7, providerOrderId: 'ORDE_91' }),
    /referência do cartão foi alterada/,
  );
  assert.equal(finalized, 0);
});

test('webhook Connect válido confirma sem exigir email legado', async () => {
  const response = {
    statusCode: 200,
    status(value) {
      this.statusCode = value;
      return this;
    },
    json(value) {
      this.body = value;
      return this;
    },
    sendStatus(value) {
      this.statusCode = value;
      return this;
    },
  };
  await webhook.handle(
    {
      body: { id: 'ORDE_91', reference_id: pagBankCardReference(order) },
      query: { restaurantId: '7' },
    },
    response,
  );
  assert.equal(response.statusCode, 200);
  assert.equal(finalized, 1);
  assert.equal(order.paid, true);
});

test('webhook com payload PAID adulterado não confirma quando consulta remota ainda aguarda', async () => {
  globalThis.fetch = async (url) =>
    new Response(
      JSON.stringify(
        String(url).includes('/checkouts/')
          ? { id: 'CHEC_91', reference_id: pagBankCardReference(order), status: 'ACTIVE' }
          : { id: 'ORDE_91', reference_id: pagBankCardReference(order), charges: [] },
      ),
    );
  const response = {
    statusCode: 200,
    status(value) {
      this.statusCode = value;
      return this;
    },
    json(value) {
      this.body = value;
      return this;
    },
    sendStatus(value) {
      this.statusCode = value;
      return this;
    },
  };
  await webhook.handle(
    {
      body: {
        id: 'ORDE_91',
        reference_id: pagBankCardReference(order),
        charges: [{ id: 'CHAR_evil', status: 'PAID' }],
      },
      query: { restaurantId: '7' },
    },
    response,
  );
  assert.equal(response.statusCode, 200);
  assert.equal(finalized, 0);
});

test('webhook de outro restaurante é rejeitado antes de consultar ou confirmar', async () => {
  let queried = false;
  globalThis.fetch = async () => {
    queried = true;
    throw new Error('Não deveria consultar');
  };
  const response = {
    statusCode: 200,
    status(value) {
      this.statusCode = value;
      return this;
    },
    json(value) {
      this.body = value;
      return this;
    },
    sendStatus(value) {
      this.statusCode = value;
      return this;
    },
  };
  await webhook.handle(
    {
      body: { id: 'ORDE_91', reference_id: pagBankCardReference(order) },
      query: { restaurantId: '8' },
    },
    response,
  );
  assert.equal(response.statusCode, 400);
  assert.equal(queried, false);
  assert.equal(finalized, 0);
});
