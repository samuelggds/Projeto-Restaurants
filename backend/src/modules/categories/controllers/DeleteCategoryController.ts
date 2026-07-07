import { Request, Response } from "express";
import deleteCategoryService from "../services/DeleteCategoryService.js";

class DeleteCategoryController {
  async handle(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await deleteCategoryService.execute(id, req.user.restaurantId);

      return res
        .status(200)
        .json({ message: "Categoria deletada com sucesso!" });
    } catch (error: unknown) {
      return res.status(400).json({
        message:
          error instanceof Error ? error.message : "Erro ao deletar categoria",
      });
    }
  }
}

export default new DeleteCategoryController();
