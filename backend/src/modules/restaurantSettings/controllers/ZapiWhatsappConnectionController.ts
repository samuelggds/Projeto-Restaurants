import type { Request, Response } from 'express';
import {
  createTenantZapiConnection,
  disconnectTenantZapiConnection,
  getTenantZapiConnection,
  getTenantZapiQrCode,
  linkExistingTenantZapiConnection,
  refreshTenantZapiConnection,
} from '../../../services/zapiTenantWhatsapp.js';

function restaurantIdFromRequest(req: Request) {
  const restaurantId = Number(req.user?.restaurantId || 0);
  if (!Number.isSafeInteger(restaurantId) || restaurantId <= 0) {
    throw new Error('Restaurante autenticado inválido.');
  }
  return restaurantId;
}

function userFacingError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Não foi possível configurar o WhatsApp.';
  if (/ZAPI_PARTNER_TOKEN/u.test(message)) {
    return 'A criação automática da conexão ainda não foi habilitada no servidor.';
  }
  return message;
}

class ZapiWhatsappConnectionController {
  async status(req: Request, res: Response) {
    try {
      return res.json(await getTenantZapiConnection(restaurantIdFromRequest(req)));
    } catch (error) {
      return res.status(400).json({ error: userFacingError(error) });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const result = await createTenantZapiConnection(restaurantIdFromRequest(req));
      return res.status(201).json(result);
    } catch (error) {
      return res.status(400).json({ error: userFacingError(error) });
    }
  }

  async link(req: Request, res: Response) {
    try {
      const result = await linkExistingTenantZapiConnection(restaurantIdFromRequest(req), {
        instanceId: req.body?.instanceId,
        token: req.body?.token,
      });
      return res.status(200).json(result);
    } catch (error) {
      return res.status(400).json({ error: userFacingError(error) });
    }
  }

  async qrCode(req: Request, res: Response) {
    try {
      return res.json(await getTenantZapiQrCode(restaurantIdFromRequest(req)));
    } catch (error) {
      return res.status(400).json({ error: userFacingError(error) });
    }
  }

  async refresh(req: Request, res: Response) {
    try {
      return res.json(await refreshTenantZapiConnection(restaurantIdFromRequest(req)));
    } catch (error) {
      return res.status(400).json({ error: userFacingError(error) });
    }
  }

  async disconnect(req: Request, res: Response) {
    try {
      return res.json(await disconnectTenantZapiConnection(restaurantIdFromRequest(req)));
    } catch (error) {
      return res.status(400).json({ error: userFacingError(error) });
    }
  }
}

export default new ZapiWhatsappConnectionController();
