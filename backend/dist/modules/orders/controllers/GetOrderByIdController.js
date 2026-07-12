import getOrderByIdService from "../services/GetOrderByIdService.js";
class GetOrderByIdController {
    async handle(req, res) {
        try {
            const id = Array.isArray(req.params.id)
                ? req.params.id[0]
                : req.params.id;
            const restaurantId = req.user.restaurantId;
            const order = await getOrderByIdService.execute(id, restaurantId);
            return res.json(order);
        }
        catch (error) {
            return res.status(400).json({
                error: error instanceof Error ? error.message : "Erro ao buscar pedido",
            });
        }
    }
}
export default new GetOrderByIdController();
