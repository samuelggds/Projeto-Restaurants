import getOrderByIdService from "../services/GetOrderByIdService.js";

class GetOrderByIdController {
  async handle(req, res) {
    try {
      const { id } = req.params;

      const restaurantId = req.user.restaurantId;

      const order = await getOrderByIdService.execute(id, restaurantId);

      return res.json(order);
    } catch (error) {
      return res.status(400).json({
        error: error.message,
      });
    }
  }
}

export default new GetOrderByIdController();
