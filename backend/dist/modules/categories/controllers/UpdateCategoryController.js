import updateCategoryService from "../services/UpdateCategoryService.js";
class UpdateCategoryController {
    async handle(req, res) {
        try {
            const id = Array.isArray(req.params.id)
                ? req.params.id[0]
                : req.params.id;
            const data = req.body;
            const category = await updateCategoryService.execute(id, data, req.user.restaurantId);
            return res.status(200).json(category);
        }
        catch (error) {
            return res.status(400).json({
                error: error instanceof Error
                    ? error.message
                    : "Erro ao atualizar categoria",
            });
        }
    }
}
export default new UpdateCategoryController();
