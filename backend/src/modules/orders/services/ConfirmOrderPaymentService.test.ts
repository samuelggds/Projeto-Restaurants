import test from 'node:test';
import assert from 'node:assert/strict';
import { PaymentMethod } from '@prisma/client';
import { resolveManualPaymentConfirmationKind } from './ConfirmOrderPaymentService.js';

test('classifica dinheiro na entrega como confirmação manual administrativa', () => {
  assert.equal(
    resolveManualPaymentConfirmationKind({
      payOnDelivery: true,
      paymentMethod: PaymentMethod.DINHEIRO,
      payOnDeliveryMethod: PaymentMethod.DINHEIRO,
    }),
    'DELIVERY_CASH',
  );
});

test('não trata dinheiro fora da entrega como confirmação manual desse fluxo', () => {
  assert.equal(
    resolveManualPaymentConfirmationKind({
      payOnDelivery: false,
      paymentMethod: PaymentMethod.DINHEIRO,
      payOnDeliveryMethod: null,
    }),
    null,
  );
});

test('mantém pagamentos digitais pendentes no fluxo administrativo existente', () => {
  assert.equal(
    resolveManualPaymentConfirmationKind({
      payOnDelivery: false,
      paymentMethod: PaymentMethod.PIX,
      payOnDeliveryMethod: null,
    }),
    'PENDING_DIGITAL',
  );
  assert.equal(
    resolveManualPaymentConfirmationKind({
      payOnDelivery: false,
      paymentMethod: PaymentMethod.CARTAO,
      payOnDeliveryMethod: null,
    }),
    'PENDING_DIGITAL',
  );
});
