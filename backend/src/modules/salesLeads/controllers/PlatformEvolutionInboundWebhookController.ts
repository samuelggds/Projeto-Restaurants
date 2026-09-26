import type { Request, Response } from 'express';
import { processPlatformEvolutionInbound } from '../services/CommercialWhatsappService.js';

class PlatformEvolutionInboundWebhookController {
  async handle(req: Request, res: Response) {
    try {
      const result = await processPlatformEvolutionInbound(
        req.params.instanceName,
        req.get('x-gastronexa-webhook-token'),
        req.body,
      );
      if (!result.accepted) return res.status(result.status).json({ ok: false });
      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error('[PLATFORM_EVOLUTION_WEBHOOK_ERROR]', {
        name: error instanceof Error ? error.name : 'UnknownError',
      });
      return res.status(500).json({ ok: false });
    }
  }
}

export default new PlatformEvolutionInboundWebhookController();
