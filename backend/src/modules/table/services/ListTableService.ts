import tableRepository from '../repositories/TableRepository.js';
import reservationStateRepository from '../repositories/ReservationStateRepository.js';
import { resolveRestaurantMenuBaseUrl } from '../../customDomains/services/PublicCustomDomainService.js';

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

    const [tables, menuBaseUrl, reservedTableIds] = await Promise.all([
      tableRepository.findAllByRestaurant(normalizedRestaurantId),
      resolveRestaurantMenuBaseUrl(normalizedRestaurantId),
      reservationStateRepository.findReservedTableIds(normalizedRestaurantId),
    ]);

    return tables.map((table) => {
      const { orders, token, restaurant, ...safeTableData } = table;
      const openSession = table.tableSessions[0] || null;
      // Filtra também pelo ID da sessão: evita misturar uma comanda anterior
      // caso dados antigos ou uma leitura concorrente ainda apareçam na consulta.
      const activeOrders = openSession
        ? orders.filter((order) => order.tableSessionId === openSession.id)
        : [];
      const activeTotal = activeOrders.reduce((total, order) => total + Number(order.total || 0), 0);
      // Usuários de pedidos podem ser null e não representam clientes presentes.
      const guests = openSession?._count.participants ?? 0;
      const operationalStatus = openSession
        ? 'OCCUPIED'
        : reservedTableIds.has(table.id) ? 'RESERVED' : 'FREE';

      return {
        ...safeTableData,
        restaurantSlug: restaurant.slug,
        menuBaseUrl,
        ...(includeQrToken ? { token } : {}),
        status: operationalStatus,
        reservationStatusVerified: true,
        sessionId: openSession?.id ?? null,
        openedAt: openSession?.openedAt ?? null,
        guests,
        total: Number(activeTotal.toFixed(2)),
        operational: {
          status: operationalStatus,
          openSession,
          activeOrdersCount: activeOrders.length,
          guests,
          total: Number(activeTotal.toFixed(2)),
        },
      };
    });
  }
}

export default new ListTableService();
