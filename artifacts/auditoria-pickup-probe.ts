// Audit only: every persistence/provider method used here is replaced in this process.
import assert from 'node:assert/strict';
import prisma from '../backend/src/config/prisma.js';
import orders from '../backend/src/modules/orders/repositories/OrderRepository.js';
import terminals from '../backend/src/modules/paymentTerminals/repositories/PaymentTerminalRepository.js';
import settings from '../backend/src/modules/restaurantSettings/repositories/RestaurantSettingsRepository.js';
import pix from '../backend/src/modules/orders/services/OrderPixPaymentService.js';
import pickup from '../backend/src/modules/pickupPayments/services/PickupPaymentService.js';

async function main() {
  const order = { id: 91, restaurantId: 7, paid: false, status: 'CANCELADO', type: 'RETIRADA', paymentMethod: null,
    total: 20, itemsSubtotal: 20, couponDiscount: 0, items: [], userId: null };
  orders.findById = async () => order as never;
  const writes: unknown[] = [];
  prisma.$transaction = (async (callback) => callback({ order: {
    findFirst: async () => null,
    update: async (input) => { writes.push(input.data); return { ...order, ...input.data }; },
  } })) as never;
  const cash = await pickup.confirmCash({ orderId: 91, restaurantId: 7, role: 'ADMIN' });
  assert.equal(cash.status, 'CANCELADO');
  assert.equal(cash.paid, true);
  console.log(JSON.stringify({ scenario: 'canceled-pickup-accepted-as-cash', status: cash.status, paid: cash.paid, writes: writes.length }));

  order.status = 'PENDENTE';
  let stored: Record<string, unknown> | null = null;
  let providerCalls = 0;
  terminals.findDeliveryPayment = (async () => stored) as never;
  terminals.createDeliveryPayment = (async (input) => { stored = { ...input, status: 'CREATING' }; return stored; }) as never;
  settings.findByRestaurantId = (async () => ({ pixProvider: 'MERCADO_PAGO' })) as never;
  pix.createPixPayment = async () => { providerCalls++; throw new Error('simulated provider timeout'); };
  const request = { orderId: 91, restaurantId: 7, role: 'ADMIN', method: 'PIX' as const };
  await assert.rejects(() => pickup.start(request), /simulated provider timeout/u);
  const retry = await pickup.start(request);
  assert.equal(providerCalls, 1);
  assert.equal(retry.payment.pixCopyPaste, null);
  console.log(JSON.stringify({ scenario: 'pickup-timeout-retry-does-not-resume', providerCalls,
    returnedPayment: Boolean(retry.payment), pixCode: retry.payment.pixCopyPaste }));
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
