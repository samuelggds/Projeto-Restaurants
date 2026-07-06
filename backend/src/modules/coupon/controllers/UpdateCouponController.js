import updateCouponService from "../services/UpdateCouponService.js";

class UpdateCouponController {
  async handle(req, res) {
    try {
      const { id } = req.params;
      const { code, discount, expiration } = req.body;

      const coupon = await updateCouponService.execute({
        id,
        code,
        discount,
        expiration,
      });

      return res.status(200).json(coupon);
    } catch (error) {
      return res.status(400).json({
        error: error.message,
      });
    }
  }
}

export default new UpdateCouponController();
