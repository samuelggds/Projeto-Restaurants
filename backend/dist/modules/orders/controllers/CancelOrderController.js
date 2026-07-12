import cancelOrderService from "../services/CancelOrderService.js";
class CancelOrderController {
    async handle(req, res) {
        try {
            const { id } = req.params;
            const { id: userId, restaurantId } = req.user;
            const order = await cancelOrderService.execute(id, userId, restaurantId);
            return res.json(order);
        }
        catch (error) {
            return res.status(400).json({
                error: error instanceof Error ? error.message : "Erro ao cancelar pedido",
            });
        }
    }
}
export default new CancelOrderController();
