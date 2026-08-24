type CallEventPayload = {
  id: number;
  restaurantId: number;
  tableId: number;
  type: string;
  status: string;
  [key: string]: unknown;
};

export const tableServiceCallEvents = {
  async created(payload: CallEventPayload) {
    const { io } = await import('../../../server.js');
    io.to(`restaurant:${payload.restaurantId}:waiter`).emit('waiter-call:created', payload);
    io.to(`restaurant:${payload.restaurantId}:admin`).emit('waiter-call:created', payload);
  },

  async updated(payload: CallEventPayload) {
    const { io } = await import('../../../server.js');
    io.to(`restaurant:${payload.restaurantId}:waiter`).emit('waiter-call:updated', payload);
    io.to(`restaurant:${payload.restaurantId}:admin`).emit('waiter-call:updated', payload);
    io.to(`table:${payload.tableId}`).emit('waiter-call:updated', payload);
  },
};
