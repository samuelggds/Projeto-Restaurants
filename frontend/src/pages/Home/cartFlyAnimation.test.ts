import { describe, expect, it } from 'vitest';
import { cartFlyMidpoint } from './cartFlyAnimation';

describe('cartFlyAnimation', () => {
  it('cria uma trajetória em arco entre o produto e o carrinho', () => {
    const origin = { left: 100, top: 500, width: 80, height: 80 };
    const target = { left: 900, top: 80, width: 48, height: 48 };
    const midpoint = cartFlyMidpoint(origin, target);

    expect(midpoint.x).toBeGreaterThan(140);
    expect(midpoint.x).toBeLessThan(924);
    expect(midpoint.y).toBeLessThan(104);
  });
});
