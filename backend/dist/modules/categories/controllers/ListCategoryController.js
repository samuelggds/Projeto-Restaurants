import listCategoryService from "../services/ListCategoryService.js";
class ListCategoryController {
    async handle(req, res) {
        try {
            const categories = await listCategoryService.execute(req.user.restaurantId);
            return res.status(200).json(categories);
        }
        catch (error) {
            return res.status(400).json({
                error: error instanceof Error ? error.message : "Erro ao listar categorias",
            });
        }
    }
}
export default new ListCategoryController();
