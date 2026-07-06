import confirmOrderPaymentService from "../services/ConfirmOrderPaymentService.js";

class ConfirmOrderPaymentController {
  async handle(req, res) {
    try {
      const { id } = req.params;
      const { restaurantId, role } = req.user;

      const updatedOrder = await confirmOrderPaymentService.execute(
        id,
        restaurantId,
        role,
      );

      return res.status(200).json(updatedOrder);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }
}

export default new ConfirmOrderPaymentController();
