import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAutomaticOrderStatusMessage } from './customerOrderMessaging.js';

test('SAIU_PARA_ENTREGA inclui rastreio e código de confirmação de quatro dígitos', () => {
  const message = buildAutomaticOrderStatusMessage({
    customerName: 'Cliente',
    restaurantName: 'North Pizza',
    orderId: 107,
    status: 'SAIU_PARA_ENTREGA',
    orderType: 'DELIVERY',
    trackingUrl: 'https://app.example.com/orders/107/tracking#guestToken=seguro',
    deliveryConfirmationCode: '4821',
  });

  assert.match(message, /saiu para entrega/iu);
  assert.match(message, /Acompanhe em tempo real/iu);
  assert.match(message, /4821/u);
  assert.match(message, /somente quando estiver com o pedido em mãos/iu);
});

test('SAIU_PARA_ENTREGA não inventa código quando ele não foi fornecido', () => {
  const message = buildAutomaticOrderStatusMessage({
    customerName: 'Cliente',
    restaurantName: 'North Pizza',
    orderId: 107,
    status: 'SAIU_PARA_ENTREGA',
    orderType: 'DELIVERY',
    trackingUrl: 'https://app.example.com/orders/107/tracking#guestToken=seguro',
  });

  assert.doesNotMatch(message, /Código de confirmação da entrega/iu);
});

test('ENTREGUE inclui o link seguro para o cliente confirmar recebimento', () => {
  const message = buildAutomaticOrderStatusMessage({
    customerName: 'Cliente',
    restaurantName: 'North Pizza',
    orderId: 107,
    status: 'ENTREGUE',
    orderType: 'DELIVERY',
    confirmationUrl: 'https://app.example.com/orders/107/tracking?confirm=1#guestToken=seguro',
  });

  assert.match(message, /marcado como entregue/iu);
  assert.match(message, /Confirme o recebimento com segurança/iu);
  assert.match(message, /confirm=1/u);
});
