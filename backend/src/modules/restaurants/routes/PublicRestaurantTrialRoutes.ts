import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { distributedRateLimitOptions } from '../../../middlewares/security/PostgresRateLimitStore.js';
import publicRestaurantTrialService, {
  trialActivationSchema,
  trialChallengeSchema,
  TrialSignupError,
} from '../services/PublicRestaurantTrialService.js';
import { getTrialSignupAvailability, TrialSignupUnavailableError } from '../services/trialSignupPolicy.js';

const router = Router();
const limiterOptions = {
  windowMs: 15 * 60_000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.' },
} as const;

function perEmailLimit(prefix: string, limit: number) {
  return rateLimit({
    ...distributedRateLimitOptions(prefix),
    ...limiterOptions,
    limit,
    keyGenerator: (req) => typeof req.body?.email === 'string'
      ? req.body.email.trim().toLowerCase().slice(0, 254) : 'invalid',
  });
}

router.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});
router.use(rateLimit({ ...distributedRateLimitOptions('restaurant-trials-ip'), ...limiterOptions, limit: 20 }));

router.get('/availability', async (_req, res) => res.json(await getTrialSignupAvailability()));

router.post('/challenge', perEmailLimit('restaurant-trial-email-sends', 3), async (req, res, next) => {
  const parsed = trialChallengeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Informe um e-mail válido.' });
  try {
    return res.json(await publicRestaurantTrialService.requestCode(parsed.data.email));
  } catch (error) {
    return next(error);
  }
});

router.post('/activate', perEmailLimit('restaurant-trial-email-attempts', 8), async (req, res, next) => {
  const parsed = trialActivationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  try {
    const { result, created } = await publicRestaurantTrialService.activate(parsed.data);
    return res.status(created ? 201 : 200).json(result);
  } catch (error) {
    return next(error);
  }
});

router.use(((error, _req, res, next) => {
  if (error instanceof TrialSignupUnavailableError) {
    return res.status(403).json({ error: error.message, code: 'TRIAL_SIGNUP_UNAVAILABLE' });
  }
  if (error instanceof TrialSignupError) return res.status(error.status).json({ error: error.message, code: error.code });
  return next(error);
}) satisfies import('express').ErrorRequestHandler);

export default router;
