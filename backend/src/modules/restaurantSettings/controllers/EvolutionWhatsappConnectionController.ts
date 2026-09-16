import type { Request, Response } from 'express';
import {
  createTenantEvolutionConnection,
  disconnectTenantEvolutionConnection,
  getTenantEvolutionConnection,
  getTenantEvolutionQrCode,
  refreshTenantEvolutionConnection,
} from '../../../services/evolutionTenantWhatsapp.js';

function restaurantIdFromRequest(req: Request) {
  const restaurantId = Number(req.user?.restaurantId || 0);
  if (!Number.isSafeInteger(restaurantId) || restaurantId <= 0) {
    throw new Error('Restaurante autenticado inválido.');
  }
  return restaurantId;
}

function userFacingError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Não foi possível configurar o WhatsApp.';
  if (/EVOLUTION_API_(URL|KEY)/u.test(message)) {
    return 'A conexão automática do WhatsApp ainda não foi configurada no servidor.';
  }
  return message;
}

class EvolutionWhatsappConnectionController {
  async status(req: Request, res: Response) {
    try {
      return res.json(await getTenantEvolutionConnection(restaurantIdFromRequest(req)));
    } catch (error) {
      return res.status(400).json({ error: userFacingError(error) });
    }
  }

  async create(req: Request, res: Response) {
    try {
      return res.status(201).json(await createTenantEvolutionConnection(restaurantIdFromRequest(req)));
    } catch (error) {
      return res.status(400).json({ error: userFacingError(error) });
    }
  }

  async qrCode(req: Request, res: Response) {
    try {
      return res.json(await getTenantEvolutionQrCode(restaurantIdFromRequest(req)));
    } catch (error) {
      return res.status(400).json({ error: userFacingError(error) });
    }
  }

  async refresh(req: Request, res: Response) {
    try {
      return res.json(await refreshTenantEvolutionConnection(restaurantIdFromRequest(req)));
    } catch (error) {
      return res.status(400).json({ error: userFacingError(error) });
    }
  }

  async disconnect(req: Request, res: Response) {
    try {
      return res.json(await disconnectTenantEvolutionConnection(restaurantIdFromRequest(req)));
    } catch (error) {
      return res.status(400).json({ error: userFacingError(error) });
    }
  }
}

export default new EvolutionWhatsappConnectionController();
