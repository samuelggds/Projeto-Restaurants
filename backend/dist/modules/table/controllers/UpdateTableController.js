import updateTableService from "../services/UpdateTableService.js";
class UpdateTableController {
    async handle(req, res) {
        try {
            const restaurantId = req.user.restaurantId;
            const parsedId = Array.isArray(req.params.id)
                ? req.params.id[0]
                : req.params.id;
            const { number, active } = req.body;
            const table = await updateTableService.execute({
                id: parsedId,
                restaurantId,
                number,
                active,
            });
            return res.status(200).json(table);
        }
        catch (error) {
            return res.status(400).json({
                error: error instanceof Error ? error.message : "Erro ao atualizar mesa",
            });
        }
    }
}
export default new UpdateTableController();
