import assert from 'node:assert/strict';
import test from 'node:test';
import { nfcRegistrationAccessMiddleware } from './nfcRegistrationAccessMiddleware.js';
function invoke(user: unknown) {
  let status = 200;
  let next = false;
  const res = { status(code: number) { status = code; return this; }, json() { return this; } };
  nfcRegistrationAccessMiddleware({ user } as never, res as never, (() => { next = true; }) as never);
  return { status, next };
}
test('admin, garçom e atendente do tenant possuem acesso', () => {
  assert.equal(invoke({ restaurantId: 3, role: 'ADMIN' }).next, true);
  assert.equal(invoke({ restaurantId: 3, role: 'FUNCIONARIO', subRole: 'GARCOM' }).next, true);
  assert.equal(invoke({ restaurantId: 3, role: 'FUNCIONARIO', subRole: 'ATENDENTE' }).next, true);
});
test('nega acesso para outros perfis e identidades sem tenant', () => {
  for (const user of [null, { role: 'ADMIN' }, { role: 'CLIENTE', restaurantId: 3 }, { role: 'SUPER_ADMIN', restaurantId: 3 }, { role: 'MOTOQUEIRO', restaurantId: 3 }, { role: 'FUNCIONARIO', subRole: 'COZINHA', restaurantId: 3 }]) {
    assert.equal(invoke(user).next, false);
  }
});
