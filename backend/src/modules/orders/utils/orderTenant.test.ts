import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveOrderRestaurantId } from './orderTenant.js';

test('usa o restaurante definido pela autenticação ou sessão', () => {
  assert.equal(resolveOrderRestaurantId({ requestedRestaurantId: 7, contextRestaurantId: 7 }), 7);
  assert.equal(resolveOrderRestaurantId({ contextRestaurantId: '9' }), 9);
});

test('aceita o restaurante solicitado apenas quando não há tenant no contexto', () => {
  assert.equal(resolveOrderRestaurantId({ requestedRestaurantId: '12' }), 12);
});

test('rejeita tentativa de enviar pedido para outro restaurante', () => {
  assert.throws(
    () =>
      resolveOrderRestaurantId({
        requestedRestaurantId: 99,
        contextRestaurantId: 7,
      }),
    /não corresponde à sessão atual/,
  );
});

test('rejeita tenant ausente ou inválido', () => {
  assert.throws(() => resolveOrderRestaurantId({}), /Restaurante não informado/);
  assert.throws(
    () => resolveOrderRestaurantId({ requestedRestaurantId: -1 }),
    /Restaurante não informado/,
  );
});
