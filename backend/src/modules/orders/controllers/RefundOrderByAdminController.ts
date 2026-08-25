import { Request, Response } from 'express';
import refundOrderByAdminService from '../services/RefundOrderByAdminService.js';
import { getPublicOrderCancellationErrorMessage } from '../services/CancelOrderWorkflowService.js';

class RefundOrderByAdminController {
  async handle(req: Request, res: Response) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { restaurantId, id: adminUserId } = req.user;

      const result = await refundOrderByAdminService.execute({
        orderId: id,
        restaurantId,
        adminUserId,
      });

      return res.status(200).json(result);
    } catch (error: unknown) {
      const publicMessage = getPublicOrderCancellationErrorMessage(
        error,
        'Não foi possível cancelar e estornar este pedido agora. Tente novamente ou contate o suporte.',
      );
      if (publicMessage !== (error instanceof Error ? error.message : '')) {
        console.error('[REFUND_ORDER_ADMIN_UNEXPECTED_ERROR]', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      return res.status(400).json({
        error: publicMessage,
      });
    }
  }
}

export default new RefundOrderByAdminController();
