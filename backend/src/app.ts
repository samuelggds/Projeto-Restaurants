import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import routes from './routes/index.js';
import billingRoutes from './modules/billing/routes/BillingRoutes.js';
import { requestIdMiddleware } from './middlewares/security/requestIdMiddleware.js';
import { notFoundMiddleware } from './middlewares/security/notFoundMiddleware.js';
import { errorHandlerMiddleware } from './middlewares/security/errorHandlerMiddleware.js';

const app = express();

const isProduction = process.env.NODE_ENV === 'production';
const normalizeOrigin = (value: string) => value.trim().replace(/\/+$/, '');
const allowedOrigins = [process.env.CORS_ORIGINS || '', process.env.FRONTEND_URL || '']
  .flatMap((value) => value.split(','))
  .map((origin) => normalizeOrigin(origin))
  .filter(Boolean);
const rateLimitWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
const rateLimitMax = Number(process.env.RATE_LIMIT_MAX_REQUESTS || 300);

const globalRateLimit = rateLimit({
  windowMs: rateLimitWindowMs,
  max: rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Muitas requisicoes. Tente novamente em instantes.',
  },
});

const authRateLimit = rateLimit({
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || 50),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Muitas tentativas de autenticacao. Aguarde alguns minutos.',
  },
});

app.set('trust proxy', 1);
app.use(requestIdMiddleware);
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);
app.use(globalRateLimit);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const normalizedOrigin = normalizeOrigin(origin);

      if (!isProduction || allowedOrigins.includes(normalizedOrigin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }),
);

// Stripe signature verification requires the exact raw request body.
app.use('/orders/webhook/stripe', express.raw({ type: 'application/json' }));

// Parse JSON for all routes
app.use(express.json({ limit: process.env.MAX_JSON_BODY_SIZE || '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => {
  return res.status(200).json({
    status: 'ok',
    service: 'pizza-ia-backend',
    timestamp: new Date().toISOString(),
  });
});

app.use('/auth', authRateLimit);

// Billing routes (require JSON body parsing)
app.use('/billing', billingRoutes);

app.use(routes);
app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

export default app;
