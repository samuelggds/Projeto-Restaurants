import type { Request, Response } from 'express';
import paymentTerminalService from '../services/PaymentTerminalService.js';

function restaurantIdFrom(req: Request) {
  return Number(req.user?.restaurantId || 0);
}

function actorFrom(req: Request) {
  return {
    userId: Number(req.user?.id || 0),
    role: String(req.user?.role || ''),
  };
}

class DeliveryPaymentController {
  async get(req: Request, res: Response) {
    try {
      const payment = await paymentTerminalService.getOrderDeliveryPaymentForActor(
        Number(req.params.id),
        restaurantIdFrom(req),
        actorFrom(req),
      );
      return res.json({ payment });
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Não foi possível consultar o pagamento.',
      });
    }
  }

  async reconcilePix(req: Request, res: Response) {
    const restaurantId = restaurantIdFrom(req);
    const orderId = Number(req.params.id);
    const actor = actorFrom(req);
    try {
      const payment = await paymentTerminalService.reconcilePixForActor(
        orderId,
        restaurantId,
        actor,
      );
      return res.json({ payment });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Não foi possível consultar o Pix.';
      if (message.toLowerCase().includes('ainda não foi aprovado')) {
        const payment = await paymentTerminalService.getOrderDeliveryPaymentForActor(
          orderId,
          restaurantId,
          actor,
        );
        return res.json({ payment, pending: true });
      }
      return res.status(400).json({ error: message });
    }
  }

  async reconcileCard(req: Request, res: Response) {
    try {
      const payment = await paymentTerminalService.reconcilePointOrderForActor(
        Number(req.params.id),
        restaurantIdFrom(req),
        actorFrom(req),
      );
      return res.json({ payment });
    } catch (error: unknown) {
      return res.status(400).json({
        error:
          error instanceof Error ? error.message : 'Não foi possível consultar a maquininha.',
      });
    }
  }
}

export default new DeliveryPaymentController();
