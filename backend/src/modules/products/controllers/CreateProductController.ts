import { Request, Response } from 'express';
import createProductService from '../services/CreateProductService.js';

function isPrismaInternalError(error: unknown) {
  if (!(error instanceof Error)) return false;
  return (
    /^PrismaClient/u.test(error.name) ||
    error.message.includes('Invalid `prisma.') ||
    /Unknown argument/u.test(error.message)
  );
}

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
        pricingMode,
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
          pricingMode,
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
      if (isPrismaInternalError(error)) {
        console.error('[CREATE_PRODUCT_INTERNAL_ERROR]', {
          requestId: req.requestId,
          errorName: error instanceof Error ? error.name : 'UnknownError',
        });
        return res.status(500).json({
          message: 'Não foi possível criar o produto neste momento. Tente novamente.',
          code: 'PRODUCT_CREATE_ERROR',
          requestId: req.requestId,
        });
      }

      return res.status(400).json({
        message: error instanceof Error ? error.message : 'Erro ao criar produto',
        requestId: req.requestId,
      });
    }
  }
}

export default new CreateProductController();
