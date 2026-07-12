import updateEmployeeService from "../services/UpdateEmployeeService.js";
class UpdateEmployeeController {
    async handle(req, res) {
        try {
            const restaurantId = req.user.restaurantId;
            const id = Array.isArray(req.params.id)
                ? req.params.id[0]
                : req.params.id;
            const { name, email, phone } = req.body;
            const employee = await updateEmployeeService.execute({
                id,
                restaurantId,
                name,
                email,
                phone,
            });
            return res.status(200).json(employee);
        }
        catch (error) {
            return res.status(400).json({
                error: error instanceof Error
                    ? error.message
                    : "Erro ao atualizar funcionario",
            });
        }
    }
}
export default new UpdateEmployeeController();
