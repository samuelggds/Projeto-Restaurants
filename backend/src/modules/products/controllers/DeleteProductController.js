import deleteProductService from "../services/DeleteProductService.js";

class DeleteProductController {
  async handle(req, res) {
    try {
      const { id } = req.params;

      await deleteProductService.execute(id, req.user.restaurantId);

      return res.status(200).json({
        message: "Produto deletado com sucesso!",
      });
    } catch (error) {
      return res.status(400).json({
        message: error.message,
      });
    }
  }
}

export default new DeleteProductController();
