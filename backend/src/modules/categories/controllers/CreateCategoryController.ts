import { Request, Response } from "express";
import createCategoryService from "../services/CreateCategoryService.js";

class CreateCategoryController {
  async handle(req: Request, res: Response) {
    try {
      const { name, description, image, active } = req.body;

      const category = await createCategoryService.execute(
        {
          name,
          description,
          image,
          active,
        },
        req.user.restaurantId,
      );

      return res.status(201).json(category);
    } catch (error: unknown) {
      return res.status(400).json({
        error:
          error instanceof Error ? error.message : "Erro ao criar categoria",
      });
    }
  }
}

export default new CreateCategoryController();
