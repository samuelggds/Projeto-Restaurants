import { realtimePublisher } from './realtimePublisher.js';

// Internal transport command. The local adapter consumes it; it is never sent
// as a client event. The PostgreSQL relay delivers it to every API replica.
export const SOCKET_REVOKE_EVENT = '__socket:revoke-room__';

export function socketAccountRoom(userId: number | string, authVersion: number) {
  return `auth-session:${userId}:${authVersion}`;
}

export function revokeSocketRoom(room: string) {
  return realtimePublisher.to(room).emit(SOCKET_REVOKE_EVENT);
}
