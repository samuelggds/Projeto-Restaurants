import type { Request, Response } from 'express';
import deleteProductDiscountService from '../services/DeleteProductDiscountService.js';

class DeleteProductDiscountController {
  async handle(req: Request, res: Response) {
    try {
      const result = await deleteProductDiscountService.execute(
        Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
        req.user.restaurantId,
      );
      return res.status(200).json(result);
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Não foi possível remover o desconto.',
      });
    }
  }
}

export default new DeleteProductDiscountController();
