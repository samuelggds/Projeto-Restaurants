// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import prisma from '../../../config/prisma.js';
import restaurantSettingsRepository from '../../restaurantSettings/repositories/RestaurantSettingsRepository.js';
import { ConfiguredTablePaymentProvider } from './ConfiguredTablePaymentProvider.js';

const originalFindFirst = prisma.tablePaymentIntent.findFirst;
const originalFetch = globalThis.fetch;
const originalSettings = restaurantSettingsRepository.findByRestaurantId;

afterEach(() => {
  prisma.tablePaymentIntent.findFirst = originalFindFirst;
  globalThis.fetch = originalFetch;
  restaurantSettingsRepository.findByRestaurantId = originalSettings;
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

const externalId = '1234';
const expiresAt = new Date('2026-09-07T20:00:00.000Z');

function arrangeIntent() {
  prisma.tablePaymentIntent.findFirst = async (query) => {
    assert.deepEqual(query.where, {
      id: context.intentId,
      publicId: context.intentPublicId,
      restaurantId: context.restaurantId,
      provider: 'MERCADO_PAGO',
      providerExternalId: externalId,
    });
    return { totalCents: 3_000n, expiresAt, providerChargeId: null };
  };
  restaurantSettingsRepository.findByRestaurantId = async (restaurantId) => {
    assert.equal(restaurantId, context.restaurantId);
    return {
      restaurantId,
      mercadoPagoAccessToken: 'tenant-mp-token',
      mercadoPagoRefreshToken: null,
      mercadoPagoTokenExpiresAt: null,
    };
  };
}

function provider() {
  return new ConfiguredTablePaymentProvider(context, 'MERCADO_PAGO');
}

test('reconcilia Pix pendente sem alterar o valor da intenção', async () => {
  arrangeIntent();
  globalThis.fetch = async (url, init) => {
    assert.equal(String(url), 'https://api.mercadopago.com/v1/payments/1234');
    assert.equal(init.headers.Authorization, 'Bearer tenant-mp-token');
    return new Response(
      JSON.stringify({
        id: 1234,
        status: 'pending',
        transaction_amount: 30,
        currency_id: 'BRL',
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  };

  const payment = await provider().getPayment(externalId);
  assert.equal(payment.status, 'PENDING');
  assert.equal(payment.amountCents, 3_000);
  assert.equal(payment.externalId, externalId);
});

test('confirma Pix somente com ID, valor e moeda correspondentes à intenção', async () => {
  arrangeIntent();
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        id: 1234,
        status: 'approved',
        transaction_amount: 30,
        currency_id: 'BRL',
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );

  const payment = await provider().getPayment(externalId);
  assert.equal(payment.status, 'PAID');
  assert.equal(payment.amountCents, 3_000);
});

for (const body of [
  { id: 9999, status: 'approved', transaction_amount: 30, currency_id: 'BRL' },
  { id: 1234, status: 'approved', transaction_amount: 30, currency_id: 'USD' },
  { id: 1234, status: 'approved', transaction_amount: 0.01, currency_id: 'BRL' },
]) {
  test(`rejeita evidência financeira divergente: ${JSON.stringify(body)}`, async () => {
    arrangeIntent();
    globalThis.fetch = async () =>
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });

    await assert.rejects(() => provider().getPayment(externalId), /não corresponde/i);
  });
}

test('não consulta o gateway quando a intenção não pertence ao tenant/escopo', async () => {
  prisma.tablePaymentIntent.findFirst = async () => null;
  let queried = false;
  globalThis.fetch = async () => {
    queried = true;
    return new Response('{}');
  };

  await assert.rejects(
    () => provider().getPayment(externalId),
    /Pagamento da mesa não encontrado/,
  );
  assert.equal(queried, false);
});
