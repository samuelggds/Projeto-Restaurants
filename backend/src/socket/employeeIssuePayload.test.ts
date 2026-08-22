import assert from 'node:assert/strict';
import test from 'node:test';
import { validateEmployeeIssuePayload } from './employeeIssuePayload.js';

test('formats a named employee issue for the administrator', () => {
  const result = validateEmployeeIssuePayload({
    type: 'employee-issue',
    reporterName: '  Ana  Souza ',
    reporterRole: 'waiter',
    subject: 'Pedido travado',
    description: 'O status não atualiza na fila.',
  });

  assert.deepEqual(result, {
    isEmployeeIssue: true,
    ok: true,
    reporterName: 'Ana Souza',
    message:
      'Relato de problema\nRemetente: Ana Souza (Garçom)\nAssunto: Pedido travado\nDescrição: O status não atualiza na fila.',
  });
});

test('requires the employee name for an issue', () => {
  assert.deepEqual(
    validateEmployeeIssuePayload({ type: 'employee-issue', reporterRole: 'waiter' }),
    {
      isEmployeeIssue: true,
      ok: false,
      error: 'Informe seu nome para enviar o relato.',
    },
  );
});

test('rejects an employee issue with an unknown reporter role', () => {
  assert.deepEqual(
    validateEmployeeIssuePayload({
      type: 'employee-issue',
      reporterName: 'Alex',
      reporterRole: 'manager',
      subject: 'Fila parada',
      description: 'O pedido não mudou de status.',
    }),
    {
      isEmployeeIssue: true,
      ok: false,
      error: 'Função do funcionário inválida.',
    },
  );
});
