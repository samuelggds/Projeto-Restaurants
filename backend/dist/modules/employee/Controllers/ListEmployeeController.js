import listEmployeeService from "../services/ListEmployeeService.js";
class ListEmployeeController {
    async handle(req, res) {
        try {
            const restaurantId = req.user.restaurantId;
            const employess = await listEmployeeService.execute(restaurantId);
            return res.status(200).json(employess);
        }
        catch (error) {
            return res.status(400).json({
                error: error instanceof Error
                    ? error.message
                    : "Erro ao listar funcionarios",
            });
        }
    }
}
export default new ListEmployeeController();
