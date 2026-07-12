import listMyOrdersService from "../services/ListMyOrdersService.js";
class ListMyOrdersController {
    async handle(req, res) {
        try {
            const { id: userId, restaurantId } = req.user;
            const orders = await listMyOrdersService.execute(userId, restaurantId);
            return res.json(orders);
        }
        catch (error) {
            return res.status(400).json({
                error: error instanceof Error
                    ? error.message
                    : "Erro ao listar pedidos do usuario",
            });
        }
    }
}
export default new ListMyOrdersController();
