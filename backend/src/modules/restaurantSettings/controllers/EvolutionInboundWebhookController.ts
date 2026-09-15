import type { Request, Response } from 'express';
import { processTenantEvolutionInbound } from '../../../services/evolutionTenantWhatsapp.js';

class EvolutionInboundWebhookController {
  async handle(req: Request, res: Response) {
    try {
      const result = await processTenantEvolutionInbound(
        req.params.instanceName,
        req.get('x-gastronexa-webhook-token'),
        req.body,
      );
      if (!result.accepted) return res.status(result.status).json({ ok: false });
      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error('[EVOLUTION_WEBHOOK_ERROR]', {
        name: error instanceof Error ? error.name : 'UnknownError',
      });
      return res.status(500).json({ ok: false });
    }
  }
}

export default new EvolutionInboundWebhookController();
