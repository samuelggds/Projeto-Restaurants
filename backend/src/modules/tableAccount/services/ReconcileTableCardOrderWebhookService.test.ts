import assert from 'node:assert/strict';
import test from 'node:test';
import type { PaymentProvider } from '../providers/PaymentProvider.js';
import { ReconcileTableCardOrderWebhookService } from './ReconcileTableCardOrderWebhookService.js';

test('webhook de order do Mercado Pago reconcilia somente o pagamento de mesa encontrado', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const provider: PaymentProvider = {
    code: 'MERCADO_PAGO',
    async createPayment() {
      throw new Error('not used');
    },
    async getPayment(externalId) {
      assert.equal(externalId, 'mp_order:ORD_TABLE_91');
      return {
        externalId,
        status: 'PAID',
        amountCents: 3000,
        checkoutUrl: null,
        paymentCode: null,
        expiresAt: new Date('2030-01-01T12:00:00.000Z'),
      };
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

  const service = new ReconcileTableCardOrderWebhookService(
    async (externalId) => {
      assert.equal(externalId, 'mp_order:ORD_TABLE_91');
      return {
        id: 91,
        publicId: '323e4567-e89b-42d3-a456-426614174703',
        restaurantId: 7,
        tableSessionId: 55,
        payerParticipantId: 80,
        method: 'CARD',
        provider: 'MERCADO_PAGO',
      };
    },
    (context, configuredProvider) => {
      assert.equal(configuredProvider, 'MERCADO_PAGO');
      assert.equal(context.restaurantId, 7);
      assert.equal(context.participantId, 80);
      assert.equal(context.intentId, 91);
      return provider;
    },
    () => ({
      async executeValidated(event) {
        calls.push(event as unknown as Record<string, unknown>);
        return { received: true, ignored: false, processed: true };
      },
    }),
  );

  assert.equal(await service.execute('ORD_TABLE_91'), true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].externalId, 'mp_order:ORD_TABLE_91');
  assert.equal(calls[0].status, 'PAID');
  assert.equal(calls[0].amountCents, 3000);
});

test('webhook desconhecido não consulta gateway nem revela outro tenant', async () => {
  let providerCreated = false;
  const service = new ReconcileTableCardOrderWebhookService(
    async () => null,
    () => {
      providerCreated = true;
      throw new Error('não deveria criar provider');
    },
    () => {
      throw new Error('não deveria criar processor');
    },
  );

  assert.equal(await service.execute('ORD_UNKNOWN'), false);
  assert.equal(providerCreated, false);
  assert.equal(await service.execute(''), false);
});
