import type { Request, Response } from 'express';
import pickupPaymentService from '../services/PickupPaymentService.js';

function orderIdFrom(req: Request) {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  return Number(raw || 0);
}

function operatorFrom(req: Request) {
  return {
    restaurantId: Number(req.user?.restaurantId || 0),
    role: String(req.user?.role || ''),
    subRole: req.user?.subRole ? String(req.user.subRole) : null,
  };
}

class PickupPaymentController {
  async start(req: Request, res: Response) {
    try {
      const method = String(req.body?.method || '').toUpperCase();
      if (method !== 'PIX' && method !== 'CARTAO') {
        return res.status(400).json({ error: 'Escolha PIX ou cartão para pagamento automático.' });
      }
      const result = await pickupPaymentService.start({
        orderId: orderIdFrom(req),
        ...operatorFrom(req),
        method,
        terminalPublicId: req.body?.terminalPublicId ? String(req.body.terminalPublicId) : null,
      });
      return res.status(200).json(result);
    } catch (error: unknown) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Erro ao iniciar pagamento.' });
    }
  }

  async reconcile(req: Request, res: Response) {
    try {
      const result = await pickupPaymentService.reconcile({
        orderId: orderIdFrom(req),
        ...operatorFrom(req),
      });
      return res.status(200).json(result);
    } catch (error: unknown) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Erro ao consultar pagamento.' });
    }
  }

  async cash(req: Request, res: Response) {
    try {
      const order = await pickupPaymentService.confirmCash({
        orderId: orderIdFrom(req),
        ...operatorFrom(req),
      });
      return res.status(200).json(order);
    } catch (error: unknown) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Erro ao confirmar dinheiro.' });
    }
  }
}

export default new PickupPaymentController();
