import assert from 'node:assert/strict';
import test from 'node:test';
import { createJobOwnerId } from './runtime.js';

test('owner do lease identifica runtime e é único por processo/instância', () => {
  const first = createJobOwnerId('worker');
  const second = createJobOwnerId('worker');
  assert.match(first, /^worker:/u);
  assert.notEqual(first, second);
  assert.ok(first.length <= 191);
});
