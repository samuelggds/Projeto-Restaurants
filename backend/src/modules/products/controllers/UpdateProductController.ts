import { Request, Response } from 'express';
import updateProductService from '../services/UpdateProductService.js';

class UpdateProductController {
  async handle(req: Request, res: Response) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const data = req.body;

      const updatedProduct = await updateProductService.execute(id, data, req.user.restaurantId);

      return res.status(200).json(updatedProduct);
    } catch (error: unknown) {
      return res.status(400).json({
        message: error instanceof Error ? error.message : 'Erro ao atualizar produto',
      });
    }
  }
}

export default new UpdateProductController();
