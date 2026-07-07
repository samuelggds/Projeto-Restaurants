import tableRepository from "../repositories/TableRepository.js";

class UpdateTableService {
  async execute({ id, restaurantId, number }) {
    const table = await tableRepository.findById(id);

    if (!table || table.restaurantId !== restaurantId) {
      throw new Error("Mesa não encontrada!");
    }

    const tableExists = await tableRepository.findByNumber(
      number,
      restaurantId,
    );

    if (tableExists && tableExists.id !== table.id) {
      throw new Error("Já existe uma mesa com esse número!");
    }

    return await tableRepository.update(id, {
      number,
    });
  }
}

export default new UpdateTableService();
