import assert from 'node:assert/strict';
import test from 'node:test';
import { promotionalCustomerScope } from './promotionalCustomerScope.js';

test('cupons promocionais vinculam limites ao usuário autenticado e ao restaurante', () => {
  assert.deepEqual(promotionalCustomerScope({
    restaurantId: 3, couponId: 8, userId: 91, tableSessionId: null, participantId: null,
  }), { restaurantId: 3, couponId: 8, userId: 91 });
});
test('convidados de mesa não compartilham contagem pelo userId nulo', () => {
  assert.deepEqual(promotionalCustomerScope({
    restaurantId: 3, couponId: 8, userId: null, tableSessionId: 20, participantId: 5,
  }), { restaurantId: 3, couponId: 8, tableSessionId: 20, participantId: 5 });
});
test('falha fechado quando usuário e participante não estão identificados', () => {
  assert.throws(() => promotionalCustomerScope({
    restaurantId: 3, couponId: 8, userId: null, tableSessionId: null, participantId: null,
  }), /identificação do cliente/);
});
