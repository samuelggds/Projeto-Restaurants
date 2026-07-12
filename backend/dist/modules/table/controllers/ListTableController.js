import listTableService from "../services/ListTableService.js";
class ListTableController {
    async handle(req, res) {
        try {
            const restaurantId = req.user.restaurantId;
            const tables = await listTableService.execute({
                restaurantId,
            });
            return res.status(200).json(tables);
        }
        catch (error) {
            return res.status(400).json({
                error: error instanceof Error ? error.message : "Erro ao listar mesas",
            });
        }
    }
}
export default new ListTableController();
