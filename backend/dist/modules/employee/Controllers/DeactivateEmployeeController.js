import deactivateEmployeeService from "../services/DeactivateEmployeeService.js";
class DeactivateEmployeeController {
    async handle(req, res) {
        try {
            const restaurantId = req.user.restaurantId;
            const id = Array.isArray(req.params.id)
                ? req.params.id[0]
                : req.params.id;
            const employee = await deactivateEmployeeService.execute(id, restaurantId);
            return res.status(200).json(employee);
        }
        catch (error) {
            return res.status(400).json({
                error: error instanceof Error
                    ? error.message
                    : "Erro ao desativar funcionario",
            });
        }
    }
}
export default new DeactivateEmployeeController();
