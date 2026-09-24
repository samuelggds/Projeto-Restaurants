import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import prisma from '../../../config/prisma.js';
import { withTenantDbContext } from '../../../database/tenantDbContext.js';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import restaurantSettingsRepository from '../../restaurantSettings/repositories/RestaurantSettingsRepository.js';
import { normalizeStoredCardBrand } from '../domain/cardBrand.js';
import { toPublicPaymentMethod } from '../domain/paymentMethodSecurity.js';
import { getMercadoPagoAccessToken } from '../../restaurantSettings/services/RestaurantPaymentCredentialsService.js';

const router = Router();
router.use(authMiddleware);
const restaurantSchema = z.coerce.number().int().positive();
const createSchema = z.object({
  restaurantId: restaurantSchema,
  encryptedCard: z.string().trim().min(80).max(8192).optional(),
  cardToken: z.string().trim().min(8).max(2048).optional(),
  cardData: z
    .object({
      number: z.string().regex(/^\d{13,19}$/),
      securityCode: z.string().regex(/^\d{3,4}$/),
    })
    .optional(),
  holderTaxId: z
    .string()
    .transform((value) => value.replace(/\D/g, ''))
    .refine((value) => [11, 14].includes(value.length))
    .optional(),
  brand: z
    .string()
    .trim()
    .min(2)
    .max(20)
    .transform((value) => value.toLowerCase())
    .optional(),
  last4: z.string().regex(/^\d{4}$/).optional(),
  expMonth: z.coerce.number().int().min(1).max(12).optional(),
  expYear: z.coerce
    .number()
    .int()
    .min(new Date().getFullYear())
    .max(new Date().getFullYear() + 30)
    .optional(),
  holderName: z.string().trim().min(2).max(60),
  isDefault: z.boolean().optional().default(false),
});

function customerId(req: Request, res: Response) {
  if (req.user?.role !== 'CLIENTE' || !req.user.id) {
    res.status(403).json({ error: 'Formas de pagamento são exclusivas para clientes.' });
    return null;
  }
  return Number(req.user.id);
}

async function validateActiveRestaurant(rawRestaurantId: unknown) {
  const parsed = restaurantSchema.safeParse(rawRestaurantId);
  if (!parsed.success) return null;
  const restaurant = await prisma.restaurant.findFirst({
    where: { id: parsed.data, active: true },
    select: { id: true },
  });
  return restaurant?.id || null;
}

function safeProviderError(body: Record<string, unknown>, fallback: string) {
  const errors = Array.isArray(body.error_messages)
    ? body.error_messages
    : Array.isArray(body.errors)
      ? body.errors
      : [];
  const first = errors[0] as { description?: unknown; message?: unknown } | undefined;
  return String(first?.description || first?.message || body.message || fallback)
    .replace(/\b\d{13,19}\b/g, '[cartão protegido]')
    .slice(0, 240);
}

async function providerJson(url: string, headers: Record<string, string>, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
  });
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok)
    throw new Error(safeProviderError(body, 'O provedor recusou a operação com o cartão.'));
  return body;
}

async function gatewayContext(restaurantId: number) {
  const settings = await restaurantSettingsRepository.findByRestaurantId(restaurantId);
  const provider = String(settings?.cardGateway || '')
    .trim()
    .toUpperCase();
  const fallback = process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK === 'true';
  if (provider === 'MERCADO_PAGO') {
    const token = await getMercadoPagoAccessToken(restaurantId);
    const publicKey = String(settings?.mercadoPagoPublicKey || '').trim();
    if (!publicKey) {
      throw new Error(
        'Mercado Pago desconectado ou incompleto. Reconecte este restaurante antes de cadastrar cartões.',
      );
    }
    return {
      provider,
      token,
      baseUrl: 'https://api.mercadopago.com',
      publicKey,
    };
  }
  if (provider === 'ASAAS') {
    if (process.env.ENABLE_FUTURE_PAYMENT_PROVIDERS !== 'true') {
      throw new Error(
        'Asaas temporariamente indisponível. A integração será liberada após o cadastro empresarial/CNPJ.',
      );
    }
    const token = String(
      settings?.asaasAccessToken || (fallback ? process.env.ASAAS_API_KEY : '') || '',
    ).trim();
    if (!token) throw new Error('O Asaas ainda não foi configurado para este restaurante.');
    return {
      provider,
      token,
      baseUrl: String(process.env.ASAAS_API_BASE_URL || 'https://api.asaas.com').replace(
        /\/+$/,
        '',
      ),
    };
  }
  throw new Error('No momento, apenas Mercado Pago está disponível para cadastrar cartões.');
}

async function mercadoPagoCustomer(
  baseUrl: string,
  token: string,
  user: { name: string; email: string },
) {
  const headers = { Authorization: `Bearer ${token}` };
  const found = await providerJson(
    `${baseUrl}/v1/customers/search?email=${encodeURIComponent(user.email)}`,
    headers,
  );
  const results = Array.isArray(found.results) ? found.results : [];
  const existing = String((results[0] as { id?: unknown } | undefined)?.id || '').trim();
  if (existing) return existing;
  const created = await providerJson(`${baseUrl}/v1/customers`, headers, {
    method: 'POST',
    body: JSON.stringify({ email: user.email, first_name: user.name }),
  });
  const id = String(created.id || '').trim();
  if (!id) throw new Error('O Mercado Pago não retornou o cliente protegido.');
  return id;
}

async function asaasCustomer(
  baseUrl: string,
  token: string,
  user: { name: string; email: string; cpf: string | null; phone: string | null },
  taxId?: string,
) {
  const headers = { access_token: token };
  const found = await providerJson(
    `${baseUrl}/v3/customers?email=${encodeURIComponent(user.email)}`,
    headers,
  );
  const data = Array.isArray(found.data) ? found.data : [];
  const existing = String((data[0] as { id?: unknown } | undefined)?.id || '').trim();
  if (existing) return existing;
  const cpfCnpj = String(taxId || user.cpf || '').replace(/\D/g, '');
  if (![11, 14].includes(cpfCnpj.length))
    throw new Error('Cadastre um CPF válido para proteger o cartão no Asaas.');
  const created = await providerJson(`${baseUrl}/v3/customers`, headers, {
    method: 'POST',
    body: JSON.stringify({
      name: user.name,
      email: user.email,
      cpfCnpj,
      mobilePhone: String(user.phone || '').replace(/\D/g, '') || undefined,
    }),
  });
  const id = String(created.id || '').trim();
  if (!id) throw new Error('O Asaas não retornou o cliente protegido.');
  return id;
}

router.get('/config', async (req, res): Promise<void> => {
  const userId = customerId(req, res);
  if (!userId) return;
  const parsed = restaurantSchema.safeParse(req.query.restaurantId);
  if (!parsed.success) {
    res.status(400).json({ error: 'Restaurante inválido.' });
    return;
  }
  try {
    const context = await gatewayContext(parsed.data);
    if (context.provider === 'MERCADO_PAGO') {
      res.json({ provider: context.provider, publicKey: context.publicKey });
      return;
    }
    res.json({ provider: context.provider });
  } catch (error) {
    res
      .status(400)
      .json({
        error: error instanceof Error ? error.message : 'Falha ao preparar o cadastro seguro.',
      });
  }
});

router.get('/', async (req, res): Promise<void> => {
  const userId = customerId(req, res);
  if (!userId) return;
  const restaurantId = await validateActiveRestaurant(req.query.restaurantId);
  if (!restaurantId) {
    res.status(400).json({ error: 'Restaurante inválido.' });
    return;
  }
  const methods = await withTenantDbContext(restaurantId, (db) =>
    db.customerPaymentMethod.findMany({
      where: { userId, restaurantId, active: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    }),
  );
  res.json({ paymentMethods: methods.map(toPublicPaymentMethod) });
});

router.post('/', async (req, res): Promise<void> => {
  const userId = customerId(req, res);
  if (!userId) return;
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Confira os dados do cartão e tente novamente.' });
    return;
  }
  try {
    const restaurantId = await validateActiveRestaurant(parsed.data.restaurantId);
    if (!restaurantId) throw new Error('Restaurante inválido.');
    const context = await gatewayContext(restaurantId);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        cpf: true,
        phone: true,
        addresses: { where: { isDefault: true }, take: 1 },
      },
    });
    if (!user) throw new Error('Cliente não encontrado.');
    let providerId = '';
    let providerCustomerId: string | null = null;
    let providerBrand = '';
    let providerLast4 = '';
    let providerExpMonth = 0;
    let providerExpYear = 0;
    if (context.provider === 'MERCADO_PAGO') {
      if (!parsed.data.cardToken) throw new Error('Token seguro do Mercado Pago não informado.');
      providerCustomerId = await mercadoPagoCustomer(context.baseUrl, context.token, user);
      const saved = await providerJson(
        `${context.baseUrl}/v1/customers/${encodeURIComponent(providerCustomerId)}/cards`,
        { Authorization: `Bearer ${context.token}` },
        { method: 'POST', body: JSON.stringify({ token: parsed.data.cardToken }) },
      );
      providerId = String(saved.id || '').trim();
      providerBrand = String(
        saved.payment_method_id || (saved.payment_method as { id?: unknown } | undefined)?.id || '',
      ).trim();
      providerLast4 = String(saved.last_four_digits || saved.last4 || '').replace(/\D/g, '').slice(-4);
      providerExpMonth = Number(saved.expiration_month || saved.exp_month || 0);
      providerExpYear = Number(saved.expiration_year || saved.exp_year || 0);
    } else {
      if (!parsed.data.cardData) throw new Error('Dados do cartão Asaas não informados.');
      providerCustomerId = await asaasCustomer(
        context.baseUrl,
        context.token,
        user,
        parsed.data.holderTaxId,
      );
      const address = user.addresses[0];
      const taxId = String(parsed.data.holderTaxId || user.cpf || '').replace(/\D/g, '');
      const postalCode = String(address?.zipCode || '').replace(/\D/g, '');
      const phone = String(user.phone || '').replace(/\D/g, '');
      if (postalCode.length !== 8 || !String(address?.number || '').trim() || phone.length < 10) {
        throw new Error(
          'Complete o endereço principal e o celular no perfil antes de salvar um cartão no Asaas.',
        );
      }
      const saved = await providerJson(
        `${context.baseUrl}/v3/creditCard/tokenizeCreditCard`,
        { access_token: context.token },
        {
          method: 'POST',
          body: JSON.stringify({
            customer: providerCustomerId,
            creditCard: {
              holderName: parsed.data.holderName,
              number: parsed.data.cardData.number,
              expiryMonth: String(parsed.data.expMonth).padStart(2, '0'),
              expiryYear: String(parsed.data.expYear),
              ccv: parsed.data.cardData.securityCode,
            },
            creditCardHolderInfo: {
              name: parsed.data.holderName,
              email: user.email,
              cpfCnpj: taxId,
              postalCode,
              addressNumber: address?.number,
              addressComplement: address?.complement || undefined,
              phone,
            },
            remoteIp: req.ip,
          }),
        },
      );
      providerId = String(saved.creditCardToken || saved.token || '').trim();
      providerBrand = String(saved.creditCardBrand || saved.brand || '').trim();
    }
    if (!providerId) throw new Error(`${context.provider} não retornou o token seguro do cartão.`);
    const resolvedBrand = providerBrand || parsed.data.brand || '';
    const resolvedLast4 = providerLast4 || parsed.data.last4 || '';
    const resolvedExpMonth = providerExpMonth || Number(parsed.data.expMonth || 0);
    const resolvedExpYear = providerExpYear || Number(parsed.data.expYear || 0);
    if (
      !resolvedBrand ||
      !/^\d{4}$/.test(resolvedLast4) ||
      !Number.isInteger(resolvedExpMonth) ||
      resolvedExpMonth < 1 ||
      resolvedExpMonth > 12 ||
      !Number.isInteger(resolvedExpYear) ||
      resolvedExpYear < new Date().getFullYear()
    ) {
      throw new Error('O provedor não retornou os dados necessários para salvar este cartão.');
    }
    const method = await withTenantDbContext(restaurantId, async (db) => {
      const uniquePaymentMethod = {
        userId,
        restaurantId,
        provider: context.provider,
        providerPaymentMethodId: providerId,
      };
      const existing = await db.customerPaymentMethod.findUnique({
        where: {
          userId_restaurantId_provider_providerPaymentMethodId: uniquePaymentMethod,
        },
      });
      const count = await db.customerPaymentMethod.count({
        where: { userId, restaurantId, active: true },
      });
      const makeDefault =
        parsed.data.isDefault || count === 0 || Boolean(existing?.active && existing.isDefault);

      if (makeDefault)
        await db.customerPaymentMethod.updateMany({
          where: { userId, restaurantId },
          data: { isDefault: false },
        });

      const paymentMethodData = {
        providerCustomerId,
        brand: normalizeStoredCardBrand(resolvedBrand),
        last4: resolvedLast4,
        expMonth: resolvedExpMonth,
        expYear: resolvedExpYear,
        holderName: parsed.data.holderName,
        isDefault: makeDefault,
        active: true,
      };

      return db.customerPaymentMethod.upsert({
        where: {
          userId_restaurantId_provider_providerPaymentMethodId: uniquePaymentMethod,
        },
        create: {
          ...uniquePaymentMethod,
          ...paymentMethodData,
        },
        update: paymentMethodData,
      });
    });
    res.status(201).json({ paymentMethod: toPublicPaymentMethod(method) });
  } catch (error) {
    res
      .status(400)
      .json({
        error: error instanceof Error ? error.message : 'Não foi possível cadastrar o cartão.',
      });
  }
});

router.put('/:publicId/default', async (req, res): Promise<void> => {
  const userId = customerId(req, res);
  if (!userId) return;
  const restaurantId = await validateActiveRestaurant(req.query.restaurantId);
  if (!restaurantId) {
    res.status(400).json({ error: 'Restaurante inválido.' });
    return;
  }
  const updated = await withTenantDbContext(restaurantId, async (db) => {
    const method = await db.customerPaymentMethod.findFirst({
      where: { publicId: req.params.publicId, userId, restaurantId, active: true },
    });
    if (!method) return null;
    await db.customerPaymentMethod.updateMany({
      where: { userId, restaurantId },
      data: { isDefault: false },
    });
    return db.customerPaymentMethod.update({
      where: { id: method.id, restaurantId },
      data: { isDefault: true },
    });
  });
  if (!updated) {
    res.status(404).json({ error: 'Cartão não encontrado.' });
    return;
  }
  res.json({ paymentMethod: toPublicPaymentMethod(updated) });
});

router.delete('/:publicId', async (req, res): Promise<void> => {
  const userId = customerId(req, res);
  if (!userId) return;
  const restaurantId = await validateActiveRestaurant(req.query.restaurantId);
  if (!restaurantId) {
    res.status(400).json({ error: 'Restaurante inválido.' });
    return;
  }
  const removed = await withTenantDbContext(restaurantId, async (db) => {
    const method = await db.customerPaymentMethod.findFirst({
      where: { publicId: req.params.publicId, userId, restaurantId, active: true },
    });
    if (!method) return false;
    await db.customerPaymentMethod.update({
      where: { id: method.id, restaurantId },
      data: { active: false, isDefault: false },
    });
    const fallback = await db.customerPaymentMethod.findFirst({
      where: { userId, restaurantId, active: true },
      orderBy: { createdAt: 'desc' },
    });
    if (fallback)
      await db.customerPaymentMethod.update({
        where: { id: fallback.id, restaurantId },
        data: { isDefault: true },
      });
    return true;
  });
  if (!removed) {
    res.status(404).json({ error: 'Cartão não encontrado.' });
    return;
  }
  res.status(204).send();
});

export default router;
