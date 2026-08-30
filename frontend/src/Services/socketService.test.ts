import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ioMock = vi.fn();

vi.mock('socket.io-client', () => ({
  io: ioMock,
}));

function socketDouble() {
  return {
    connected: false,
    active: true,
    id: undefined,
    io: { engine: { transport: { name: 'websocket' } } },
    on: vi.fn(),
    once: vi.fn(),
    off: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
}

describe('socketService', () => {
  beforeEach(async () => {
    vi.resetModules();
    ioMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('prioriza o proxy same-origin do Vite em desenvolvimento', async () => {
    const connectingSocket = socketDouble();
    ioMock.mockReturnValue(connectingSocket);
    const { connectSocket, disconnectSocket } = await import('./socketService');

    connectSocket('token-restaurante', 'same-origin-proxy');

    expect(ioMock).toHaveBeenCalledWith(
      window.location.origin,
      expect.objectContaining({ path: '/socket.io' }),
    );

    disconnectSocket({ immediate: true });
  });

  it('reutiliza o socket do mesmo usuário durante o handshake', async () => {
    const connectingSocket = socketDouble();
    ioMock.mockReturnValue(connectingSocket);
    const { connectSocket, disconnectSocket } = await import('./socketService');

    const ordersSocket = connectSocket('token-restaurante', 'kitchen-orders');
    const helpSocket = connectSocket('token-restaurante', 'operational-issue-notifications');

    expect(helpSocket).toBe(ordersSocket);
    expect(ioMock).toHaveBeenCalledTimes(1);

    disconnectSocket({ immediate: true });
  });

  it('substitui o socket quando a credencial muda', async () => {
    const firstSocket = socketDouble();
    const secondSocket = socketDouble();
    ioMock.mockReturnValueOnce(firstSocket).mockReturnValueOnce(secondSocket);
    const { connectSocket, disconnectSocket } = await import('./socketService');

    connectSocket('token-a', 'first');
    connectSocket('token-b', 'second');

    expect(firstSocket.disconnect).toHaveBeenCalledOnce();
    expect(ioMock).toHaveBeenCalledTimes(2);

    disconnectSocket({ immediate: true });
  });

  it('cancela a desconexão transitória quando o StrictMode remonta o consumidor', async () => {
    vi.useFakeTimers();
    const connectingSocket = socketDouble();
    ioMock.mockReturnValue(connectingSocket);
    const { acquireSocket, disconnectSocket } = await import('./socketService');

    const firstMount = acquireSocket('token-restaurante', 'strict-mode-first-mount');
    firstMount.release();

    expect(connectingSocket.disconnect).not.toHaveBeenCalled();

    const secondMount = acquireSocket('token-restaurante', 'strict-mode-second-mount');
    vi.advanceTimersByTime(1_000);

    expect(secondMount.socket).toBe(firstMount.socket);
    expect(ioMock).toHaveBeenCalledTimes(1);
    expect(connectingSocket.disconnect).not.toHaveBeenCalled();

    secondMount.release();
    disconnectSocket({ immediate: true });
  });

  it('desconecta após o período de tolerância em uma desmontagem real', async () => {
    vi.useFakeTimers();
    const connectingSocket = socketDouble();
    ioMock.mockReturnValue(connectingSocket);
    const { acquireSocket, getSocket } = await import('./socketService');

    const lease = acquireSocket('token-restaurante', 'real-unmount');
    lease.release();
    vi.advanceTimersByTime(74);

    expect(connectingSocket.disconnect).not.toHaveBeenCalled();
    expect(getSocket()).toBe(connectingSocket);

    vi.advanceTimersByTime(1);

    expect(connectingSocket.disconnect).toHaveBeenCalledOnce();
    expect(getSocket()).toBeNull();
  });

  it('mantém o logout imediato mesmo com uma desconexão já agendada', async () => {
    vi.useFakeTimers();
    const connectingSocket = socketDouble();
    ioMock.mockReturnValue(connectingSocket);
    const { acquireSocket, disconnectSocket } = await import('./socketService');

    const lease = acquireSocket('token-restaurante', 'logout');
    lease.release();
    disconnectSocket({ immediate: true });
    vi.advanceTimersByTime(1_000);

    expect(connectingSocket.disconnect).toHaveBeenCalledOnce();
  });

  it('mantém o socket enquanto ainda existe outro consumidor ativo', async () => {
    vi.useFakeTimers();
    const connectingSocket = socketDouble();
    ioMock.mockReturnValue(connectingSocket);
    const { acquireSocket, disconnectSocket } = await import('./socketService');

    const ordersLease = acquireSocket('token-restaurante', 'orders');
    const notificationsLease = acquireSocket('token-restaurante', 'notifications');

    ordersLease.release();
    vi.advanceTimersByTime(1_000);

    expect(connectingSocket.disconnect).not.toHaveBeenCalled();

    notificationsLease.release();
    vi.advanceTimersByTime(75);

    expect(connectingSocket.disconnect).toHaveBeenCalledOnce();
    disconnectSocket({ immediate: true });
  });

  it('ignora a liberação antiga depois de trocar a credencial', async () => {
    vi.useFakeTimers();
    const firstSocket = socketDouble();
    const secondSocket = socketDouble();
    ioMock.mockReturnValueOnce(firstSocket).mockReturnValueOnce(secondSocket);
    const { acquireSocket, disconnectSocket } = await import('./socketService');

    const oldLease = acquireSocket('token-a', 'old-account');
    const currentLease = acquireSocket('token-b', 'current-account');
    oldLease.release();
    vi.advanceTimersByTime(1_000);

    expect(firstSocket.disconnect).toHaveBeenCalledOnce();
    expect(secondSocket.disconnect).not.toHaveBeenCalled();

    currentLease.release();
    vi.advanceTimersByTime(75);
    expect(secondSocket.disconnect).toHaveBeenCalledOnce();
    disconnectSocket({ immediate: true });
  });

  it('aplica a mesma tolerância às sessões de mesa', async () => {
    vi.useFakeTimers();
    const connectingSocket = socketDouble();
    ioMock.mockReturnValue(connectingSocket);
    const { connectTableSessionSocket, disconnectTableSessionSocket } =
      await import('./socketService');

    const firstMountSocket = connectTableSessionSocket('session-token', 'first-mount');
    disconnectTableSessionSocket();
    const secondMountSocket = connectTableSessionSocket('session-token', 'second-mount');
    vi.advanceTimersByTime(1_000);

    expect(secondMountSocket).toBe(firstMountSocket);
    expect(ioMock).toHaveBeenCalledTimes(1);
    expect(connectingSocket.disconnect).not.toHaveBeenCalled();

    disconnectTableSessionSocket({ immediate: true });
  });

  it('não mantém a sessão de mesa viva quando uma reconexão inválida ocorre no grace', async () => {
    vi.useFakeTimers();
    const connectingSocket = socketDouble();
    ioMock.mockReturnValue(connectingSocket);
    const { connectTableSessionSocket, disconnectTableSessionSocket } =
      await import('./socketService');

    connectTableSessionSocket('session-token', 'valid-session');
    disconnectTableSessionSocket();
    expect(connectTableSessionSocket('', 'invalid-session')).toBeNull();
    vi.advanceTimersByTime(75);

    expect(connectingSocket.disconnect).toHaveBeenCalledOnce();
  });
});
