import listOrdersService from "../services/ListOrdersService.js";

class ListOrdersController {
  async handle(req, res) {
    try {
      const { status } = req.query;

      const restaurantId = req.user.restaurantId;

      const orders = await listOrdersService.execute(restaurantId, status);

      return res.json(orders);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }
}

export default new ListOrdersController();
