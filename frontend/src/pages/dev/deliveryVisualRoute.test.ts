import { describe, expect, it } from 'vitest';
import {
  VISUAL_MAP_HEIGHT,
  VISUAL_MAP_WIDTH,
  VISUAL_TRACKING_ANIMATION_MS,
  VISUAL_TRACKING_ROUTE,
  getCourierDirectionIndex,
  getCourierSpriteFrame,
  getVisualRouteFrame,
} from './deliveryVisualRoute';

describe('deliveryVisualRoute', () => {
  it('percorre a rota inteira em um minuto dentro das coordenadas da imagem fornecida', () => {
    expect(VISUAL_TRACKING_ANIMATION_MS).toBe(60_000);
    expect([VISUAL_MAP_WIDTH, VISUAL_MAP_HEIGHT]).toEqual([1151, 636]);
    expect(getVisualRouteFrame(VISUAL_TRACKING_ROUTE, 0).point).toEqual(VISUAL_TRACKING_ROUTE[0]);
    expect(getVisualRouteFrame(VISUAL_TRACKING_ROUTE, 1).point).toEqual(
      VISUAL_TRACKING_ROUTE[VISUAL_TRACKING_ROUTE.length - 1],
    );

    for (const point of VISUAL_TRACKING_ROUTE) {
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(VISUAL_MAP_WIDTH);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(VISUAL_MAP_HEIGHT);
    }
  });

  it('mantém velocidade proporcional à distância e muda a direção na esquina', () => {
    const route = [
      { x: 0, y: 0 },
      { x: 30, y: 0 },
      { x: 30, y: 40 },
    ];

    expect(getVisualRouteFrame(route, 0.25)).toMatchObject({
      point: { x: 17.5, y: 0 },
      angleDegrees: 0,
      segmentIndex: 0,
    });
    expect(getVisualRouteFrame(route, 0.5)).toMatchObject({
      point: { x: 30, y: 5 },
      angleDegrees: 90,
      segmentIndex: 1,
    });
    expect(getVisualRouteFrame(route, -1).point).toEqual(route[0]);
    expect(getVisualRouteFrame(route, 2).point).toEqual(route[2]);
  });

  it('tolera trechos parados e rotas sem deslocamento', () => {
    const start = { x: 12, y: 30 };
    const end = { x: 12, y: 90 };
    expect(getVisualRouteFrame([start, start, end], 0.5)).toMatchObject({
      point: { x: 12, y: 60 },
      angleDegrees: 90,
    });
    expect(getVisualRouteFrame([start, start], 0.5).point).toEqual(start);
    expect(getVisualRouteFrame([start], 1).point).toEqual(start);
    expect(getVisualRouteFrame([], 0).point).toEqual({ x: 0, y: 0 });
  });

  it.each([
    [-90, 0],
    [-45, 1],
    [0, 2],
    [45, 3],
    [90, 4],
    [135, 5],
    [180, 6],
    [-135, 7],
  ])('seleciona a vista %i° sem girar o personagem de cabeça para baixo', (angle, direction) => {
    expect(getCourierDirectionIndex(angle)).toBe(direction);
    expect(getCourierDirectionIndex(angle + 360)).toBe(direction);
  });

  it('usa frente, costas e perfis do desenho fornecido para acompanhar a direção', () => {
    expect(getCourierSpriteFrame(getCourierDirectionIndex(-90))).toEqual({
      column: 1,
      row: 1,
      mirror: false,
    });
    expect(getCourierSpriteFrame(getCourierDirectionIndex(90))).toEqual({
      column: 0,
      row: 0,
      mirror: false,
    });
    expect(getCourierSpriteFrame(getCourierDirectionIndex(180))).toEqual({
      column: 2,
      row: 0,
      mirror: false,
    });
    expect(getCourierSpriteFrame(getCourierDirectionIndex(0))).toEqual({
      column: 2,
      row: 0,
      mirror: true,
    });
  });
});
