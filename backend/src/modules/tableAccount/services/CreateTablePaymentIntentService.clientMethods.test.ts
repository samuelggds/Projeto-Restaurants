import assert from 'node:assert/strict';
import test from 'node:test';
import { CreateTablePaymentIntentService } from './CreateTablePaymentIntentService.js';
import { TablePaymentError } from './tablePaymentSupport.js';

const context = {
  tableSessionId: 55,
  sessionPublicId: '323e4567-e89b-42d3-a456-426614174001',
  restaurantId: 7,
  participantId: 80,
  participantUserId: null,
  participantName: 'Cliente da mesa',
  participantPhone: '85999999999',
};

test('cliente de mesa não pode iniciar novo pagamento CARD mesmo com payload válido', async () => {
  await assert.rejects(
    () =>
      new CreateTablePaymentIntentService().execute(context, {
        selectionMode: 'MY_ITEMS',
        method: 'CARD',
        includeOptionalServiceFee: false,
        cardPayment: {
          cardPaymentType: 'credit',
          cardToken: 'token-protegido-de-teste',
          cardPaymentMethodId: 'visa',
        },
        idempotencyKey: 'table-payment:card-disabled-0001',
      }),
    (error) =>
      error instanceof TablePaymentError &&
      error.statusCode === 400 &&
      error.code === 'CLIENT_TABLE_CARD_PAYMENT_DISABLED',
  );
});

test('bloqueio de CARD ocorre antes de qualquer operação financeira externa', async () => {
  let providerCalled = false;
  const provider = {
    code: 'MERCADO_PAGO',
    async createPayment() {
      providerCalled = true;
      throw new Error('provider não deveria ser chamado');
    },
    async getPayment() {
      throw new Error('not used');
    },
    async cancelPayment() {
      throw new Error('not used');
    },
    async refundPayment() {
      throw new Error('not used');
    },
    async validateWebhook() {
      throw new Error('not used');
    },
  };

  await assert.rejects(
    () =>
      new CreateTablePaymentIntentService(provider).execute(context, {
        selectionMode: 'MY_ITEMS',
        method: 'CARD',
        includeOptionalServiceFee: false,
        cardPayment: {
          cardPaymentType: 'credit',
          cardToken: 'token-protegido-de-teste',
          cardPaymentMethodId: 'master',
        },
        idempotencyKey: 'table-payment:card-disabled-0002',
      }),
    /somente Pix/u,
  );

  assert.equal(providerCalled, false);
});
