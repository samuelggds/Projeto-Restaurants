import generateOrderPaymentConfirmationPinService from "../services/GenerateOrderPaymentConfirmationPinService.js";

class GenerateOrderPaymentConfirmationPinController {
  async handle(req, res) {
    try {
      const { id } = req.params;
      const { restaurantId } = req.user;

      const result = await generateOrderPaymentConfirmationPinService.execute(
        id,
        restaurantId,
      );

      return res.status(200).json(result);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }
}

export default new GenerateOrderPaymentConfirmationPinController();
