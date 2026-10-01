import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cartFlyMidpoint,
  scheduleProductToCartAnimation,
} from './cartFlyAnimation';

describe('cartFlyAnimation', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    delete (Element.prototype as { animate?: unknown }).animate;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('cria uma trajetória em arco entre o produto e o carrinho', () => {
    const origin = { left: 100, top: 500, width: 80, height: 80 };
    const target = { left: 900, top: 80, width: 48, height: 48 };
    const midpoint = cartFlyMidpoint(origin, target);

    expect(midpoint.x).toBeGreaterThan(140);
    expect(midpoint.x).toBeLessThan(924);
    expect(midpoint.y).toBeLessThan(104);
  });

  it('aguarda o alvo do carrinho reaparecer depois que um configurador fecha', () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));

    const animate = vi.fn(() => ({
      finished: Promise.resolve(),
    }));
    Object.defineProperty(Element.prototype, 'animate', {
      configurable: true,
      value: animate,
    });

    expect(
      scheduleProductToCartAnimation({
        origin: { left: 40, top: 300, width: 80, height: 80 },
        imageUrl: '/produto.png',
      }),
    ).toBe(true);

    expect(frames).toHaveLength(1);
    frames.shift()?.(0);
    expect(frames).toHaveLength(1);
    expect(document.querySelector('[data-cart-fly-preview]')).toBeNull();

    const target = document.createElement('button');
    target.setAttribute('data-cart-fly-target', 'true');
    target.getBoundingClientRect = () =>
      ({
        left: 900,
        top: 40,
        width: 48,
        height: 48,
        right: 948,
        bottom: 88,
        x: 900,
        y: 40,
        toJSON: () => ({}),
      }) as DOMRect;
    document.body.appendChild(target);

    frames.shift()?.(16);

    expect(document.querySelector('[data-cart-fly-preview]')).not.toBeNull();
    expect(animate).toHaveBeenCalled();
  });
});
