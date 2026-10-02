import assert from 'node:assert/strict';
import test from 'node:test';
import { FuncionarioSubRole, UserRole } from '@prisma/client';
import { deliveryPaymentAccessMiddleware } from './deliveryPaymentAccessMiddleware.js';

function invoke(user: Record<string, unknown> | null) {
  let statusCode = 200;
  let nextCalled = false;
  const req = { user } as any;
  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json() {
      return this;
    },
  } as any;
  deliveryPaymentAccessMiddleware(req, res, () => {
    nextCalled = true;
  });
  return { statusCode, nextCalled };
}

test('permite somente admin e motoqueiro com tenant válido nas rotas financeiras de entrega', () => {
  for (const role of [UserRole.ADMIN, UserRole.MOTOQUEIRO]) {
    const result = invoke({ id: 9, restaurantId: 4, role });
    assert.equal(result.statusCode, 200);
    assert.equal(result.nextCalled, true);
  }
});

test('nega cozinha, garçom, atendente e cliente nas rotas financeiras de entrega', () => {
  const denied = [
    { role: UserRole.FUNCIONARIO, subRole: FuncionarioSubRole.COZINHA },
    { role: UserRole.FUNCIONARIO, subRole: FuncionarioSubRole.GARCOM },
    { role: UserRole.FUNCIONARIO, subRole: FuncionarioSubRole.ATENDENTE },
    { role: UserRole.CLIENTE },
  ];
  for (const user of denied) {
    const result = invoke({ id: 9, restaurantId: 4, ...user });
    assert.equal(result.statusCode, 403);
    assert.equal(result.nextCalled, false);
  }
});
