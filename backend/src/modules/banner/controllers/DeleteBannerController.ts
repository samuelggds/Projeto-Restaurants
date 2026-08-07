import { Request, Response } from "express";
import deleteBannerService from "../services/DeleteBannerService.js";

class DeleteBannerController {
  async handle(req: Request, res: Response) {
    try {
      const restaurantId = req.user.restaurantId;
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      const result = await deleteBannerService.execute({
        id,
        restaurantId,
      });

      return res.status(200).json(result);
    } catch (error: unknown) {
      return res.status(400).json({
        error:
          error instanceof Error ? error.message : "Erro ao remover banner",
      });
    }
  }
}

export default new DeleteBannerController();
