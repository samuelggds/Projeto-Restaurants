import { Request, Response } from 'express';
import createProductService from '../services/CreateProductService.js';

class CreateProductController {
  async handle(req: Request, res: Response) {
    try {
      const {
        name,
        description,
        image,
        price,
        categoryId,
        active,
        featured,
        preparationTime,
        stock,
        saleMode,
        optionGroups,
        compositionItems,
        portionConfiguration,
        templateId,
      } = req.body;

      const product = await createProductService.execute(
        {
          name,
          description,
          image,
          price,
          categoryId,
          active,
          featured,
          preparationTime,
          stock,
          saleMode,
          optionGroups,
          compositionItems,
          portionConfiguration,
          templateId,
        },
        req.user.restaurantId,
        {
          userId: Number(req.user.id || 0) || undefined,
          userName: req.user.email,
          userRole: req.user.role,
        },
      );

      return res.status(201).json(product);
    } catch (error: unknown) {
      return res.status(400).json({
        message: error instanceof Error ? error.message : 'Erro ao criar produto',
      });
    }
  }
}

export default new CreateProductController();
