type TableSessionEvent = {
  sessionId: number;
  tableId: number;
  tableNumber: number | null;
  restaurantId: number;
  status: 'OPEN' | 'CLOSED';
  openedAt?: Date | string | null;
  closedAt?: Date | string | null;
  reason?: 'closed-by-staff' | 'expired';
};

export const tableSessionEvents = {
  async opened(payload: TableSessionEvent) {
    const { io } = await import('../../../server.js');
    io.to(`restaurant:${payload.restaurantId}:waiter`).emit('table:session-opened', payload);
    io.to(`restaurant:${payload.restaurantId}:admin`).emit('table:session-opened', payload);
    io.to(`table-waiting:${payload.tableId}`).emit('table:session-opened', payload);
  },

  async closed(payload: TableSessionEvent) {
    const { io } = await import('../../../server.js');
    io.to(`restaurant:${payload.restaurantId}:waiter`).emit('table:session-closed', payload);
    io.to(`restaurant:${payload.restaurantId}:admin`).emit('table:session-closed', payload);
    io.to(`table-session:${payload.sessionId}`).emit('table:session-closed', {
      ...payload,
      reason: payload.reason || 'closed-by-staff',
    });
  },
};
