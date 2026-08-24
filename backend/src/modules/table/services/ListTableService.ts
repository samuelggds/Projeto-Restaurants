import tableRepository from '../repositories/TableRepository.js';

type ListTablePayload = {
  restaurantId: number;
  includeQrToken?: boolean;
};

class ListTableService {
  async execute({ restaurantId, includeQrToken = false }: ListTablePayload) {
    const normalizedRestaurantId = Number(restaurantId);
    if (!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new Error('Restaurante não identificado para listar mesas.');
    }

    const tables = await tableRepository.findAllByRestaurant(normalizedRestaurantId);

    return tables.map((table) => {
      const { orders, token, ...safeTableData } = table;
      const openSession = table.tableSessions[0] || null;
      const activeTotal = orders.reduce((total, order) => total + Number(order.total || 0), 0);
      const guests = new Set(orders.map((order) => order.userId)).size;
      const operationalStatus = openSession ? 'OCCUPIED' : 'FREE';

      return {
        ...safeTableData,
        ...(includeQrToken ? { token } : {}),
        status: operationalStatus,
        sessionId: openSession?.id ?? null,
        openedAt: openSession?.openedAt ?? null,
        guests,
        total: Number(activeTotal.toFixed(2)),
        operational: {
          status: operationalStatus,
          openSession,
          activeOrdersCount: orders.length,
          guests,
          total: Number(activeTotal.toFixed(2)),
        },
      };
    });
  }
}

export default new ListTableService();
