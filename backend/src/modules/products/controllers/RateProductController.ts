import rateProductService from "../services/RateProductService.js";

class RateProductController {
  async handle(req, res) {
    try {
      const { id } = req.params;
      const { restaurantId, clientKey, rating } = req.body;

      const result = await rateProductService.execute({
        productId: id,
        restaurantId,
        clientKey,
        rating,
      });

      return res.status(200).json(result);
    } catch (error) {
      return res.status(400).json({
        message: error.message,
      });
    }
  }
}

export default new RateProductController();
