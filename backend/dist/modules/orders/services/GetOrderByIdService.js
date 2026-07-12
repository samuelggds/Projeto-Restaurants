import orderRepository from "../repositories/OrderRepository.js";
class GetOrderByIdService {
    async execute(orderId, restaurantId) {
        const order = await orderRepository.findById(orderId, restaurantId);
        if (!order) {
            throw new Error("Pedido não encontrado!");
        }
        return order;
    }
}
export default new GetOrderByIdService();
