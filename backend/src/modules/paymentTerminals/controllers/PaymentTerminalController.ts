import type { Request, Response } from 'express';
import paymentTerminalService from '../services/PaymentTerminalService.js';

function restaurantIdFrom(req: Request) {
  return Number(req.user?.restaurantId || 0);
}

function userIdFrom(req: Request) {
  return Number(req.user?.id || 0);
}

class PaymentTerminalController {
  async list(req: Request, res: Response) {
    try {
      const restaurantId = restaurantIdFrom(req);
      return res.json(await paymentTerminalService.list(restaurantId));
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Não foi possível listar as maquininhas.',
      });
    }
  }

  async syncMercadoPago(req: Request, res: Response) {
    try {
      const restaurantId = restaurantIdFrom(req);
      return res.json(await paymentTerminalService.syncMercadoPago(restaurantId));
    } catch (error: unknown) {
      return res.status(400).json({
        error:
          error instanceof Error ? error.message : 'Não foi possível sincronizar as maquininhas.',
      });
    }
  }

  async assign(req: Request, res: Response) {
    try {
      const restaurantId = restaurantIdFrom(req);
      const adminUserId = userIdFrom(req);
      const courierId = req.body?.courierId == null ? null : Number(req.body.courierId);
      if (courierId !== null && (!Number.isInteger(courierId) || courierId <= 0)) {
        throw new Error('Motoqueiro inválido.');
      }
      const terminal = await paymentTerminalService.assign({
        restaurantId,
        terminalPublicId: String(req.params.publicId || ''),
        courierId,
        adminUserId,
      });
      return res.json(terminal);
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Não foi possível atribuir a maquininha.',
      });
    }
  }
}

export default new PaymentTerminalController();
