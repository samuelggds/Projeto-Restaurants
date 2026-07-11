import { Request, Response } from "express";
import clearOrdersAndCategoriesService from "../services/ClearOrdersAndCategoriesService.js";

class ClearOrdersAndCategoriesController {
  async handle(req: Request, res: Response) {
    try {
      await clearOrdersAndCategoriesService.execute(req.user.restaurantId);

      return res.status(200).json({
        message: "Pedidos e categorias excluídos com sucesso!",
      });
    } catch (error: unknown) {
      return res.status(400).json({
        error:
          error instanceof Error
            ? error.message
            : "Erro ao excluir pedidos e categorias",
      });
    }
  }
}

export default new ClearOrdersAndCategoriesController();
