import { Request, Response } from "express";
import deleteBannerService from "../services/DeleteBannerService.js";

class DeleteBannerController {
  async handle(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const result = await deleteBannerService.execute({
        id,
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
