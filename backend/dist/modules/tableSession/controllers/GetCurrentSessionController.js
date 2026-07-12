class GetCurrentSessionController {
    async handle(req, res) {
        try {
            return res.status(200).json({
                sessionId: req.tableSession.id,
                tableId: req.tableSession.tableId,
                restaurantId: req.tableSession.restaurantId,
            });
        }
        catch (error) {
            return res.status(400).json({
                error: error instanceof Error ? error.message : "Erro ao obter sessao atual",
            });
        }
    }
}
export default new GetCurrentSessionController();
