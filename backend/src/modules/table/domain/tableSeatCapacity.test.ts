import assert from 'node:assert/strict';
import test from 'node:test';
import { parseTableSeatCapacity } from './tableSeatCapacity.js';

test('aceita somente lugares inteiros positivos até 50', () => {
  assert.equal(parseTableSeatCapacity(1), 1);
  assert.equal(parseTableSeatCapacity('4'), 4);
  assert.equal(parseTableSeatCapacity(50), 50);
  for (const invalid of [undefined, null, '', ' ', 0, -1, 51, 2.5, '2.5', '1e2', '4lugares', {}, []]) {
    assert.throws(() => parseTableSeatCapacity(invalid), /lugares/i);
  }
});
