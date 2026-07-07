import { Request, Response } from "express";
import deleteCouponService from "../services/DeleteCouponService.js";

class DeleteCouponController {
  async handle(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const result = await deleteCouponService.execute({
        id,
      });

      return res.status(200).json(result);
    } catch (error: unknown) {
      return res.status(400).json({
        error:
          error instanceof Error ? error.message : "Erro ao remover cupom",
      });
    }
  }
}

export default new DeleteCouponController();
