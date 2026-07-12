import listOrdersService from "../services/ListOrdersService.js";
class ListOrdersController {
    async handle(req, res) {
        try {
            const status = Array.isArray(req.query.status)
                ? req.query.status[0]
                : req.query.status;
            const normalizedStatus = status
                ? String(status).toUpperCase()
                : undefined;
            const restaurantId = req.user.restaurantId;
            const orders = await listOrdersService.execute(restaurantId, normalizedStatus);
            return res.json(orders);
        }
        catch (error) {
            return res.status(400).json({
                error: error instanceof Error ? error.message : "Erro ao listar pedidos",
            });
        }
    }
}
export default new ListOrdersController();
