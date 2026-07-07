import updateCategoryService from "../services/UpdateCategoryService.js";

class UpdateCategoryController {
  async handle(req, res) {
    try {
      const { id } = req.params;

      const data = req.body;

      const category = await updateCategoryService.execute(
        id,
        data,
        req.user.restaurantId,
      );

      return res.status(200).json(category);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }
}

export default new UpdateCategoryController();
