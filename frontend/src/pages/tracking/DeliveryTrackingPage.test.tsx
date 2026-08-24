import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RoutePoint } from '../Courier/components/DeliveryMap';

const mocks = vi.hoisted(() => ({
  id: '601',
  navigate: vi.fn(),
  getTracking: vi.fn(),
  listeners: new Map<string, (...args: unknown[]) => void>(),
  mapProps: null as null | {
    points: RoutePoint[];
    routePath?: RoutePoint[];
    destination?: RoutePoint & { label?: string };
    statusMessage?: string;
  },
  socket: {
    connected: true,
    on: vi.fn(),
    off: vi.fn(),
  },
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: mocks.id }),
  useNavigate: () => mocks.navigate,
}));
vi.mock('../../Services/ordersService', () => ({
  default: { getDeliveryTracking: mocks.getTracking },
}));
vi.mock('../../Services/socketService', () => ({
  connectSocket: () => mocks.socket,
  disconnectSocket: vi.fn(),
}));
vi.mock('../Courier/components/DeliveryMap', () => ({
  default: (props: typeof mocks.mapProps) => {
    mocks.mapProps = props;
    return (
      <div
        data-testid="delivery-map"
        data-destination={props?.destination?.label || ''}
        data-route-points={props?.routePath?.length || 0}
      />
    );
  },
}));

import DeliveryTrackingPage from './DeliveryTrackingPage';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function trackingResult() {
  return {
    order: {
      id: 601,
      restaurantId: 7,
      status: 'SAIU_PARA_ENTREGA',
      deliveryStartedAt: '2026-08-24T14:00:00Z',
      estimatedArrival: '2026-08-24T14:20:00Z',
      assignedCourier: { name: 'Rita', phone: '85999990000' },
      routeEstimate: {
        durationSeconds: 900,
        distanceMeters: 3500,
        provider: 'OSRM',
        destination: {
          latitude: -3.75,
          longitude: -38.55,
          label: 'Rua das Flores, 10, Fortaleza',
        },
        routeCoordinates: [
          { latitude: -3.73, longitude: -38.53 },
          { latitude: -3.75, longitude: -38.55 },
        ],
      },
    },
    locations: [{ latitude: -3.73, longitude: -38.53, recordedAt: 'a' }],
  };
}

async function flushUntil(condition: () => boolean) {
  for (let attempt = 0; attempt < 30 && !condition(); attempt += 1) {
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 1));
    });
  }
}

describe('DeliveryTrackingPage integration', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('token', 'customer-token');
    mocks.id = '601';
    mocks.mapProps = null;
    mocks.listeners.clear();
    mocks.socket.on.mockImplementation((event: string, listener: (...args: unknown[]) => void) => {
      mocks.listeners.set(event, listener);
      return mocks.socket;
    });
    mocks.socket.off.mockReturnValue(mocks.socket);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('mostra destino/rota e aceita realtime somente do pedido e restaurante corretos', async () => {
    mocks.getTracking.mockResolvedValue(trackingResult());
    await act(async () => root.render(<DeliveryTrackingPage />));
    await flushUntil(() => mocks.mapProps !== null);

    expect(container.textContent).toContain('Atualização em tempo real');
    expect(container.textContent).toContain('Rua das Flores, 10, Fortaleza');
    expect(container.textContent).toContain('3,5 km');
    expect(mocks.mapProps?.routePath).toHaveLength(2);
    expect(mocks.mapProps?.destination?.label).toContain('Rua das Flores');
    expect(mocks.mapProps?.points).toHaveLength(1);

    await act(async () =>
      mocks.listeners.get('order:delivery-location')?.({
        orderId: 602,
        restaurantId: 7,
        latitude: -3.8,
        longitude: -38.6,
      }),
    );
    await act(async () =>
      mocks.listeners.get('order:delivery-location')?.({
        orderId: 601,
        restaurantId: 8,
        latitude: -3.8,
        longitude: -38.6,
      }),
    );
    expect(mocks.mapProps?.points).toHaveLength(1);

    await act(async () =>
      mocks.listeners.get('order:delivery-location')?.({
        orderId: 601,
        restaurantId: 7,
        latitude: -3.74,
        longitude: -38.54,
        recordedAt: 'b',
      }),
    );
    expect(mocks.mapProps?.points).toHaveLength(2);

    await act(async () =>
      mocks.listeners.get('order:status-changed')?.({
        id: 601,
        restaurantId: 7,
        status: 'ENTREGUE',
      }),
    );
    await flushUntil(() => container.textContent?.includes('Entrega concluída') === true);
    expect(mocks.mapProps?.routePath).toHaveLength(0);
    const finalPointCount = mocks.mapProps?.points.length;
    await act(async () =>
      mocks.listeners.get('order:delivery-location')?.({
        orderId: 601,
        restaurantId: 7,
        latitude: -3.76,
        longitude: -38.56,
        recordedAt: 'c',
      }),
    );
    expect(mocks.mapProps?.points).toHaveLength(finalPointCount);
    expect(container.textContent).toContain('Acompanhamento concluído');
  });

  it('encerra o acompanhamento ao cancelar e ignora posições posteriores', async () => {
    mocks.getTracking.mockResolvedValue(trackingResult());
    await act(async () => root.render(<DeliveryTrackingPage />));
    await flushUntil(() => mocks.mapProps !== null);

    await act(async () =>
      mocks.listeners.get('order:status-changed')?.({
        id: 601,
        restaurantId: 7,
        status: 'CANCELADO',
      }),
    );
    await flushUntil(() => container.textContent?.includes('Entrega cancelada') === true);
    expect(mocks.mapProps?.routePath).toHaveLength(0);
    const finalPointCount = mocks.mapProps?.points.length;

    await act(async () =>
      mocks.listeners.get('order:delivery-location')?.({
        orderId: 601,
        restaurantId: 7,
        latitude: -3.76,
        longitude: -38.56,
      }),
    );
    expect(mocks.mapProps?.points).toHaveLength(finalPointCount);
    expect(container.textContent).toContain('Acompanhamento encerrado');
  });

  it('reinicia todo o estado ao navegar para outro pedido', async () => {
    mocks.getTracking.mockResolvedValueOnce(trackingResult()).mockResolvedValueOnce({
      ...trackingResult(),
      order: {
        ...trackingResult().order,
        id: 602,
        restaurantId: 7,
        routeEstimate: {
          ...trackingResult().order.routeEstimate,
          destination: {
            latitude: -3.81,
            longitude: -38.61,
            label: 'Novo destino',
          },
          routeCoordinates: [{ latitude: -3.81, longitude: -38.61 }],
        },
      },
      locations: [{ latitude: -3.8, longitude: -38.6, recordedAt: 'new-order' }],
    });

    await act(async () => root.render(<DeliveryTrackingPage />));
    await flushUntil(() => mocks.mapProps?.destination?.label?.includes('Rua das Flores') === true);
    mocks.id = '602';
    await act(async () => root.render(<DeliveryTrackingPage />));
    await flushUntil(() => mocks.mapProps?.destination?.label === 'Novo destino');

    expect(container.textContent).toContain('Pedido #602');
    expect(container.textContent).not.toContain('Rua das Flores, 10, Fortaleza');
    expect(mocks.mapProps?.points).toEqual([
      expect.objectContaining({ latitude: -3.8, longitude: -38.6 }),
    ]);
    expect(mocks.mapProps?.routePath).toHaveLength(1);
  });

  it('exibe falha amigável e recupera pelo botão de retry', async () => {
    mocks.getTracking
      .mockRejectedValueOnce({ response: { data: { error: 'Rastreamento indisponível.' } } })
      .mockResolvedValueOnce(trackingResult());
    await act(async () => root.render(<DeliveryTrackingPage />));
    await flushUntil(() => container.textContent?.includes('Rastreamento indisponível.') === true);
    const retry = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Tentar novamente'),
    );
    await act(async () => retry?.click());
    await flushUntil(() => mocks.mapProps !== null);
    expect(container.textContent).toContain('Saiu para entrega');
  });
});
