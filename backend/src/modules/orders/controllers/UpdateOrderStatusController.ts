import updateOrderStatusService from "../services/UpdateOrderStatusService.js";

class UpdateOrderStatusController {
  async handle(req, res) {
    try {
      const { id } = req.params;

      const { status } = req.body;

      const { restaurantId, role } = req.user;

      const updatedOrder = await updateOrderStatusService.execute(
        id,
        restaurantId,
        status,
        role,
      );

      return res.status(200).json(updatedOrder);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }
}

export default new UpdateOrderStatusController();
