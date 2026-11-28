import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { getJwtSecret } from '../../../config/auth.js';
import prisma from '../../../config/prisma.js';
import { createSmtpTransporter } from '../../../services/smtpTransport.js';
import { strongPasswordSchema } from '../../../validators/PasswordValidator.js';
import { normalizedBrazilPhoneSchema } from '../../../validators/PhoneValidator.js';
import { createRestaurantSchema, restaurantCategorySchema } from '../../../validators/RestaurantValidator.js';
import adminPortalAccessService from '../../adminPortal/services/AdminPortalAccessService.js';
import { AVAILABLE_PLAN_TYPES } from '../../billing/config/planConfig.js';
import createRestaurantService, { TrialPlanChangedError } from './CreateRestaurantService.js';
import { ensureTrialSignupAvailable } from './trialSignupPolicy.js';

const emailSchema = z.string().trim().max(254).pipe(createRestaurantSchema.shape.admin.shape.email);
export const trialChallengeSchema = z.strictObject({ email: emailSchema });
export const trialActivationSchema = z.strictObject({
  email: emailSchema,
  challenge: z.string().min(40).max(1500),
  code: z.string().regex(/^\d{6}$/u, 'Informe o código de seis dígitos.'),
  restaurantName: createRestaurantSchema.shape.restaurant.shape.name,
  ownerName: createRestaurantSchema.shape.admin.shape.name,
  password: strongPasswordSchema,
  whatsapp: z.string().max(30).pipe(normalizedBrazilPhoneSchema),
  category: restaurantCategorySchema,
  plan: z.enum(AVAILABLE_PLAN_TYPES),
  quotedMonthlyFee: z.number().nonnegative(),
  quotedTrialDays: z.number().int().min(1).max(90),
});

const challengeAudience = 'gastronexa-restaurant-trial';
const expiresInMinutes = 15;

export class TrialSignupError extends Error {
  constructor(readonly status: number, message: string, readonly code?: string) {
    super(message);
  }
}

function secretFor(purpose: string) {
  const secret = getJwtSecret();
  if (!secret) throw new TrialSignupError(503, 'A ativação está temporariamente indisponível.');
  return createHmac('sha256', secret).update(`restaurant-trial:${purpose}`).digest();
}

function codeFor(challengeId: string) {
  const digest = createHmac('sha256', secretFor('email-code')).update(challengeId).digest();
  return String(digest.readUInt32BE(0) % 1_000_000).padStart(6, '0');
}

function verifiedChallengeId(email: string, challenge: string, code: string) {
  const secret = secretFor('challenge');
  let claims;
  try {
    claims = jwt.verify(challenge, secret, { audience: challengeAudience, algorithms: ['HS256'] });
  } catch {
    throw new TrialSignupError(400, 'Código inválido ou expirado. Confira o e-mail ou peça outro código.');
  }
  if (typeof claims === 'string' || claims.sub !== email || !claims.jti ||
      !timingSafeEqual(Buffer.from(code), Buffer.from(codeFor(claims.jti)))) {
    throw new TrialSignupError(400, 'Código inválido ou expirado. Confira o e-mail ou peça outro código.');
  }
  return claims.jti;
}

function activationResult(slug: string, key: string, trialEndsAt: Date) {
  return { adminPath: `/${slug}/admin/${key}`, menuPath: `/${slug}`, trialEndsAt: trialEndsAt.toISOString() };
}

async function previousActivation(email: string, key: string) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { email },
    select: { id: true, slug: true, subscription: { select: { trialEndsAt: true } } },
  });
  if (!restaurant) return null;
  if (restaurant.subscription?.trialEndsAt && await adminPortalAccessService.matchesCurrentKey(restaurant.id, key)) {
    return activationResult(restaurant.slug, key, restaurant.subscription.trialEndsAt);
  }
  throw new TrialSignupError(409, 'Este e-mail já está cadastrado. Acesse sua conta pelo link privado do restaurante.');
}

export class PublicRestaurantTrialService {
  async requestCode(email: string) {
    await ensureTrialSignupAvailable();
    const mailer = createSmtpTransporter();
    if (!mailer) throw new TrialSignupError(503, 'O envio de códigos está indisponível. Tente novamente em instantes.');
    const id = randomUUID();
    const challenge = jwt.sign({}, secretFor('challenge'), {
      algorithm: 'HS256', audience: challengeAudience, subject: email, jwtid: id,
      expiresIn: expiresInMinutes * 60,
    });
    try {
      await mailer.sendMail({
        from: process.env.ALERT_EMAIL_FROM || process.env.SMTP_USER,
        to: email,
        subject: 'Seu código para ativar o restaurante na GastroNexa',
        text: `Seu código de ativação é ${codeFor(id)}. Ele vale por ${expiresInMinutes} minutos. Se você não iniciou o cadastro, ignore esta mensagem.`,
      });
    } catch {
      throw new TrialSignupError(503, 'Não conseguimos enviar o código agora. Tente novamente.');
    }
    return { challenge, expiresInMinutes };
  }

  async activate(data: z.infer<typeof trialActivationSchema>) {
    const id = verifiedChallengeId(data.email, data.challenge, data.code);
    // This owner's verified challenge can recover its own committed response after a network failure.
    const key = createHmac('sha256', secretFor('owner-portal')).update(id).digest('base64url');
    const previous = await previousActivation(data.email, key);
    if (previous) return { result: previous, created: false };

    const stem = data.restaurantName.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
      .replace(/[^a-z0-9]+/gu, '-').slice(0, 48).replace(/^-+|-+$/gu, '') || 'restaurante';
    const slug = `${stem}-${id.slice(0, 8)}`;
    try {
      const account = await createRestaurantService.createVerifiedOwnerTrial({
        restaurant: {
          name: data.restaurantName, slug, email: data.email, category: data.category, whatsapp: data.whatsapp,
        },
        admin: { name: data.ownerName, email: data.email, password: data.password },
        plan: data.plan,
      }, { portalKey: key, quotedMonthlyFee: data.quotedMonthlyFee, quotedTrialDays: data.quotedTrialDays });
      return { created: true, result: activationResult(slug, key, account.trialEndsAt) };
    } catch (error) {
      const duplicate = (error instanceof Error && error.message.startsWith('Já existe')) ||
        (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002');
      if (duplicate) {
        const committed = await previousActivation(data.email, key);
        if (committed) return { created: false, result: committed };
        throw new TrialSignupError(409, 'O cadastro já está em uso. Verifique o e-mail informado.');
      }
      if (error instanceof TrialPlanChangedError ||
        (error instanceof Error && error.message === 'Plano inválido ou indisponível para novas assinaturas.')) {
        throw new TrialSignupError(409, 'O plano mudou. Confira as condições atualizadas antes de ativar.', 'TRIAL_PLAN_CHANGED');
      }
      throw error;
    }
  }
}

export default new PublicRestaurantTrialService();
