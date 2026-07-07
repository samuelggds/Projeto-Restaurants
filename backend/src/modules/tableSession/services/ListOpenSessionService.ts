import tableSessionRepository from "../repositories/TableSessionRepository.js";

type ListOpenSessionPayload = {
  restaurantId: number;
};

class ListOpenSessionService {
  async execute({ restaurantId }: ListOpenSessionPayload) {
    const sessions =
      await tableSessionRepository.listOpenByRestaurant(restaurantId);

    return sessions;
  }
}

export default new ListOpenSessionService();
