import { Request, Response } from 'express';
import reorderCategoryService from '../services/ReorderCategoryService.js';

class ReorderCategoryController {
  async handle(req: Request, res: Response) {
    try {
      const categories = await reorderCategoryService.execute(
        req.body,
        req.user.restaurantId,
      );
      return res.status(200).json(categories);
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Erro ao ordenar categorias',
      });
    }
  }
}

export default new ReorderCategoryController();
