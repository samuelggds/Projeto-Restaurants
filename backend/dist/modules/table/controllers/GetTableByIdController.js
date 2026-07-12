import getTableByIdService from "../services/GetTableByIdService.js";
class GetTableByIdController {
    async handle(req, res) {
        try {
            const restaurantId = req.user.restaurantId;
            const parsedId = Array.isArray(req.params.id)
                ? req.params.id[0]
                : req.params.id;
            const table = await getTableByIdService.execute({
                id: parsedId,
                restaurantId,
            });
            return res.status(200).json(table);
        }
        catch (error) {
            return res.status(400).json({
                error: error instanceof Error ? error.message : "Erro ao buscar mesa",
            });
        }
    }
}
export default new GetTableByIdController();
