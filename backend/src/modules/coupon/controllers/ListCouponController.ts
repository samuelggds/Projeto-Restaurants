import listCouponService from "../services/ListCouponService.js";

class ListCouponController {
  async handle(req, res) {
    try {
      const restaurantId = req.user.restaurantId;

      const coupons = await listCouponService.execute({
        restaurantId,
      });

      return res.status(200).json(coupons);
    } catch (error) {
      return res.status(400).json({
        error: error.message,
      });
    }
  }
}

export default new ListCouponController();
