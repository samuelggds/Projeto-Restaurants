import { describe, expect, it } from 'vitest';
import { resolveCarouselSwipe } from './promotionCarouselGesture';

describe('resolveCarouselSwipe', () => {
  it('avança quando o dedo desliza horizontalmente para a esquerda', () => {
    expect(resolveCarouselSwipe({ x: 240, y: 90 }, { x: 150, y: 96 })).toBe('NEXT');
  });

  it('volta quando o dedo desliza horizontalmente para a direita', () => {
    expect(resolveCarouselSwipe({ x: 120, y: 90 }, { x: 205, y: 84 })).toBe('PREVIOUS');
  });

  it('ignora toques curtos e movimentos predominantemente verticais', () => {
    expect(resolveCarouselSwipe({ x: 100, y: 100 }, { x: 126, y: 102 })).toBeNull();
    expect(resolveCarouselSwipe({ x: 100, y: 100 }, { x: 150, y: 180 })).toBeNull();
  });
});
