import orderPixPaymentService from "../services/OrderPixPaymentService.js";

class CreateOrderPixPaymentController {
  async handle(req, res) {
    try {
      const {
        restaurantId,
        type,
        paymentMethod,
        items,
        address,
        number,
        district,
        city,
        state,
        customerName,
        customerCpf,
      } = req.body;

      const userRestaurantId = req.user?.restaurantId ?? null;
      const resolvedRestaurantId =
        Number(restaurantId) || Number(userRestaurantId);

      const result = await orderPixPaymentService.createPixPayment({
        restaurantId: resolvedRestaurantId,
        type,
        paymentMethod,
        items,
        address,
        number,
        district,
        city,
        state,
        customerName,
        customerCpf,
        userEmail: req.user?.email || null,
      });

      return res.status(201).json(result);
    } catch (error) {
      return res.status(400).json({
        error: error.message,
      });
    }
  }
}

export default new CreateOrderPixPaymentController();
