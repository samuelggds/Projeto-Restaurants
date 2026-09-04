import type { Request, Response } from 'express';
import paymentTerminalService from '../services/PaymentTerminalService.js';

function restaurantIdFrom(req: Request) {
  return Number(req.user?.restaurantId || 0);
}

function userIdFrom(req: Request) {
  return Number(req.user?.id || 0);
}

class DeliveryPaymentController {
  async get(req: Request, res: Response) {
    try {
      const restaurantId = restaurantIdFrom(req);
      const courierId = String(req.user?.role || '').toUpperCase() === 'MOTOQUEIRO' ? userIdFrom(req) : null;
      const payment = await paymentTerminalService.getOrderDeliveryPayment(
        Number(req.params.id),
        restaurantId,
        courierId,
      );
      return res.json({ payment });
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Não foi possível consultar o pagamento.',
      });
    }
  }

  async reconcilePix(req: Request, res: Response) {
    try {
      const restaurantId = restaurantIdFrom(req);
      const payment = await paymentTerminalService.reconcilePix(Number(req.params.id), restaurantId);
      return res.json({ payment });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Não foi possível consultar o Pix.';
      const pending = message.toLowerCase().includes('ainda não foi aprovado');
      return res.status(pending ? 202 : 400).json({ error: message });
    }
  }
}

export default new DeliveryPaymentController();
