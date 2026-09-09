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
const externalId = 'pagbank:ORDE_123';
const expiresAt = new Date('2026-09-07T20:00:00.000Z');

function arrangePixStatus(status, amount) {
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
  restaurantSettingsRepository.findByRestaurantId = async (restaurantId) => {
    assert.equal(restaurantId, context.restaurantId);
    return { pagbankToken: 'tenant-token' };
  };
  globalThis.fetch = async (url, init) => {
    assert.equal(new URL(url).pathname, '/orders/ORDE_123');
    assert.equal(init.headers.Authorization, 'Bearer tenant-token');
    return new Response(
      JSON.stringify({
        id: 'ORDE_123',
        charges: [
          {
            id: 'CHAR_123',
            status,
            amount: { value: amount == null ? amount : Math.round(amount * 100), currency: 'BRL' },
          },
        ],
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
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
      /Evidência financeira PagBank divergente/,
    );
  });
}

test('exige valor também quando o status bruto do provedor indica pagamento', async () => {
  const provider = arrangePixStatus('PAID', null, false);
  await assert.rejects(
    () => provider.getPayment(externalId),
    /Evidência financeira PagBank divergente/,
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
    /Evidência financeira PagBank divergente/,
  );
});

test('não consulta o provedor quando a intenção não pertence ao escopo informado', async () => {
  const provider = arrangePixStatus('paid', 30, true);
  prisma.tablePaymentIntent.findFirst = async () => null;
  let queried = false;
  globalThis.fetch = async () => {
    queried = true;
  };
  await assert.rejects(() => provider.getPayment(externalId), /Pagamento da mesa não encontrado/);
  assert.equal(queried, false);
});

test('Pix PagBank com QR válido e ainda sem cobrança permanece pendente', async () => {
  const provider = arrangePixStatus('WAITING', null);
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({ id: 'ORDE_123', charges: [], qr_codes: [{ amount: { value: 3000 } }] }),
    );
  const result = await provider.getPayment(externalId);
  assert.equal(result.status, 'PENDING');
  assert.equal(result.amountCents, 3000);
});

test('não aceita ID remoto trocado, moeda divergente ou cobranças ambíguas', async () => {
  const provider = arrangePixStatus('PAID', 30);
  const charge = { id: 'CHAR_123', status: 'PAID', amount: { value: 3000, currency: 'BRL' } };
  for (const body of [
    { id: 'ORDE_OTHER', charges: [charge] },
    { id: 'ORDE_123', charges: [{ ...charge, amount: { value: 3000, currency: 'USD' } }] },
    { id: 'ORDE_123', charges: [charge, { ...charge, id: 'CHAR_456' }] },
    { id: 'ORDE_123', charges: [], qr_codes: [{ amount: { value: 1 } }] },
  ]) {
    globalThis.fetch = async () => new Response(JSON.stringify(body));
    await assert.rejects(() => provider.getPayment(externalId), /divergente|ambígua/);
  }
});
