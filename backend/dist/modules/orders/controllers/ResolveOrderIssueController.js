import resolveOrderIssueService from "../services/ResolveOrderIssueService.js";
class ResolveOrderIssueController {
    async handle(req, res) {
        try {
            const id = Array.isArray(req.params.id)
                ? req.params.id[0]
                : req.params.id;
            const { restaurantId, id: adminUserId } = req.user;
            const result = await resolveOrderIssueService.execute({
                orderId: id,
                restaurantId,
                adminUserId,
            });
            return res.status(200).json(result);
        }
        catch (error) {
            return res.status(400).json({
                error: error instanceof Error
                    ? error.message
                    : "Erro ao resolver problema do pedido",
            });
        }
    }
}
export default new ResolveOrderIssueController();
