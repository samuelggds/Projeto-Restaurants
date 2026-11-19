import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateLoadRps } from './loadTestThroughput.js';

test('mede tentativas e operacoes bem-sucedidas separadamente', () => {
  // Exemplo: 450 requests enviados, todos rejeitados (HTTP 429).
  assert.equal(calculateLoadRps(450, 90_000), 5);
  assert.equal(calculateLoadRps(0, 90_000), 0);

  // Exemplo: 600 pedidos e 1200 leituras em 60 segundos.
  assert.equal(calculateLoadRps(600, 60_000), 10);
  assert.equal(calculateLoadRps(1200, 60_000), 20);
});

test('arredonda a tres casas decimais e rejeita amostras invalidas', () => {
  assert.equal(calculateLoadRps(1, 1500), 0.667);
  assert.throws(() => calculateLoadRps(-1, 1000), RangeError);
  assert.throws(() => calculateLoadRps(1.2, 1000), RangeError);
  assert.throws(() => calculateLoadRps(1, 0), RangeError);
  assert.throws(() => calculateLoadRps(1, Number.POSITIVE_INFINITY), RangeError);
});
