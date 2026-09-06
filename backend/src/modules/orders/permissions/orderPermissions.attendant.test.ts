import assert from 'node:assert/strict';
import test from 'node:test';
import { FuncionarioSubRole, OrderStatus, UserRole } from '@prisma/client';
import { OrderPermissions } from './orderPermissions.js';

test('atendente só recebe permissão de transição para ENTREGUE', () => {
  assert.equal(
    OrderPermissions.canUserChangeStatus(
      UserRole.FUNCIONARIO,
      OrderStatus.ENTREGUE,
      FuncionarioSubRole.ATENDENTE,
    ),
    true,
  );

  for (const status of [
    OrderStatus.PREPARANDO,
    OrderStatus.PRONTO,
    OrderStatus.SAIU_PARA_ENTREGA,
    OrderStatus.CANCELADO,
  ]) {
    assert.equal(
      OrderPermissions.canUserChangeStatus(UserRole.FUNCIONARIO, status, FuncionarioSubRole.ATENDENTE),
      false,
    );
  }
});
