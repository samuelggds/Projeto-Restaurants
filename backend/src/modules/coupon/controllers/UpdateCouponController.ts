import { Request, Response } from "express";
import updateCouponService from "../services/UpdateCouponService.js";

class UpdateCouponController {
  async handle(req: Request, res: Response) {
    try {
      const restaurantId = req.user.restaurantId;
      const { id } = req.params;
      const { code, discount, expiration } = req.body;

      const coupon = await updateCouponService.execute({
        id,
        restaurantId,
        code,
        discount,
        expiration,
      });

      return res.status(200).json(coupon);
    } catch (error: unknown) {
      return res.status(400).json({
        error:
          error instanceof Error ? error.message : "Erro ao atualizar cupom",
      });
    }
  }
}

export default new UpdateCouponController();
