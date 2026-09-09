import assert from 'node:assert/strict';
import test from 'node:test';
import repository from './UserRepository.js';

test('telefone ambíguo nunca seleciona arbitrariamente uma conta', async () => {
  const queries: unknown[][] = [];
  const db = {
    $queryRaw: async (...args: unknown[]) => {
      queries.push(args);
      return [{ id: 1 }, { id: 2 }];
    },
  };
  assert.equal(await repository.findByPhone('+55 (11) 99999-1234', db as never), null);
  assert.deepEqual(queries[0].slice(1), ['11999991234', '5511999991234']);
  assert.match(String(queries[0][0]), /LIMIT 2/);
});

test('telefone único aceita formato nacional e com DDI; inválido não consulta banco', async () => {
  const queries: unknown[][] = [];
  const db = {
    $queryRaw: async (...args: unknown[]) => {
      queries.push(args);
      return [{ id: 7 }];
    },
  };
  assert.equal((await repository.findByPhone('(11) 99999-1234', db as never))?.id, 7);
  assert.equal(await repository.findByPhone('abc', db as never), null);
  assert.equal(queries.length, 1);
  assert.deepEqual(queries[0].slice(1), ['11999991234', '5511999991234']);
});
