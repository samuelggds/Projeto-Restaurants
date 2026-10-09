import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertExternalDispatchAllowed,
  assertExternalQuoteApproved,
  requiresExternalReconciliation,
  type ExternalDispatchContext,
} from './externalDispatchPolicy.js';

const order = {
  restaurantId: 12,
  type: 'DELIVERY',
  status: 'PRONTO',
  paid: true,
  assignedCourierId: null,
  refundStatus: 'NOT_REQUESTED',
};
const context: ExternalDispatchContext = {
  restaurantId: 12,
  deliveryMode: 'BOTH',
  providerConnected: true,
  providerAccountBelongsToRestaurant: true,
  activeOrUncertainBooking: false,
};

test('permite pedido pago no modo misto com fornecedor do mesmo restaurante', () => {
  assert.doesNotThrow(() => assertExternalDispatchAllowed(order, context));
});

test('nega acesso cruzado entre restaurantes e contas de fornecedores', () => {
  assert.throws(
    () => assertExternalDispatchAllowed(order, { ...context, restaurantId: 13 }),
    /não pertence/,
  );
  assert.throws(
    () =>
      assertExternalDispatchAllowed(order, {
        ...context,
        providerAccountBelongsToRestaurant: false,
      }),
    /não habilitado/,
  );
});

test('não permite contratação sem conexão ou no modo somente próprios', () => {
  assert.throws(
    () => assertExternalDispatchAllowed(order, { ...context, providerConnected: false }),
    /não habilitado/,
  );
  assert.throws(
    () => assertExternalDispatchAllowed(order, { ...context, deliveryMode: 'OWN_ONLY' }),
    /não habilitado/,
  );
});

test('impede despachos duplicados, sobreposição e pedidos inelegíveis', () => {
  assert.throws(
    () => assertExternalDispatchAllowed(order, { ...context, activeOrUncertainBooking: true }),
    /pendente/,
  );
  assert.throws(
    () => assertExternalDispatchAllowed({ ...order, assignedCourierId: 90 }, context),
    /atribuído/,
  );
  assert.throws(
    () => assertExternalDispatchAllowed({ ...order, status: 'ENTREGUE' }, context),
    /prontos/,
  );
  assert.throws(
    () => assertExternalDispatchAllowed({ ...order, type: 'MESA' }, context),
    /delivery/,
  );
  assert.throws(
    () => assertExternalDispatchAllowed({ ...order, paid: false }, context),
    /pagamento/,
  );
  assert.throws(
    () => assertExternalDispatchAllowed({ ...order, refundStatus: 'PROCESSING' }, context),
    /estorno/,
  );
});

test('exige aprovação do preço exato ainda válido e do mesmo pedido', () => {
  const quote = {
    restaurantId: 12,
    orderId: 23,
    quotationRestaurantId: 12,
    quotationOrderId: 23,
    quotedCents: 1299,
    approvedCents: 1299,
    currency: 'BRL',
    expiresAt: new Date('2030-01-01T00:05:00.000Z'),
    approvedByAdmin: true,
    now: new Date('2030-01-01T00:00:00.000Z'),
  };
  assert.doesNotThrow(() => assertExternalQuoteApproved(quote));
  assert.throws(
    () => assertExternalQuoteApproved({ ...quote, quotationRestaurantId: 13 }),
    /não pertence/,
  );
  assert.throws(
    () => assertExternalQuoteApproved({ ...quote, quotationOrderId: 99 }),
    /não pertence/,
  );
  assert.throws(
    () => assertExternalQuoteApproved({ ...quote, approvedCents: 1300 }),
    /alterada/,
  );
  assert.throws(
    () => assertExternalQuoteApproved({ ...quote, approvedByAdmin: false }),
    /aprovar/,
  );
  assert.throws(
    () => assertExternalQuoteApproved({ ...quote, expiresAt: quote.now }),
    /expirada/,
  );
});

test('resultado incerto exige reconciliação antes de tentar novamente', () => {
  assert.equal(requiresExternalReconciliation('UNKNOWN'), true);
  assert.equal(requiresExternalReconciliation('DISPATCHING'), true);
  assert.equal(requiresExternalReconciliation('DONE'), false);
  assert.equal(requiresExternalReconciliation('CANCELED'), false);
});
