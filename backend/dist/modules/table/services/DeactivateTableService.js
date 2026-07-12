import tableRepository from "../repositories/TableRepository.js";
class DeactivateTableService {
    async execute({ id, restaurantId }) {
        const table = await tableRepository.findById(id);
        if (!table || table.restaurantId !== restaurantId) {
            throw new Error("Mesa não encontrada!");
        }
        return await tableRepository.deactivate(id);
    }
}
export default new DeactivateTableService();
