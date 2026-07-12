import tableRepository from "../repositories/TableRepository.js";
class ListTableService {
    async execute({ restaurantId }) {
        const tables = await tableRepository.findAllByRestaurant(restaurantId);
        return tables;
    }
}
export default new ListTableService();
