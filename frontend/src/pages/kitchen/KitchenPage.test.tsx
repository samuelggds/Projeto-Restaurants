import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { KitchenModuleProps } from './KitchenModule';

const mocks = vi.hoisted(() => ({
  latestProps: null as KitchenModuleProps | null,
  listOrders: vi.fn(),
  updateStatus: vi.fn(),
  getSettings: vi.fn(),
  navigate: vi.fn(),
  logout: vi.fn(),
  socketListeners: new Map<string, (...args: unknown[]) => void>(),
  socket: {
    connected: false,
    on: vi.fn(),
    off: vi.fn(),
  },
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
}));
vi.mock('../../contexts/authContext', () => ({
  useAuth: () => ({
    user: {
      id: 4,
      name: 'Ana Cozinha',
      email: 'ana@restaurant.test',
      restaurantId: 7,
    },
    logout: mocks.logout,
  }),
}));
vi.mock('../../Services/ordersService', () => ({
  default: {
    listRestaurantOrders: mocks.listOrders,
    updateStatus: mocks.updateStatus,
  },
}));
vi.mock('../../Services/restaurantSettingsService', () => ({
  default: { getPublicSettings: mocks.getSettings },
}));
vi.mock('../../Services/socketService', () => ({
  connectSocket: () => mocks.socket,
  disconnectSocket: vi.fn(),
}));
vi.mock('../../modules/auth/session/authSession', () => ({
  getAccessToken: () => 'kitchen-token',
}));
vi.mock('./KitchenModule', () => ({
  KitchenModule: (props: KitchenModuleProps) => {
    mocks.latestProps = props;
    return <div data-testid="kitchen-module" />;
  },
}));

import KitchenPage from './KitchenPage';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function flushUntil(condition: () => boolean) {
  for (let attempt = 0; attempt < 20 && !condition(); attempt += 1) {
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 1));
    });
  }
}

function rawOrder(id: number, status = 'PENDENTE') {
  return {
    id,
    type: 'MESA',
    status,
    table: { id: 91, number: id },
    createdAt: '2026-08-24T18:00:00.000Z',
    total: 40,
    items: [{ quantity: 1, product: { name: `Produto ${id}` } }],
  };
}

describe('KitchenPage data integration', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.latestProps = null;
    mocks.socketListeners.clear();
    mocks.socket.connected = false;
    mocks.socket.on.mockImplementation((event: string, listener: (...args: unknown[]) => void) => {
      mocks.socketListeners.set(event, listener);
      return mocks.socket;
    });
    mocks.socket.off.mockImplementation(() => mocks.socket);
    mocks.getSettings.mockResolvedValue({
      restaurant: { name: 'Restaurante Teste' },
      primaryColor: '#d64d08',
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('mantém a resposta da requisição mais nova quando polling e socket concorrem', async () => {
    const first = deferred<unknown[]>();
    const second = deferred<unknown[]>();
    mocks.listOrders.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    await act(async () => {
      root.render(<KitchenPage />);
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });
    expect(mocks.latestProps?.workspaceState?.loading).toBe(true);

    await act(async () => {
      mocks.socketListeners.get('new-order')?.();
      await Promise.resolve();
    });
    await act(async () => second.resolve([rawOrder(2)]));
    expect(mocks.latestProps?.data?.orders[0]).toMatchObject({ id: '#2', reference: 'Mesa 2' });

    await act(async () => first.resolve([rawOrder(1)]));
    expect(mocks.latestProps?.data?.orders[0]).toMatchObject({ id: '#2', reference: 'Mesa 2' });
  });

  it('preserva localmente o novo status quando o reload posterior falha', async () => {
    mocks.listOrders
      .mockResolvedValueOnce([rawOrder(5)])
      .mockRejectedValueOnce(new Error('offline'));
    mocks.updateStatus.mockResolvedValue({ id: 5, status: 'PREPARANDO' });

    await act(async () => root.render(<KitchenPage />));
    await flushUntil(() => mocks.latestProps?.data?.orders[0]?.status === 'PENDENTE');
    expect(mocks.latestProps?.data?.orders[0].status).toBe('PENDENTE');

    await act(async () => {
      await mocks.latestProps?.onUpdateOrderStatus?.('#5', 'PREPARANDO');
    });

    expect(mocks.updateStatus).toHaveBeenCalledWith('5', 'PREPARANDO');
    expect(mocks.latestProps?.data?.orders[0].status).toBe('PREPARANDO');
    expect(mocks.latestProps?.data?.orders[0].preparationStartedAt).toBeTruthy();
    expect(mocks.latestProps?.workspaceState?.error).toContain('Não foi possível carregar');
  });
});
