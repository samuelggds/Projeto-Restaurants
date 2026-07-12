import openTableSessionService from "../services/OpenTableSessionService.js";
class OpenTableSessionController {
    async handle(req, res) {
        try {
            const restaurantId = req.user.restaurantId;
            const openedById = req.user.id;
            const { tableId } = req.body;
            const result = await openTableSessionService.execute({
                tableId,
                restaurantId,
                openedById,
            });
            return res.status(200).json(result);
        }
        catch (error) {
            return res.status(400).json({
                error: error instanceof Error
                    ? error.message
                    : "Erro ao abrir sessao de mesa",
            });
        }
    }
}
export default new OpenTableSessionController();
