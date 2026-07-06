import requestOrderPaymentConfirmationPinService from "../services/RequestOrderPaymentConfirmationPinService.js";

class RequestOrderPaymentConfirmationPinController {
  async handle(req, res) {
    try {
      const { id } = req.params;
      const { restaurantId, role } = req.user;

      const result = await requestOrderPaymentConfirmationPinService.execute(
        id,
        restaurantId,
        role,
      );

      return res.status(200).json(result);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }
}

export default new RequestOrderPaymentConfirmationPinController();
