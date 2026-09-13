// @ts-nocheck
import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../../../config/prisma.js';
import settings from '../../restaurantSettings/repositories/RestaurantSettingsRepository.js';
import repository from '../repositories/TablePaymentRepository.js';
import { ProcessPagBankTablePaymentWebhookService } from './ProcessPagBankTablePaymentWebhookService.js';
import webhook from '../../orders/controllers/PagBankOrderWebhookController.js';
import { pagBankTableReference } from '../../payments/providers/pagBankCheckout.js';
import { ConfiguredTablePaymentProvider } from '../providers/ConfiguredTablePaymentProvider.js';
import { tableAccountEvents } from '../realtime/tableAccountEvents.js';

const original = {
  settings: settings.findByRestaurantId,
  find: repository.findPagBankCheckout,
  bind: repository.bindPagBankCharge,
  fetch: globalThis.fetch,
  transaction: prisma.$transaction,
  findIntent: prisma.tablePaymentIntent.findFirst,
  findUnique: prisma.tablePaymentIntent.findUnique,
  updateEvent: prisma.tablePaymentEvent.updateMany,
  upsertEvent: prisma.tablePaymentEvent.upsert,
  updated: tableAccountEvents.updated,
};
let intent, reference, calls, events, checkout, payment;
const input = () => ({ intentId: 91, restaurantId: 7, reference, providerOrderId: 'ORDE_91' });
beforeEach(() => {
  intent = {
    id: 91,
    restaurantId: 7,
    publicId: '423e4567-e89b-42d3-a456-426614174091',
    totalCents: 3000n,
    provider: 'PAGBANK',
    method: 'CARD',
    status: 'PENDING',
    payerParticipantId: 14,
    tableSessionId: 3,
    providerExternalId: 'pagbank_checkout:CHEC_91',
    providerChargeId: null,
    expiresAt: new Date(Date.now() + 600000),
  };
  reference = pagBankTableReference(intent);
  calls = [];
  events = [];
  checkout = { id: 'CHEC_91', reference_id: reference, status: 'ACTIVE' };
  payment = {
    id: 'ORDE_91',
    reference_id: reference,
    charges: [
      {
        id: 'CHAR_91',
        reference_id: 'generated-charge-reference',
        status: 'PAID',
        amount: { value: 3000, currency: 'BRL', summary: { paid: 3000, refunded: 0 } },
        payment_method: { type: 'PAGBANK_WALLET' },
      },
    ],
  };
  settings.findByRestaurantId = async (tenant) => {
    assert.equal(tenant, 7);
    return { pagbankToken: 'tenant-seven' };
  };
  repository.findPagBankCheckout = async (id, tenant) => {
    assert.deepEqual([id, tenant], [91, 7]);
    return { ...intent };
  };
  repository.bindPagBankCharge = async (args) => {
    assert.deepEqual(args, {
      id: 91,
      restaurantId: 7,
      publicId: intent.publicId,
      checkoutReference: intent.providerExternalId,
      chargeId: 'CHAR_91',
    });
    intent.providerChargeId = args.chargeId;
    return true;
  };
  globalThis.fetch = async (url, init) => {
    calls.push(String(url));
    assert.equal(init.headers.Authorization, 'Bearer tenant-seven');
    const body = String(url).includes('/checkouts/')
      ? checkout
      : String(url).includes('/orders/')
        ? payment
        : payment.charges[0];
    return new Response(JSON.stringify(body));
  };
});
afterEach(() => {
  settings.findByRestaurantId = original.settings;
  repository.findPagBankCheckout = original.find;
  repository.bindPagBankCharge = original.bind;
  globalThis.fetch = original.fetch;
  prisma.$transaction = original.transaction;
  prisma.tablePaymentIntent.findFirst = original.findIntent;
  prisma.tablePaymentIntent.findUnique = original.findUnique;
  prisma.tablePaymentEvent.updateMany = original.updateEvent;
  prisma.tablePaymentEvent.upsert = original.upsertEvent;
  tableAccountEvents.updated = original.updated;
});
function service() {
  return new ProcessPagBankTablePaymentWebhookService({
    executeValidated: async (event) => {
      assert.equal(intent.providerChargeId, 'CHAR_91');
      events.push(event);
      return { received: true };
    },
  });
}

test('mesa vincula charge por consulta Orders e preserva checkout para processamento canônico e polling', async () => {
  await service().execute(input());
  assert.equal(intent.providerExternalId, 'pagbank_checkout:CHEC_91');
  assert.equal(events[0].externalId, intent.providerExternalId);
  assert.equal(events[0].status, 'PAID');
  assert.equal(events[0].amountCents, 3000);
  assert.match(calls[0], /checkouts\/CHEC_91/);
  assert.match(calls[1], /orders\/ORDE_91/);
  prisma.tablePaymentIntent.findFirst = async (query) => {
    assert.equal(query.where.restaurantId, 7);
    assert.equal(query.where.publicId, intent.publicId);
    return { ...intent };
  };
  const provider = new ConfiguredTablePaymentProvider(
    {
      restaurantId: 7,
      intentId: 91,
      intentPublicId: intent.publicId,
      participantId: 14,
      participantUserId: null,
      participantName: null,
      participantPhone: null,
      method: 'CARD',
    },
    'PAGBANK',
  );
  calls.length = 0;
  const paid = await provider.getPayment(intent.providerExternalId);
  assert.equal(paid.status, 'PAID');
  assert.equal(paid.externalId, intent.providerExternalId);
  assert.equal(calls.length, 1);
  assert.match(calls[0], /charges\/CHAR_91$/);
});

test('notificação duplicada conserva vínculo e chave de deduplicação canônica', async () => {
  await service().execute(input());
  await service().execute(input());
  assert.equal(intent.providerChargeId, 'CHAR_91');
  assert.equal(events.length, 2);
  assert.equal(events[0].eventId, events[1].eventId);
});

for (const [label, change] of [
  [
    'checkout de outra intenção',
    () => {
      checkout.id = 'CHEC_other';
    },
  ],
  [
    'referência remota de outro tenant',
    () => {
      payment.reference_id = reference.replace(':7:', ':8:');
    },
  ],
  [
    'ID Orders diferente',
    () => {
      payment.id = 'ORDE_other';
    },
  ],
  [
    'valor divergente',
    () => {
      payment.charges[0].amount.value = 1;
    },
  ],
  [
    'moeda divergente',
    () => {
      payment.charges[0].amount.currency = 'USD';
    },
  ],
  [
    'charge sem identificação',
    () => {
      delete payment.charges[0].id;
    },
  ],
  [
    'charge já vinculada diferente',
    () => {
      intent.providerChargeId = 'CHAR_other';
    },
  ],
])
  test(`mesa rejeita ${label} sem processar saldo`, async () => {
    change();
    await assert.rejects(() => service().execute(input()));
    assert.equal(events.length, 0);
  });

test('CAS perdido não confirma mesa nem sobrescreve charge concorrente', async () => {
  repository.bindPagBankCharge = async () => false;
  await assert.rejects(() => service().execute(input()), /alterado durante/);
  assert.equal(events.length, 0);
  assert.equal(intent.providerChargeId, null);
});

test('referência aleatória de outra mesa não provoca consulta nem confirmação', async () => {
  await assert.rejects(
    () => service().execute({ ...input(), reference: reference.replace('423e', '523e') }),
    /referência PagBank/,
  );
  assert.equal(calls.length, 0);
  assert.equal(events.length, 0);
});

test('webhook pago depois do cancelamento estorna charge vinculada sem reabrir mesa ou repetir estorno', async () => {
  intent.status = 'CANCELED';
  const ledger = new Map();
  let refunds = 0;
  const tx = {
    $queryRaw: async () => [],
    tablePaymentIntent: {
      findUniqueOrThrow: async () => ({ ...intent }),
      updateMany: async () => {
        throw new Error('Pagamento tardio não pode reabrir a intenção');
      },
    },
    tablePaymentEvent: {
      findUnique: async ({ where }) => ledger.get(where.deduplicationKey) || null,
      create: async ({ data }) => {
        const row = { id: ledger.size + 1, ...data };
        ledger.set(data.deduplicationKey, row);
        return row;
      },
    },
  };
  prisma.$transaction = async (run) => run(tx);
  prisma.tablePaymentIntent.findUnique = async () => ({ ...intent });
  prisma.tablePaymentIntent.findFirst = async ({ where }) => {
    assert.equal(where.restaurantId, 7);
    assert.equal(where.providerExternalId, intent.providerExternalId);
    return { ...intent };
  };
  prisma.tablePaymentEvent.updateMany = async ({ where, data }) => {
    Object.assign(ledger.get(where.deduplicationKey), data);
    return { count: 1 };
  };
  prisma.tablePaymentEvent.upsert = async ({ where, create }) => {
    if (!ledger.has(where.deduplicationKey)) ledger.set(where.deduplicationKey, create);
    return ledger.get(where.deduplicationKey);
  };
  tableAccountEvents.updated = async () => true;
  globalThis.fetch = async (url, init) => {
    assert.equal(init.headers.Authorization, 'Bearer tenant-seven');
    if (String(url).endsWith('/cancel')) {
      refunds++;
      assert.deepEqual(JSON.parse(init.body), { amount: { value: 3000 } });
      payment.charges[0].status = 'CANCELED';
      payment.charges[0].amount.summary.refunded = 3000;
    }
    return new Response(
      JSON.stringify(
        String(url).includes('/checkouts/')
          ? checkout
          : String(url).includes('/orders/')
            ? payment
            : payment.charges[0],
      ),
    );
  };
  const response = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json() {
      return this;
    },
    sendStatus(code) {
      this.statusCode = code;
      return this;
    },
  };
  const request = {
    body: { id: 'ORDE_91', reference_id: reference, charges: [{ status: 'PAID' }] },
    query: { restaurantId: '7' },
  };
  await webhook.handle(request, response);
  assert.equal(response.statusCode, 200);
  assert.equal(refunds, 1);
  assert.equal(intent.status, 'CANCELED');
  assert.equal(intent.providerChargeId, 'CHAR_91');
  assert.equal(intent.providerExternalId, 'pagbank_checkout:CHEC_91');
  assert.ok([...ledger.values()].some((event) => event.metadata?.automaticLateRefund === true));
  await webhook.handle(request, response);
  assert.equal(response.statusCode, 200);
  assert.equal(refunds, 1);
  assert.equal(intent.status, 'CANCELED');
});

test('pedido remoto ainda pendente não vincula charge mesmo que cliente envie aviso', async () => {
  payment.charges[0].status = 'WAITING';
  assert.deepEqual(await service().execute(input()), { received: true, pending: true });
  assert.equal(intent.providerChargeId, null);
  assert.equal(events.length, 0);
});

test('webhook mesa rejeita dica de tenant divergente antes de consulta e ignora PAID forjado', async () => {
  const response = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json() {
      return this;
    },
    sendStatus(code) {
      this.statusCode = code;
      return this;
    },
  };
  await webhook.handle(
    {
      body: { id: 'ORDE_91', reference_id: reference, status: 'PAID' },
      query: { restaurantId: '8' },
    },
    response,
  );
  assert.equal(response.statusCode, 400);
  assert.equal(calls.length, 0);
  payment.charges[0].status = 'WAITING';
  await webhook.handle(
    {
      body: { id: 'ORDE_91', reference_id: reference, charges: [{ status: 'PAID' }] },
      query: { restaurantId: '7' },
    },
    response,
  );
  assert.equal(response.statusCode, 200);
  assert.equal(intent.providerChargeId, null);
});

test('repositório CAS usa tenant/UUID/checkout e restaura duplicata sem aceitar charge distinta', async () => {
  const bind = original.bind.bind(repository);
  let saved = null;
  prisma.$transaction = async (run) =>
    run({
      $queryRaw: async (_parts, tenant) => {
        assert.equal(tenant, '7');
        return [];
      },
      tablePaymentIntent: {
        updateMany: async ({ where, data }) => {
          assert.equal(where.restaurantId, 7);
          assert.equal(where.publicId, intent.publicId);
          assert.equal(where.providerExternalId, intent.providerExternalId);
          assert.equal(where.providerChargeId, null);
          if (saved) return { count: 0 };
          saved = data.providerChargeId;
          return { count: 1 };
        },
        findFirst: async () => ({ providerChargeId: saved }),
      },
    });
  const args = {
    id: 91,
    restaurantId: 7,
    publicId: intent.publicId,
    checkoutReference: intent.providerExternalId,
    chargeId: 'CHAR_91',
  };
  assert.equal(await bind(args), true);
  assert.equal(await bind(args), true);
  assert.equal(await bind({ ...args, chargeId: 'CHAR_other' }), false);
  assert.equal(saved, 'CHAR_91');
});
