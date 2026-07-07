import listProductRatingsService from "../services/ListProductRatingsService.js";

class ListProductRatingsController {
  async handle(req, res) {
    try {
      const restaurantId = Number(req.query.restaurantId);
      const clientKey = String(req.query.clientKey || "").trim();

      const result = await listProductRatingsService.execute(
        restaurantId,
        clientKey,
      );

      return res.status(200).json(result);
    } catch (error) {
      return res.status(400).json({
        message: error.message,
      });
    }
  }
}

export default new ListProductRatingsController();
