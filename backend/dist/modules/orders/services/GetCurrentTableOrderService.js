import orderRepository from "../repositories/OrderRepository.js";
class GetCurrentTableOrderService {
    async execute(tableId, restaurantId) {
        if (!Number(tableId) || !Number(restaurantId)) {
            return null;
        }
        return orderRepository.findLatestByTable(tableId, restaurantId);
    }
}
export default new GetCurrentTableOrderService();
