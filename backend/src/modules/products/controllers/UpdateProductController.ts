import updateProductService from "../services/UpdateProductService.js";

class UpdateProductController {
  async handle(req, res) {
    try {
      const { id } = req.params;
      const data = req.body;

      const updatedProduct = await updateProductService.execute(
        id,
        data,
        req.user.restaurantId,
      );

      return res.status(200).json(updatedProduct);
    } catch (error) {
      return res.status(400).json({
        message: error.message,
      });
    }
  }
}

export default new UpdateProductController();
