import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { distributedRateLimitOptions } from './middlewares/security/PostgresRateLimitStore.js';
import { runtimeRealtimeReady } from './runtime/runtimeReadiness.js';

import routes from './routes/index.js';
import billingRoutes from './modules/billing/routes/BillingRoutes.js';
import { requestIdMiddleware } from './middlewares/security/requestIdMiddleware.js';
import { notFoundMiddleware } from './middlewares/security/notFoundMiddleware.js';
import { errorHandlerMiddleware } from './middlewares/security/errorHandlerMiddleware.js';
import { applyCorsAndGlobalRateLimit } from './middlewares/security/httpAccessProtection.js';
import { probeDatabaseReadiness } from './health/readiness.js';
import {
  platformMaintenanceMiddleware,
  platformStatusHandler,
} from './middlewares/platformMaintenanceMiddleware.js';
import platformPlanCatalogService from './modules/billing/services/PlatformPlanCatalogService.js';

const app = express();

const authRateLimit = rateLimit({
  ...distributedRateLimitOptions('auth-global'),
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

app.get('/health', (_req, res) => {
  return res.status(200).json({
    status: 'ok',
    service: 'pizza-ia-backend',
    timestamp: new Date().toISOString(),
  });
});

app.get('/ready', async (_req, res) => {
  const database = await probeDatabaseReadiness();
  const realtimeReady = runtimeRealtimeReady();
  return res.status(database.ready && realtimeReady ? 200 : 503).json({
    status: database.ready && realtimeReady ? 'ready' : 'unavailable',
    database: database.ready ? 'ok' : 'unavailable',
    realtime: realtimeReady ? 'ok' : 'unavailable',
    timestamp: new Date().toISOString(),
  });
});

applyCorsAndGlobalRateLimit(app);

app.get('/platform/status', platformStatusHandler);
app.get('/platform/plans', async (_req, res) => {
  try {
    const plans = await platformPlanCatalogService.list({ activeOnly: true });
    return res.status(200).json({
      plans: plans.map((plan) => ({
        code: plan.plan,
        name: plan.name,
        description: plan.description,
        monthlyFee: plan.monthlyFee,
        trialDays: plan.trialDays,
        features: plan.features,
        featured: plan.featured,
      })),
    });
  } catch {
    return res.status(503).json({ error: 'Planos temporariamente indisponíveis.' });
  }
});

app.use((_req, res, next) => {
  if (!runtimeRealtimeReady()) {
    return res
      .status(503)
      .json({ error: 'Serviço temporariamente indisponível. Tente novamente.' });
  }
  return next();
});

app.use(platformMaintenanceMiddleware);

app.use('/orders/webhook/stripe', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: process.env.MAX_JSON_BODY_SIZE || '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/auth', authRateLimit);
app.use('/billing', billingRoutes);

app.use(routes);
app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

export default app;
