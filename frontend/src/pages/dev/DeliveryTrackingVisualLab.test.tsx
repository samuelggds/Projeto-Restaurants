import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DeliveryTrackingVisualLab, {
  VISUAL_TRACKING_ANIMATION_MS,
  VISUAL_TRACKING_ROUTE,
  getCourierDirectionIndex,
  getVisualCameraRotation,
  getVisualRouteFrame,
  interpolateVisualRoute,
} from './DeliveryTrackingVisualLab';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe('DeliveryTrackingVisualLab', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('mantém a simulação em um minuto e interpola do início ao destino', () => {
    expect(VISUAL_TRACKING_ANIMATION_MS).toBe(60_000);
    expect(interpolateVisualRoute(VISUAL_TRACKING_ROUTE, 0)).toMatchObject(
      VISUAL_TRACKING_ROUTE[0],
    );
    expect(interpolateVisualRoute(VISUAL_TRACKING_ROUTE, 1)).toMatchObject(
      VISUAL_TRACKING_ROUTE[VISUAL_TRACKING_ROUTE.length - 1],
    );

    const middle = interpolateVisualRoute(VISUAL_TRACKING_ROUTE, 0.5);
    expect(Number.isFinite(middle.latitude)).toBe(true);
    expect(Number.isFinite(middle.longitude)).toBe(true);
    expect(middle).not.toMatchObject(VISUAL_TRACKING_ROUTE[0]);
  });

  it('calcula posição e direção do motoqueiro a partir do trecho real da rota fictícia', () => {
    const beginning = getVisualRouteFrame(VISUAL_TRACKING_ROUTE, 0.08);
    const middle = getVisualRouteFrame(VISUAL_TRACKING_ROUTE, 0.5);
    const ending = getVisualRouteFrame(VISUAL_TRACKING_ROUTE, 0.92);

    expect(Number.isFinite(beginning.angleDegrees)).toBe(true);
    expect(Number.isFinite(middle.angleDegrees)).toBe(true);
    expect(Number.isFinite(ending.angleDegrees)).toBe(true);
    expect(
      new Set([beginning.segmentIndex, middle.segmentIndex, ending.segmentIndex]).size,
    ).toBeGreaterThan(1);
  });

  it('calcula direção do sprite e rotação da câmera a partir do heading', () => {
    const rightTurn = getVisualRouteFrame(VISUAL_TRACKING_ROUTE, 0.45);
    const cameraRotation = getVisualCameraRotation(rightTurn.angleDegrees);
    const spriteIndex = getCourierDirectionIndex(rightTurn.angleDegrees, cameraRotation);

    expect(Number.isFinite(cameraRotation)).toBe(true);
    expect(spriteIndex).toBeGreaterThanOrEqual(0);
    expect(spriteIndex).toBeLessThan(8);
  });

  it('renderiza mapa local, motoqueiro direcional e dados fictícios sem Google Maps/backend', async () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<DeliveryTrackingVisualLab />);
      await Promise.resolve();
    });

    const lab = container.querySelector('[data-testid="delivery-tracking-visual-lab"]');
    const map = container.querySelector('[data-testid="visual-fictitious-map"]');
    const marker = container.querySelector('[data-testid="visual-courier-marker"]');
    const restaurant = container.querySelector(
      '[data-testid="visual-origin-restaurant-marker"]',
    );
    const house = container.querySelector(
      '[data-testid="visual-destination-house-marker"]',
    );

    expect(lab?.getAttribute('data-map-source')).toBe('fictitious-google-style');
    expect(lab?.getAttribute('data-animation-duration-ms')).toBe('60000');
    expect(map).not.toBeNull();
    expect(marker).not.toBeNull();
    expect(restaurant).not.toBeNull();
    expect(house).not.toBeNull();
    expect(container.textContent).toContain('Restaurante');
    expect(container.textContent).toContain('Sua casa');
    expect(container.querySelector('polyline[stroke="#3824d6"]')).toBeNull();
    expect(
      marker?.querySelector('[data-testid="visual-courier-sprite"]'),
    ).not.toBeNull();
    expect(marker?.getAttribute('data-route-angle')).not.toBeNull();
    expect(marker?.getAttribute('data-sprite-direction')).toBeTruthy();
    expect(marker?.getAttribute('data-camera-anchor')).toBe('50,62');
    expect(
      container
        .querySelector('[data-testid="visual-fictitious-map"]')
        ?.getAttribute('data-camera-rotation'),
    ).toBeTruthy();
    expect(container.textContent).toContain('Acompanhar pedido');
    expect(container.textContent).toContain('Início');
    expect(container.textContent).toContain('Eduardo Silva');
    expect(container.textContent).toContain('(00) 00000-0000');
    expect(container.textContent).not.toContain('Olá, Entrar');
    expect(container.textContent).not.toContain('Meu Carrinho');

    act(() => root.unmount());
  });
});
