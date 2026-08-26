import orderRepository from '../repositories/OrderRepository.js';

class GetCurrentTableOrderService {
  async execute(input: {
    tableSessionId?: number | string | null;
    restaurantId?: number | string | null;
    participantId?: number | string | null;
  }) {
    const tableSessionId = Number(input.tableSessionId || 0);
    const restaurantId = Number(input.restaurantId || 0);
    const participantId = Number(input.participantId || 0);
    if (
      !Number.isSafeInteger(tableSessionId) ||
      tableSessionId <= 0 ||
      !Number.isSafeInteger(restaurantId) ||
      restaurantId <= 0 ||
      !Number.isSafeInteger(participantId) ||
      participantId <= 0
    ) {
      return null;
    }

    return orderRepository.findLatestByTableParticipant(
      tableSessionId,
      restaurantId,
      participantId,
    );
  }
}

export default new GetCurrentTableOrderService();
