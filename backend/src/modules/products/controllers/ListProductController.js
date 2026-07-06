import listProductService from "../services/ListProductService.js";

class ListProductsController {
  async handle(req, res) {
    try {
      const restaurantId =
        Number(req.query.restaurantId) || Number(req.user?.restaurantId);

      const products = await listProductService.execute(restaurantId);

      return res.status(200).json(products);
    } catch (error) {
      return res.status(400).json({
        message: error.message,
      });
    }
  }
}

export default new ListProductsController();
