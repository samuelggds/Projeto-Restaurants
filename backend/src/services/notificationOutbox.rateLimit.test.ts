import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldThrottleCustomerAutomaticMessage } from './notificationOutbox.js';

test('espaça atualizações intermediárias de pedido', () => {
  assert.equal(
    shouldThrottleCustomerAutomaticMessage({
      event: 'ORDER_STATUS_CHANGED',
      status: 'PREPARANDO',
      orderType: 'DELIVERY',
    }),
    true,
  );
  assert.equal(
    shouldThrottleCustomerAutomaticMessage({
      event: 'ORDER_STATUS_CHANGED',
      status: 'PRONTO',
      orderType: 'DELIVERY',
    }),
    true,
  );
});

test('não atrasa eventos críticos de entrega', () => {
  for (const status of ['SAIU_PARA_ENTREGA', 'ENTREGUE', 'CANCELADO']) {
    assert.equal(
      shouldThrottleCustomerAutomaticMessage({
        event: 'ORDER_STATUS_CHANGED',
        status,
        orderType: 'DELIVERY',
      }),
      false,
      status,
    );
  }
});

test('pedido pronto para retirada é prioritário', () => {
  assert.equal(
    shouldThrottleCustomerAutomaticMessage({
      event: 'ORDER_STATUS_CHANGED',
      status: 'PRONTO',
      orderType: 'RETIRADA',
    }),
    false,
  );
});

test('confirmação de pagamento não entra na espera de status', () => {
  assert.equal(
    shouldThrottleCustomerAutomaticMessage({
      event: 'PAYMENT_CONFIRMED',
      status: 'PAGO',
      orderType: 'DELIVERY',
    }),
    false,
  );
});
