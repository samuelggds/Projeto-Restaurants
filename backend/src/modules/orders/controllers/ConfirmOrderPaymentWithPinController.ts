import { Request, Response } from 'express';
import confirmOrderPaymentWithPinService from '../services/ConfirmOrderPaymentWithPinService.js';

class ConfirmOrderPaymentWithPinController {
  async handle(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { pin } = req.body;
      const { restaurantId, role } = req.user;

      const updatedOrder = await confirmOrderPaymentWithPinService.execute(
        id,
        restaurantId,
        role,
        pin,
      );

      return res.status(200).json(updatedOrder);
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Erro ao confirmar pagamento com PIN',
      });
    }
  }
}

export default new ConfirmOrderPaymentWithPinController();
