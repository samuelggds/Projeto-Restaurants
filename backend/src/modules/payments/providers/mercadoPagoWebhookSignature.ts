import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';

// Uma entrada por aplicação MP ativa (incluindo segredo anterior durante rotação).
// A consulta autenticada ao provedor ainda valida o tenant e a evidência financeira.
export function mercadoPagoWebhookSecrets(env = process.env): string[] {
  const primary = String(env.MP_WEBHOOK_SECRET || '').trim();
  const extra = String(env.MP_WEBHOOK_SECRETS || '').trim();
  const parsed: unknown = extra ? JSON.parse(extra) : [];
  if (!Array.isArray(parsed) || parsed.length > 20 || parsed.some((value) => typeof value !== 'string' || !value.trim())) {
    throw new Error('MP_WEBHOOK_SECRETS deve ser uma lista JSON de até 20 segredos não vazios.');
  }
  return [...new Set([primary, ...parsed.map((value: string) => value.trim())].filter(Boolean))];
}

function scalar(value: unknown) {
  return typeof value === 'string' || (typeof value === 'number' && Number.isSafeInteger(value))
    ? String(value).trim() : '';
}

export function verifyMercadoPagoSignature(req: Pick<Request, 'headers' | 'query' | 'body'>, secrets: string[]) {
  const signature = scalar(req.headers?.['x-signature']);
  const requestId = scalar(req.headers?.['x-request-id']);
  const dataId = scalar(req.query?.['data.id']);
  if (!signature || !requestId || !dataId || !secrets.length) return null;
  if (!/^[a-zA-Z0-9_-]{1,200}$/u.test(dataId) || !/^[a-zA-Z0-9_-]{1,200}$/u.test(requestId)) return null;
  const parts = signature.split(',').map((part) => part.trim().split('='));
  if (parts.length !== 2 || parts.some((part) => part.length !== 2)) return null;
  const timestamps = parts.filter(([key]) => key === 'ts');
  const hashes = parts.filter(([key]) => key === 'v1');
  if (timestamps.length !== 1 || hashes.length !== 1) return null;
  const ts = timestamps[0][1];
  const hash = hashes[0][1];
  if (!/^\d{10,13}$/u.test(ts) || !/^[a-fA-F0-9]{64}$/u.test(hash)) return null;
  const bodyId = scalar(req.body?.data?.id);
  // Processar exatamente o recurso autenticado na URL; body.id é o ID do evento.
  if (bodyId && bodyId.toLowerCase() !== dataId.toLowerCase()) return null;
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const received = Buffer.from(hash, 'hex');
  const valid = secrets.reduce((matched, secret) => {
    const expected = createHmac('sha256', secret).update(manifest).digest();
    return timingSafeEqual(received, expected) || matched;
  }, false);
  return valid ? dataId : null;
}

export function authenticateMercadoPagoWebhook(req: Request, res: Response): string | null {
  let secrets: string[];
  try {
    secrets = mercadoPagoWebhookSecrets();
  } catch {
    res.status(503).json({ error: 'Webhook Mercado Pago indisponível.' });
    return null;
  }
  if (!secrets.length) {
    res.status(503).json({ error: 'Webhook Mercado Pago indisponível.' });
    return null;
  }
  const id = verifyMercadoPagoSignature(req, secrets);
  if (!id) res.status(401).json({ error: 'Assinatura do webhook inválida.' });
  return id;
}
