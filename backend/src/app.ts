import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import routes from './routes/index.js';
import billingRoutes from './modules/billing/routes/BillingRoutes.js';
import { requestIdMiddleware } from './middlewares/security/requestIdMiddleware.js';
import { notFoundMiddleware } from './middlewares/security/notFoundMiddleware.js';
import { errorHandlerMiddleware } from './middlewares/security/errorHandlerMiddleware.js';
import { applyCorsAndGlobalRateLimit } from './middlewares/security/httpAccessProtection.js';
import { probeDatabaseReadiness } from './health/readiness.js';

const app = express();

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

// Liveness e readiness ficam fora do rate limit para o orquestrador nao derrubar
// uma instancia saudavel durante picos de pedidos ou rastreamento.
app.get('/health', (_req, res) => {
  return res.status(200).json({
    status: 'ok',
    service: 'pizza-ia-backend',
    timestamp: new Date().toISOString(),
  });
});

app.get('/ready', async (_req, res) => {
  const database = await probeDatabaseReadiness();
  return res.status(database.ready ? 200 : 503).json({
    status: database.ready ? 'ready' : 'unavailable',
    database: database.ready ? 'ok' : 'unavailable',
    timestamp: new Date().toISOString(),
  });
});

applyCorsAndGlobalRateLimit(app);

// Stripe signature verification requires the exact raw request body.
app.use('/orders/webhook/stripe', express.raw({ type: 'application/json' }));

// Parse JSON for all routes
app.use(express.json({ limit: process.env.MAX_JSON_BODY_SIZE || '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/auth', authRateLimit);

// Billing routes (require JSON body parsing)
app.use('/billing', billingRoutes);

app.use(routes);
app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

export default app;
