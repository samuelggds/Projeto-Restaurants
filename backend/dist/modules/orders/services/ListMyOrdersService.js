import orderRepository from "../repositories/OrderRepository.js";
class ListMyOrdersService {
    async execute(userId, restaurantId) {
        return orderRepository.findByUserId(userId, restaurantId);
    }
}
export default new ListMyOrdersService();
