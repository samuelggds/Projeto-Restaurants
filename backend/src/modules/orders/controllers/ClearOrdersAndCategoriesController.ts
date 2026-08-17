import { Request, Response } from 'express';
import clearOrdersAndCategoriesService from '../services/ClearOrdersAndCategoriesService.js';

class ClearOrdersAndCategoriesController {
  async handle(req: Request, res: Response) {
    try {
      const isEnabled =
        process.env.NODE_ENV !== 'production' &&
        String(process.env.ENABLE_DESTRUCTIVE_CLEANUP || 'false') === 'true';
      const confirmation = String(req.body?.confirmation || '').trim();

      if (!isEnabled) {
        return res.status(404).json({ error: 'Operação não disponível.' });
      }

      if (confirmation !== 'EXCLUIR TODOS OS PEDIDOS') {
        return res.status(400).json({
          error: 'Confirmação inválida. Informe "EXCLUIR TODOS OS PEDIDOS".',
        });
      }

      await clearOrdersAndCategoriesService.execute(req.user.restaurantId);

      return res.status(200).json({
        message: 'Pedidos e categorias excluídos com sucesso!',
      });
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Erro ao excluir pedidos e categorias',
      });
    }
  }
}

export default new ClearOrdersAndCategoriesController();
