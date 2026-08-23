import type { Request, Response } from 'express';
import upsertProductDiscountService from '../services/UpsertProductDiscountService.js';

class UpsertProductDiscountController {
  async handle(req: Request, res: Response) {
    try {
      const discount = await upsertProductDiscountService.execute({
        productId: Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
        restaurantId: req.user.restaurantId,
        input: req.body,
      });
      return res.status(200).json(discount);
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Não foi possível salvar o desconto.',
      });
    }
  }
}

export default new UpsertProductDiscountController();

