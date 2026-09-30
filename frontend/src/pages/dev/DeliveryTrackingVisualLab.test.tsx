import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DeliveryTrackingVisualLab, {
  VISUAL_TRACKING_ANIMATION_MS,
  VISUAL_TRACKING_ROUTE,
  interpolateVisualRoute,
} from './DeliveryTrackingVisualLab';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe('DeliveryTrackingVisualLab', () => {
  afterEach(() => {
    vi.useRealTimers();
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

  it('renderiza mapa fictício local sem depender de Google Maps ou backend', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<DeliveryTrackingVisualLab />);
      await Promise.resolve();
    });

    const lab = container.querySelector('[data-testid="delivery-tracking-visual-lab"]');
    expect(lab?.getAttribute('data-map-source')).toBe('fictitious-google-style');
    expect(lab?.getAttribute('data-animation-duration-ms')).toBe('60000');
    expect(container.querySelector('[data-testid="visual-fictitious-map"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="visual-courier-marker"]')).not.toBeNull();
    expect(container.textContent).toContain('Acompanhar pedido');
    expect(container.textContent).toContain('Início');
    expect(container.textContent).toContain('Eduardo Silva');
    expect(container.textContent).toContain('(00) 00000-0000');
    expect(container.textContent).toContain('Status da Entrega');
    expect(container.textContent).toContain('Mensagens com Eduardo');
    expect(container.textContent).not.toContain('Olá, Entrar');
    expect(container.textContent).not.toContain('Meu Carrinho');

    act(() => root.unmount());
  });

  it('move o marcador fictício durante os 60 segundos', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-30T18:00:00Z'));

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<DeliveryTrackingVisualLab />);
      await Promise.resolve();
    });

    const map = container.querySelector('[data-testid="visual-fictitious-map"]');
    expect(map?.getAttribute('data-courier-progress')).toBe('0.0000');

    await act(async () => {
      vi.advanceTimersByTime(30_000);
      await Promise.resolve();
    });

    const halfway = Number(
      container
        .querySelector('[data-testid="visual-fictitious-map"]')
        ?.getAttribute('data-courier-progress'),
    );
    expect(halfway).toBeGreaterThan(0.45);
    expect(halfway).toBeLessThan(0.55);

    await act(async () => {
      vi.advanceTimersByTime(30_000);
      await Promise.resolve();
    });

    expect(
      container
        .querySelector('[data-testid="visual-fictitious-map"]')
        ?.getAttribute('data-courier-progress'),
    ).toBe('1.0000');

    act(() => root.unmount());
  });
});
