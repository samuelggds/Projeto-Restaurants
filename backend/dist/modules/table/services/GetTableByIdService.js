import tableRepository from "../repositories/TableRepository.js";
class GetTableByIdService {
    async execute({ id, restaurantId }) {
        const table = await tableRepository.findById(id);
        if (!table || table.restaurantId !== restaurantId) {
            throw new Error("Mesa não encontrada!");
        }
        return table;
    }
}
export default new GetTableByIdService();
