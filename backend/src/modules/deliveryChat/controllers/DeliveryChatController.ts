import type { Request, Response } from 'express';
import deliveryChatService from '../services/DeliveryChatService.js';

function orderIdFrom(req: Request) {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  return Number(raw || 0);
}

function actorFrom(req: Request) {
  return {
    userId: Number(req.user?.id || 0) || null,
    role: String(req.user?.role || ''),
    restaurantId: Number(req.user?.restaurantId || 0) || null,
    guestPublicId: req.guestOrderTracking?.publicId || null,
  };
}

class DeliveryChatController {
  async get(req: Request, res: Response) {
    try {
      const result = await deliveryChatService.get(orderIdFrom(req), actorFrom(req));
      return res.status(200).json(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Não foi possível abrir a conversa.';
      const status = /não tem acesso|visitante|inválido/i.test(message) ? 403 : 400;
      return res.status(status).json({ error: message });
    }
  }

  async send(req: Request, res: Response) {
    try {
      const result = await deliveryChatService.send(
        orderIdFrom(req),
        actorFrom(req),
        req.body?.message,
      );
      return res.status(201).json(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Não foi possível enviar a mensagem.';
      const status = /não tem acesso|visitante|inválido/i.test(message) ? 403 : 400;
      return res.status(status).json({ error: message });
    }
  }
}

export default new DeliveryChatController();
