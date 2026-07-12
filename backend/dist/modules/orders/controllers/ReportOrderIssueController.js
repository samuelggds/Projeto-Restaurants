import reportOrderIssueService from "../services/ReportOrderIssueService.js";
class ReportOrderIssueController {
    async handle(req, res) {
        try {
            const id = Array.isArray(req.params.id)
                ? req.params.id[0]
                : req.params.id;
            const { id: userId, restaurantId } = req.user;
            const { message } = req.body || {};
            const result = await reportOrderIssueService.execute(id, userId, restaurantId, message);
            return res.status(200).json(result);
        }
        catch (error) {
            return res.status(400).json({
                error: error instanceof Error
                    ? error.message
                    : "Erro ao relatar problema no pedido",
            });
        }
    }
}
export default new ReportOrderIssueController();
