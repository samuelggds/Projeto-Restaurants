import { timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import { processGupshupInboundGreeting } from '../../../services/gupshupInbound.js';

function safeTokenEquals(expected: string, received: string) {
  const left = Buffer.from(expected);
  const right = Buffer.from(received);
  return left.length === right.length && timingSafeEqual(left, right);
}

class GupshupInboundWebhookController {
  async handle(req: Request, res: Response) {
    const configuredToken = String(
      process.env.GUPSHUP_INBOUND_WEBHOOK_TOKEN || process.env.WHATSAPP_WEBHOOK_TOKEN || '',
    ).trim();
    if (process.env.NODE_ENV === 'production' && !configuredToken) {
      return res.status(503).json({ error: 'Webhook do WhatsApp ainda não configurado.' });
    }

    if (configuredToken) {
      const receivedToken = String(
        req.headers['x-gupshup-webhook-token'] || req.query.token || '',
      ).trim();
      if (!receivedToken || !safeTokenEquals(configuredToken, receivedToken)) {
        return res.status(401).json({ error: 'Webhook não autorizado.' });
      }
    }

    try {
      const result = await processGupshupInboundGreeting(req.body);
      return res.status(200).json({ ok: true, ...result });
    } catch (error) {
      console.error('[GUPSHUP_INBOUND_WEBHOOK_ERROR]', {
        name: error instanceof Error ? error.name : 'UnknownError',
      });
      return res.status(500).json({ error: 'Falha temporária ao processar o WhatsApp.' });
    }
  }
}

export default new GupshupInboundWebhookController();
