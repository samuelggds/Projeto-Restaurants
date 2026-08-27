import type { Server } from 'socket.io';
import type { RealtimeTransport } from './realtimePublisher.js';

/** Mantém os tipos e detalhes do Socket.IO fora dos módulos de negócio. */
export function createSocketIoRealtimeTransport(io: Server): RealtimeTransport {
  return {
    emit: (event, ...args) => io.emit(event, ...args),
    to: (room) => ({
      emit: (event, ...args) => io.to(room).emit(event, ...args),
    }),
  };
}
