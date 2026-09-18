import { distributedRateLimitOptions } from './PostgresRateLimitStore.js';
import type { Request } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { createHash } from 'node:crypto';

function getOrderActorKey(req: Request) {
  const orderId = String(req.params.id || '')
    .trim()
    .slice(0, 32);
  const userId = String(req.user?.id || 'anonymous').slice(0, 32);
  const ip = ipKeyGenerator(String(req.ip || 'unknown').trim());

  return `${ip}:${userId}:${orderId || 'no-order'}`;
}

export const paymentPinAttemptRateLimitMiddleware = rateLimit({
  ...distributedRateLimitOptions('orderpayment:1'),
  windowMs: Number(process.env.PAYMENT_PIN_RATE_LIMIT_WINDOW_MS || 10 * 60 * 1000),
  max: Number(process.env.PAYMENT_PIN_RATE_LIMIT_MAX_REQUESTS || 8),
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: getOrderActorKey,
  message: {
    error: 'Muitas tentativas de PIN para este pedido. Aguarde alguns minutos.',
  },
});

export const paymentPinRequestRateLimitMiddleware = rateLimit({
  ...distributedRateLimitOptions('orderpayment:2'),
  windowMs: Number(process.env.PAYMENT_PIN_REQUEST_RATE_LIMIT_WINDOW_MS || 60 * 1000),
  max: Number(process.env.PAYMENT_PIN_REQUEST_RATE_LIMIT_MAX_REQUESTS || 3),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getOrderActorKey,
  message: {
    error: 'Muitas solicitações de PIN para este pedido. Aguarde um instante.',
  },
});

export const deliveryConfirmationAttemptRateLimitMiddleware = rateLimit({
  ...distributedRateLimitOptions('orderpayment:3'),
  windowMs: Number(process.env.DELIVERY_CODE_RATE_LIMIT_WINDOW_MS || 10 * 60 * 1000),
  max: Number(process.env.DELIVERY_CODE_RATE_LIMIT_MAX_REQUESTS || 5),
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: (req) => String(req.body?.status || '').toUpperCase() !== 'ENTREGUE',
  keyGenerator: getOrderActorKey,
  message: {
    error: 'Muitas tentativas de código de entrega. Aguarde alguns minutos e tente novamente.',
  },
});


function hashRateLimitValue(value: unknown) {
  return createHash('sha256').update(String(value || '')).digest('hex').slice(0, 24);
}

function getOnlineCheckoutActorKey(req: Request) {
  const ip = ipKeyGenerator(String(req.ip || 'unknown').trim());
  const restaurantId = Number(
    req.tableSession?.restaurantId || req.user?.restaurantId || req.body?.restaurantId || 0,
  );
  const participantId = Number(req.tableParticipant?.id || 0);
  const userId = Number(req.user?.id || 0);
  const phone = String(req.body?.customerPhone || '').replace(/\D/g, '');
  const session = String(req.headers['x-order-session'] || '');

  const actor =
    participantId > 0
      ? `participant:${participantId}`
      : userId > 0
        ? `user:${userId}`
        : phone
          ? `phone:${hashRateLimitValue(phone)}`
          : `session:${hashRateLimitValue(session || 'anonymous')}`;

  return `${restaurantId || 'no-restaurant'}:${actor}:${ip}`;
}

export const onlineCheckoutRateLimitMiddleware = rateLimit({
  ...distributedRateLimitOptions('orderpayment:4'),
  windowMs: Number(process.env.ONLINE_CHECKOUT_RATE_LIMIT_WINDOW_MS || 10 * 60 * 1000),
  max: Number(process.env.ONLINE_CHECKOUT_RATE_LIMIT_MAX_REQUESTS || 5),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => String(req.user?.role || 'CLIENTE').toUpperCase() !== 'CLIENTE',
  keyGenerator: getOnlineCheckoutActorKey,
  message: {
    error: 'Muitas tentativas de pagamento em pouco tempo. Aguarde alguns minutos e tente novamente.',
    code: 'ONLINE_CHECKOUT_RATE_LIMITED',
  },
});
