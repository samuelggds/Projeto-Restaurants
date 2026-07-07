import tableRepository from "../repositories/TableRepository.js";

type DeactivateTablePayload = {
  id: number | string;
  restaurantId: number;
};

class DeactivateTableService {
  async execute({ id, restaurantId }: DeactivateTablePayload) {
    const table = await tableRepository.findById(id);

    if (!table || table.restaurantId !== restaurantId) {
      throw new Error("Mesa não encontrada!");
    }

    return await tableRepository.deactivate(id);
  }
}

export default new DeactivateTableService();
