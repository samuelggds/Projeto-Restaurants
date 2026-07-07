import { Request, Response } from "express";
import updateBannerService from "../services/UpdateBannerService.js";

class UpdateBannerController {
  async handle(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { title, image } = req.body;

      const banner = await updateBannerService.execute({
        id,
        title,
        image,
      });

      return res.status(200).json(banner);
    } catch (error: unknown) {
      return res.status(400).json({
        error:
          error instanceof Error ? error.message : "Erro ao atualizar banner",
      });
    }
  }
}

export default new UpdateBannerController();
