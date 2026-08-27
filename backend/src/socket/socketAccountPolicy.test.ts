import assert from 'node:assert/strict';
import test from 'node:test';
import { isSocketAccountAuthorized } from './socketAccountPolicy.js';

const claims = {
  id: 12,
  role: 'FUNCIONARIO',
  subRole: 'COZINHA',
  restaurantId: 4,
  authVersion: 3,
};
const account = {
  id: 12,
  active: true,
  role: 'FUNCIONARIO',
  subRole: 'COZINHA',
  restaurantId: 4,
  authVersion: 3,
};

test('mantém socket somente quando conta e claims continuam iguais', () => {
  assert.equal(isSocketAccountAuthorized(account, claims), true);
});

test('desautoriza socket ao desativar, revogar ou alterar permissão/tenant', () => {
  assert.equal(isSocketAccountAuthorized({ ...account, active: false }, claims), false);
  assert.equal(isSocketAccountAuthorized({ ...account, authVersion: 4 }, claims), false);
  assert.equal(isSocketAccountAuthorized({ ...account, role: 'MOTOQUEIRO' }, claims), false);
  assert.equal(isSocketAccountAuthorized({ ...account, subRole: 'GARCOM' }, claims), false);
  assert.equal(isSocketAccountAuthorized({ ...account, restaurantId: 5 }, claims), false);
});

test('tokens legados locais ainda verificam conta, role e tenant', () => {
  assert.equal(isSocketAccountAuthorized(account, { ...claims, authVersion: null }), true);
  assert.equal(
    isSocketAccountAuthorized({ ...account, restaurantId: 5 }, { ...claims, authVersion: null }),
    false,
  );
});
