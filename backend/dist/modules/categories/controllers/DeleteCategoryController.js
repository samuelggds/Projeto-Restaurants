import deleteCategoryService from "../services/DeleteCategoryService.js";
class DeleteCategoryController {
    async handle(req, res) {
        try {
            const id = Array.isArray(req.params.id)
                ? req.params.id[0]
                : req.params.id;
            await deleteCategoryService.execute(id, req.user.restaurantId);
            return res
                .status(200)
                .json({ message: "Categoria deletada com sucesso!" });
        }
        catch (error) {
            return res.status(400).json({
                message: error instanceof Error ? error.message : "Erro ao deletar categoria",
            });
        }
    }
}
export default new DeleteCategoryController();
