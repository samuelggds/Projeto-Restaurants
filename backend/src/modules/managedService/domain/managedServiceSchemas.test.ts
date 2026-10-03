import assert from 'node:assert/strict';
import test from 'node:test';
import {
  implementationUpdateSchema,
  managedRequestCreateSchema,
  managedRequestUpdateSchema,
} from './managedServiceSchemas.js';

test('solicitação do ADMIN não aceita restaurantId no corpo', () => {
  assert.throws(
    () =>
      managedRequestCreateSchema.parse({
        restaurantId: 999,
        category: 'PRODUTO',
        title: 'Cadastrar pizza nova',
        description: 'Cadastrar a pizza conforme os dados enviados pelo restaurante.',
      }),
    /unrecognized|Unrecognized|não reconhecida|não reconhecido/iu,
  );
});

test('valida categorias e estados operacionais permitidos', () => {
  const request = managedRequestCreateSchema.parse({
    category: 'PRECO',
    title: 'Atualizar preços',
    description: 'Alterar os valores dos produtos listados na solicitação.',
  });
  assert.equal(request.category, 'PRECO');
  assert.equal(implementationUpdateSchema.parse({ status: 'EM_REVISAO' }).status, 'EM_REVISAO');
  assert.equal(managedRequestUpdateSchema.parse({ status: 'CONCLUIDA' }).status, 'CONCLUIDA');
  assert.throws(
    () => managedRequestUpdateSchema.parse({ status: 'APROVADA_SEM_REVISAO' }),
  );
});
