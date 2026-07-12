import getOrderIssueThreadService from "../services/GetOrderIssueThreadService.js";
class GetOrderIssueThreadController {
    async handle(req, res) {
        try {
            const id = Array.isArray(req.params.id)
                ? req.params.id[0]
                : req.params.id;
            const { id: requesterUserId, role, restaurantId } = req.user;
            const result = await getOrderIssueThreadService.execute({
                orderId: id,
                requesterUserId,
                requesterRole: role,
                requesterRestaurantId: restaurantId,
            });
            return res.status(200).json(result);
        }
        catch (error) {
            return res.status(400).json({
                error: error instanceof Error
                    ? error.message
                    : "Erro ao carregar conversa do problema do pedido",
            });
        }
    }
}
export default new GetOrderIssueThreadController();
