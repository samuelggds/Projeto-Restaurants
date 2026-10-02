import type { Request, Response } from 'express';
import {
  createTenantEvolutionConnection,
  disconnectTenantEvolutionConnection,
  getTenantEvolutionConnection,
  getTenantEvolutionQrCode,
  refreshTenantEvolutionConnection,
  EvolutionRequestError,
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
  if (error instanceof EvolutionRequestError) {
    return 'Não foi possível comunicar com o serviço de conexão do WhatsApp. Tente novamente em instantes.';
  }
  return message;
}

function logConnectionFailure(req: Request, action: string, error: unknown) {
  console.warn('[EVOLUTION_WHATSAPP_CONNECTION_FAILED]', {
    requestId: req.requestId,
    restaurantId: Number(req.user?.restaurantId || 0) || null,
    action,
    errorType: error instanceof Error ? error.name : typeof error,
    upstreamStatus: error instanceof EvolutionRequestError ? error.status : null,
    upstreamOperation: error instanceof EvolutionRequestError ? error.operation : null,
  });
}

class EvolutionWhatsappConnectionController {
  async status(req: Request, res: Response) {
    try {
      return res.json(await getTenantEvolutionConnection(restaurantIdFromRequest(req)));
    } catch (error) {
      logConnectionFailure(req, 'status', error);
      return res.status(400).json({ error: userFacingError(error) });
    }
  }

  async create(req: Request, res: Response) {
    try {
      return res.status(201).json(await createTenantEvolutionConnection(restaurantIdFromRequest(req)));
    } catch (error) {
      logConnectionFailure(req, 'create', error);
      return res.status(400).json({ error: userFacingError(error) });
    }
  }

  async qrCode(req: Request, res: Response) {
    try {
      return res.json(await getTenantEvolutionQrCode(restaurantIdFromRequest(req)));
    } catch (error) {
      logConnectionFailure(req, 'qrCode', error);
      return res.status(400).json({ error: userFacingError(error) });
    }
  }

  async refresh(req: Request, res: Response) {
    try {
      return res.json(await refreshTenantEvolutionConnection(restaurantIdFromRequest(req)));
    } catch (error) {
      logConnectionFailure(req, 'refresh', error);
      return res.status(400).json({ error: userFacingError(error) });
    }
  }

  async disconnect(req: Request, res: Response) {
    try {
      return res.json(await disconnectTenantEvolutionConnection(restaurantIdFromRequest(req)));
    } catch (error) {
      logConnectionFailure(req, 'disconnect', error);
      return res.status(400).json({ error: userFacingError(error) });
    }
  }
}

export default new EvolutionWhatsappConnectionController();
