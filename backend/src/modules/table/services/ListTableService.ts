import tableRepository from "../repositories/TableRepository.js";

type ListTablePayload = {
  restaurantId: number;
};

class ListTableService {
  async execute({ restaurantId }: ListTablePayload) {
    const tables = await tableRepository.findAllByRestaurant(restaurantId);

    return tables;
  }
}

export default new ListTableService();
