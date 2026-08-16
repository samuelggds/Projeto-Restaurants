import assert from 'node:assert/strict';
import test from 'node:test';
import { OrderStatus, OrderType, UserRole } from '@prisma/client';
import { canConfirmDeliveryReceipt } from './deliveryReceiptConfirmation.js';

const deliveredOrder = {
  userId: 12,
  type: OrderType.DELIVERY,
  status: OrderStatus.ENTREGUE,
  deliveryConfirmedAt: null,
};

test('permite que somente o cliente dono confirme o recebimento de uma entrega', () => {
  assert.equal(canConfirmDeliveryReceipt(deliveredOrder, 12, UserRole.CLIENTE), true);
});

test('recusa confirmação de outro cliente e de pedidos ainda não entregues', () => {
  assert.throws(
    () => canConfirmDeliveryReceipt(deliveredOrder, 99, UserRole.CLIENTE),
    /Pedido não encontrado/,
  );
  assert.throws(
    () =>
      canConfirmDeliveryReceipt(
        { ...deliveredOrder, status: OrderStatus.SAIU_PARA_ENTREGA },
        12,
        UserRole.CLIENTE,
      ),
    /ainda não foi marcado como entregue/,
  );
});

test('não emite nova confirmação quando o cliente já confirmou', () => {
  assert.equal(
    canConfirmDeliveryReceipt(
      { ...deliveredOrder, deliveryConfirmedAt: new Date() },
      12,
      UserRole.CLIENTE,
    ),
    false,
  );
});
