import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertRestaurantIsOpenForOrders,
  RESTAURANT_CLOSED_MESSAGE,
} from './restaurantAvailability.js';

test('permite novos pedidos por padrão', () => {
  assert.doesNotThrow(() => assertRestaurantIsOpenForOrders(undefined));
  assert.doesNotThrow(() => assertRestaurantIsOpenForOrders(true));
});

test('bloqueia novos pedidos quando o restaurante estiver fechado', () => {
  assert.throws(
    () => assertRestaurantIsOpenForOrders(false),
    new RegExp(RESTAURANT_CLOSED_MESSAGE),
  );
});
