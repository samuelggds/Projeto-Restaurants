import assert from 'node:assert/strict';
import test from 'node:test';
import { cartFlyMidpoint } from './cartFlyAnimation';

test('trajetória do produto cria um arco acima da origem e do carrinho', () => {
  const origin = { left: 100, top: 500, width: 80, height: 80 };
  const target = { left: 900, top: 80, width: 48, height: 48 };
  const midpoint = cartFlyMidpoint(origin, target);

  assert.ok(midpoint.x > 140 && midpoint.x < 924);
  assert.ok(midpoint.y < 104);
});
