import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ordersService from '../../../Services/ordersService';
import { connectTableSessionSocket } from '../../../Services/socketService';
import { useTableOrderNotice } from './useTableOrderNotice';

const socketOn = vi.fn();
const socketOff = vi.fn();

vi.mock('../../../Services/ordersService', () => ({
  default: {
    getCurrentTableOrder: vi.fn(),
    listMyOrders: vi.fn(),
  },
}));

vi.mock('../../../Services/socketService', () => ({
  connectTableSessionSocket: vi.fn(() => ({ on: socketOn, off: socketOff })),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function tableOrder(status: string) {
  return {
    publicId: 'table-order-public-id',
    type: 'MESA',
    status,
    items: [{ product: { name: 'Pizza da mesa' } }],
  };
}

function Probe() {
  const { tableOrder: order } = useTableOrderNotice({
    enabled: true,
    sessionKey: 'session-public-id',
    sessionToken: 'session-token',
  });
  return <output>{order?.statusLabel || 'sem-pedido'}</output>;
}

describe('useTableOrderNotice', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it('consulta a sessão do QR mesmo sem login e reage aos eventos da mesa', async () => {
    vi.mocked(ordersService.getCurrentTableOrder)
      .mockResolvedValueOnce(tableOrder('PENDENTE'))
      .mockResolvedValueOnce(tableOrder('PRONTO'));

    await act(async () => root.render(<Probe />));
    await act(async () => new Promise((resolve) => window.setTimeout(resolve, 5)));

    expect(container.textContent).toBe('Pedido recebido');
    expect(ordersService.listMyOrders).not.toHaveBeenCalled();
    expect(connectTableSessionSocket).toHaveBeenCalledWith(
      'session-token',
      'home-table-order-status',
    );

    const statusHandler = socketOn.mock.calls.find(
      ([eventName]) => eventName === 'order:status-changed',
    )?.[1] as ((payload?: { type?: string }) => void) | undefined;
    expect(statusHandler).toBeTypeOf('function');

    await act(async () => statusHandler?.({ type: 'MESA' }));
    expect(container.textContent).toBe('Pronto para servir');
  });

  it('descarta defensivamente um pedido que não pertence ao salão', async () => {
    vi.mocked(ordersService.getCurrentTableOrder).mockResolvedValue({
      publicId: 'delivery-id',
      type: 'DELIVERY',
      status: 'ENTREGUE',
    });

    await act(async () => root.render(<Probe />));
    await act(async () => new Promise((resolve) => window.setTimeout(resolve, 5)));

    expect(container.textContent).toBe('sem-pedido');
  });
});
