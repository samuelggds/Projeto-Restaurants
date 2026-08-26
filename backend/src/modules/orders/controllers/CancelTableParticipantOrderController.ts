import type { Request, Response } from 'express';
import cancelTableParticipantOrderService from '../services/CancelTableParticipantOrderService.js';
import { getPublicOrderCancellationErrorMessage } from '../services/CancelOrderWorkflowService.js';

class CancelTableParticipantOrderController {
  async handle(req: Request, res: Response) {
    try {
      const order = await cancelTableParticipantOrderService.execute({
        publicOrderId: req.params.publicOrderId,
        tableSessionId: req.tableSession.id,
        restaurantId: req.tableSession.restaurantId,
        participantId: req.tableParticipant.id,
      });

      return res.status(200).json({
        order: {
          publicId: order.publicId,
          status: order.status,
          paid: order.paid,
          refundStatus: order.refundStatus,
          updatedAt: order.updatedAt,
        },
      });
    } catch (error: unknown) {
      return res.status(400).json({
        error: getPublicOrderCancellationErrorMessage(
          error,
          'Não foi possível cancelar o pedido agora. Tente novamente ou chame o garçom.',
        ),
      });
    }
  }
}

export default new CancelTableParticipantOrderController();
