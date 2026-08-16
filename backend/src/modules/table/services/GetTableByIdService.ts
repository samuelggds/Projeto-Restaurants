import tableRepository from '../repositories/TableRepository.js';

type GetTableByIdPayload = {
  id: number | string;
  restaurantId: number;
};

class GetTableByIdService {
  async execute({ id, restaurantId }: GetTableByIdPayload) {
    const table = await tableRepository.findById(id);

    if (!table || table.restaurantId !== restaurantId) {
      throw new Error('Mesa não encontrada!');
    }

    return table;
  }
}

export default new GetTableByIdService();
