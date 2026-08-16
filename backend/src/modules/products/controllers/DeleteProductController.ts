import { Request, Response } from 'express';
import deleteProductService from '../services/DeleteProductService.js';

class DeleteProductController {
  async handle(req: Request, res: Response) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      await deleteProductService.execute(id, req.user.restaurantId);

      return res.status(200).json({
        message: 'Produto deletado com sucesso!',
      });
    } catch (error: unknown) {
      return res.status(400).json({
        message: error instanceof Error ? error.message : 'Erro ao deletar produto',
      });
    }
  }
}

export default new DeleteProductController();
