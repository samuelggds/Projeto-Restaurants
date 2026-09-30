import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mapProps = vi.hoisted(() => ({
  latest: null as null | {
    points: Array<{ latitude: number; longitude: number }>;
    routePath: Array<{ latitude: number; longitude: number }>;
    destination?: { latitude: number; longitude: number; label?: string };
    courierName?: string;
  },
}));

vi.mock('../tracking/CustomerDeliveryMap', () => ({
  default: (props: typeof mapProps.latest) => {
    mapProps.latest = props;
    return <div data-testid="production-google-map" />;
  },
}));

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
    mapProps.latest = null;
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

  it('usa o mapa Google compartilhado de produção com dados somente fictícios', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<DeliveryTrackingVisualLab />);
      await Promise.resolve();
    });

    const lab = container.querySelector('[data-testid="delivery-tracking-visual-lab"]');
    expect(lab?.getAttribute('data-google-map-source')).toBe('production');
    expect(lab?.getAttribute('data-animation-duration-ms')).toBe('60000');
    expect(container.querySelector('[data-testid="production-google-map"]')).not.toBeNull();
    expect(mapProps.latest?.routePath).toHaveLength(VISUAL_TRACKING_ROUTE.length);
    expect(mapProps.latest?.courierName).toBe('Eduardo Silva');
    expect(container.textContent).toContain('Status da Entrega');
    expect(container.textContent).toContain('Mensagens com Eduardo');
    expect(container.textContent).toContain('Saiu para entrega (Rota)');

    act(() => root.unmount());
  });

  it('move a posição fictícia ao longo do tempo sem chamar backend', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-30T18:00:00Z'));

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<DeliveryTrackingVisualLab />);
      await Promise.resolve();
    });

    const start = mapProps.latest?.points[0];
    expect(start).toMatchObject(VISUAL_TRACKING_ROUTE[0]);

    await act(async () => {
      vi.advanceTimersByTime(30_000);
      await Promise.resolve();
    });

    const halfway = mapProps.latest?.points[0];
    expect(halfway?.latitude).not.toBe(start?.latitude);
    expect(halfway?.longitude).not.toBe(start?.longitude);

    await act(async () => {
      vi.advanceTimersByTime(30_000);
      await Promise.resolve();
    });

    expect(mapProps.latest?.points[0]).toMatchObject(
      VISUAL_TRACKING_ROUTE[VISUAL_TRACKING_ROUTE.length - 1],
    );

    act(() => root.unmount());
  });
});
