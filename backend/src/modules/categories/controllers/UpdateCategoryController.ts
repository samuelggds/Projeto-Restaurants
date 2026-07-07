import { Request, Response } from "express";
import updateCategoryService from "../services/UpdateCategoryService.js";

class UpdateCategoryController {
  async handle(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const data = req.body;

      const category = await updateCategoryService.execute(
        id,
        data,
        req.user.restaurantId,
      );

      return res.status(200).json(category);
    } catch (error: unknown) {
      return res.status(400).json({
        error:
          error instanceof Error
            ? error.message
            : "Erro ao atualizar categoria",
      });
    }
  }
}

export default new UpdateCategoryController();
