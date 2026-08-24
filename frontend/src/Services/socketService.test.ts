import { beforeEach, describe, expect, it, vi } from 'vitest';

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

  it('reutiliza o socket do mesmo usuário durante o handshake', async () => {
    const connectingSocket = socketDouble();
    ioMock.mockReturnValue(connectingSocket);
    const { connectSocket, disconnectSocket } = await import('./socketService');

    const ordersSocket = connectSocket('token-restaurante', 'kitchen-orders');
    const helpSocket = connectSocket('token-restaurante', 'operational-issue-notifications');

    expect(helpSocket).toBe(ordersSocket);
    expect(ioMock).toHaveBeenCalledTimes(1);

    disconnectSocket();
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

    disconnectSocket();
  });
});
