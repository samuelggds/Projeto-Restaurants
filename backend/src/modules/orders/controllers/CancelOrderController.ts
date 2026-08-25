import { Request, Response } from 'express';
import cancelOrderService from '../services/CancelOrderService.js';
import { getPublicOrderCancellationErrorMessage } from '../services/CancelOrderWorkflowService.js';

class CancelOrderController {
  async handle(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { id: userId, restaurantId } = req.user;

      const order = await cancelOrderService.execute(id, userId, restaurantId);

      return res.json(order);
    } catch (error: unknown) {
      const publicMessage = getPublicOrderCancellationErrorMessage(
        error,
        'Não foi possível cancelar o pedido agora. Tente novamente ou contate o restaurante.',
      );
      if (publicMessage !== (error instanceof Error ? error.message : '')) {
        console.error('[CANCEL_ORDER_UNEXPECTED_ERROR]', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      return res.status(400).json({
        error: publicMessage,
      });
    }
  }
}

export default new CancelOrderController();
