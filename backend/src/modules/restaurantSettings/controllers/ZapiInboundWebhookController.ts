import type { Request, Response } from 'express';
import { processTenantZapiInbound } from '../../../services/zapiTenantWhatsapp.js';

class ZapiInboundWebhookController {
  async handle(req: Request, res: Response) {
    try {
      const result = await processTenantZapiInbound(
        req.params.instanceId,
        req.query.token,
        req.body,
      );
      if (!result.accepted) return res.status(result.status).json({ ok: false });
      return res.status(200).json({ ok: true, ...result });
    } catch (error) {
      console.error('[ZAPI_INBOUND_WEBHOOK_ERROR]', {
        name: error instanceof Error ? error.name : 'UnknownError',
      });
      return res.status(500).json({ error: 'Falha temporária ao processar o WhatsApp.' });
    }
  }
}

export default new ZapiInboundWebhookController();
