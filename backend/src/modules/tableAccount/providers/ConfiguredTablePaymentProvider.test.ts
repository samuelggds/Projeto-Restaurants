// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import prisma from '../../../config/prisma.js';
import orderPixPaymentService from '../../orders/services/OrderPixPaymentService.js';
import { ConfiguredTablePaymentProvider } from './ConfiguredTablePaymentProvider.js';

const originalFindFirst = prisma.tablePaymentIntent.findFirst;
const originalGetPaymentStatus = orderPixPaymentService.getPaymentStatus;

afterEach(() => {
  prisma.tablePaymentIntent.findFirst = originalFindFirst;
  orderPixPaymentService.getPaymentStatus = originalGetPaymentStatus;
});

const context = {
  restaurantId: 7,
  participantId: 80,
  participantUserId: null,
  participantName: 'Cliente da mesa',
  participantPhone: null,
  intentId: 91,
  intentPublicId: '423e4567-e89b-42d3-a456-426614174091',
  method: 'PIX',
};
const externalId = 'pagbank:ORDE_123';
const expiresAt = new Date('2026-09-07T20:00:00.000Z');

function arrangePixStatus(status, amount, isApproved = false) {
  prisma.tablePaymentIntent.findFirst = async (query) => {
    assert.deepEqual(query.where, {
      id: context.intentId,
      publicId: context.intentPublicId,
      restaurantId: context.restaurantId,
      provider: 'PAGBANK',
      providerExternalId: externalId,
    });
    return { totalCents: 3_000n, expiresAt };
  };
  orderPixPaymentService.getPaymentStatus = async (input) => {
    assert.deepEqual(input, { paymentId: externalId, restaurantId: context.restaurantId });
    return { status, amount, isApproved, sameRestaurant: true };
  };
  return new ConfiguredTablePaymentProvider(context, 'PAGBANK');
}

for (const [providerStatus, expectedStatus] of [
  ['waiting', 'PENDING'],
  ['DECLINED', 'FAILED'],
  ['rejected', 'FAILED'],
  ['CANCELED', 'CANCELED'],
  ['cancelled', 'CANCELED'],
]) {
  test(`reconcilia Pix ${providerStatus} sem converter valor ausente em zero`, async () => {
    const provider = arrangePixStatus(providerStatus, null);
    const payment = await provider.getPayment(externalId);
    assert.equal(payment.status, expectedStatus);
    assert.equal(payment.amountCents, 3_000);
    assert.equal(payment.externalId, externalId);
  });
}

for (const invalidAmount of [null, undefined, Number.NaN, Infinity, 0, 29.99, 30.01]) {
  test(`não confirma Pix aprovado com valor inválido ou divergente: ${String(invalidAmount)}`, async () => {
    const provider = arrangePixStatus('paid', invalidAmount, true);
    await assert.rejects(
      () => provider.getPayment(externalId),
      /valor retornado pelo Pix não corresponde à conta da mesa/,
    );
  });
}

test('exige valor também quando o status bruto do provedor indica pagamento', async () => {
  const provider = arrangePixStatus('PAID', null, false);
  await assert.rejects(
    () => provider.getPayment(externalId),
    /valor retornado pelo Pix não corresponde à conta da mesa/,
  );
});

test('confirma Pix com valor validado e correspondente à intenção deste restaurante', async () => {
  const provider = arrangePixStatus('paid', 30, true);
  const payment = await provider.getPayment(externalId);
  assert.equal(payment.status, 'PAID');
  assert.equal(payment.amountCents, 3_000);
});

test('continua rejeitando valor divergente informado em Pix pendente', async () => {
  const provider = arrangePixStatus('WAITING', 10);
  await assert.rejects(
    () => provider.getPayment(externalId),
    /valor retornado pelo Pix não corresponde à conta da mesa/,
  );
});

test('não consulta o provedor quando a intenção não pertence ao escopo informado', async () => {
  const provider = arrangePixStatus('paid', 30, true);
  prisma.tablePaymentIntent.findFirst = async () => null;
  let queried = false;
  orderPixPaymentService.getPaymentStatus = async () => {
    queried = true;
  };
  await assert.rejects(() => provider.getPayment(externalId), /Pagamento da mesa não encontrado/);
  assert.equal(queried, false);
});
