import type { Server } from 'socket.io';
import type { RealtimeTransport } from './realtimePublisher.js';
import { SOCKET_REVOKE_EVENT } from './socketRevocation.js';

/** Mantém os tipos e detalhes do Socket.IO fora dos módulos de negócio. */
export function createSocketIoRealtimeTransport(io: Server): RealtimeTransport {
  return {
    emit: (event, ...args) => io.emit(event, ...args),
    to: (room) => ({
      emit: (event, ...args) => {
        if (event === SOCKET_REVOKE_EVENT) {
          io.in(room).disconnectSockets(true);
          return true;
        }
        return io.to(room).emit(event, ...args);
      },
    }),
  };
}
