import test from 'node:test';
import assert from 'node:assert/strict';
import { recurringBillingError } from './recurringBillingError.js';

test('não expõe detalhes do banco ou do provedor nas respostas de cobrança recorrente', () => {
  for (const message of [
    'Invalid prisma.$queryRaw() invocation: relation PlatformBillingProfile does not exist',
    'Chave pública do Mercado Pago não configurada para a mensalidade.',
    'FRONTEND_URL HTTPS é obrigatória para ativar cobrança recorrente.',
    'provider secret=example; query: SELECT * FROM Users',
  ]) {
    assert.equal(recurringBillingError(new Error(message), 'Tente novamente.'), 'Tente novamente.');
  }
  assert.equal(recurringBillingError({}, 'Tente novamente.'), 'Tente novamente.');
});
test('preserva mensagens de validação conhecidas sem expor exceções arbitrárias', () => {
  assert.equal(
    recurringBillingError(new Error('Validade do cartão inválida.'), 'Falha'),
    'Validade do cartão inválida.',
  );
  assert.equal(
    recurringBillingError(
      new Error('Assinatura cancelada não pode ativar renovação automática.'),
      'Falha',
    ),
    'Assinatura cancelada não pode ativar renovação automática.',
  );
});
