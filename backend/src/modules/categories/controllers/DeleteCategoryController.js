import deleteCategoryService from "../services/DeleteCategoryService.js";

class DeleteCategoryController {
  async handle(req, res) {
    try {
      const { id } = req.params;

      await deleteCategoryService.execute(id, req.user.restaurantId);

      return res
        .status(200)
        .json({ message: "Categoria deletada com sucesso!" });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }
}

export default new DeleteCategoryController();
