import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import prisma from '../../../config/prisma.js';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import restaurantSettingsRepository from '../../restaurantSettings/repositories/RestaurantSettingsRepository.js';
import { normalizeStoredCardBrand } from '../domain/cardBrand.js';
import { toPublicPaymentMethod } from '../domain/paymentMethodSecurity.js';

const router = Router();
router.use(authMiddleware);
const restaurantSchema = z.coerce.number().int().positive();
const createSchema = z.object({
  restaurantId: restaurantSchema,
  encryptedCard: z.string().trim().min(80).max(8192).optional(),
  cardToken: z.string().trim().min(8).max(2048).optional(),
  cardData: z.object({ number: z.string().regex(/^\d{13,19}$/), securityCode: z.string().regex(/^\d{3,4}$/) }).optional(),
  holderTaxId: z.string().transform((value) => value.replace(/\D/g, '')).refine((value) => [11, 14].includes(value.length)).optional(),
  brand: z.string().trim().min(2).max(20).transform((value) => value.toLowerCase()),
  last4: z.string().regex(/^\d{4}$/),
  expMonth: z.coerce.number().int().min(1).max(12),
  expYear: z.coerce.number().int().min(new Date().getFullYear()).max(new Date().getFullYear() + 30),
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

function safeProviderError(body: Record<string, unknown>, fallback: string) {
  const errors = Array.isArray(body.error_messages) ? body.error_messages : Array.isArray(body.errors) ? body.errors : [];
  const first = errors[0] as { description?: unknown; message?: unknown } | undefined;
  return String(first?.description || first?.message || body.message || fallback)
    .replace(/\b\d{13,19}\b/g, '[cartão protegido]')
    .slice(0, 240);
}

async function providerJson(url: string, headers: Record<string, string>, init?: RequestInit) {
  const response = await fetch(url, { ...init, headers: { Accept: 'application/json', ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...headers } });
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) throw new Error(safeProviderError(body, 'O provedor recusou a operação com o cartão.'));
  return body;
}

async function gatewayContext(restaurantId: number) {
  const settings = await restaurantSettingsRepository.findByRestaurantId(restaurantId);
  const provider = String(settings?.cardGateway || '').trim().toUpperCase();
  const fallback = process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK === 'true';
  if (provider === 'PAGBANK') {
    const token = String(settings?.pagbankToken || (fallback ? process.env.PAGBANK_TOKEN : '') || '').trim();
    if (!token) throw new Error('O PagBank ainda não foi configurado para este restaurante.');
    return { provider, token, baseUrl: String(process.env.PAGBANK_API_BASE_URL || 'https://api.pagseguro.com').replace(/\/+$/, '') };
  }
  if (provider === 'MERCADO_PAGO') {
    const token = String(settings?.mercadoPagoAccessToken || (fallback ? process.env.MP_ACCESS_TOKEN : '') || '').trim();
    if (!token) throw new Error('O Mercado Pago ainda não foi configurado para este restaurante.');
    return { provider, token, baseUrl: 'https://api.mercadopago.com' };
  }
  if (provider === 'ASAAS') {
    const token = String(settings?.asaasAccessToken || (fallback ? process.env.ASAAS_API_KEY : '') || '').trim();
    if (!token) throw new Error('O Asaas ainda não foi configurado para este restaurante.');
    return { provider, token, baseUrl: String(process.env.ASAAS_API_BASE_URL || 'https://api.asaas.com').replace(/\/+$/, '') };
  }
  throw new Error('Configure PagBank, Mercado Pago ou Asaas para cadastrar cartões.');
}

async function mercadoPagoCustomer(baseUrl: string, token: string, user: { name: string; email: string }) {
  const headers = { Authorization: `Bearer ${token}` };
  const found = await providerJson(`${baseUrl}/v1/customers/search?email=${encodeURIComponent(user.email)}`, headers);
  const results = Array.isArray(found.results) ? found.results : [];
  const existing = String((results[0] as { id?: unknown } | undefined)?.id || '').trim();
  if (existing) return existing;
  const created = await providerJson(`${baseUrl}/v1/customers`, headers, { method: 'POST', body: JSON.stringify({ email: user.email, first_name: user.name }) });
  const id = String(created.id || '').trim();
  if (!id) throw new Error('O Mercado Pago não retornou o cliente protegido.');
  return id;
}

async function asaasCustomer(baseUrl: string, token: string, user: { name: string; email: string; cpf: string | null; phone: string | null }, taxId?: string) {
  const headers = { access_token: token };
  const found = await providerJson(`${baseUrl}/v3/customers?email=${encodeURIComponent(user.email)}`, headers);
  const data = Array.isArray(found.data) ? found.data : [];
  const existing = String((data[0] as { id?: unknown } | undefined)?.id || '').trim();
  if (existing) return existing;
  const cpfCnpj = String(taxId || user.cpf || '').replace(/\D/g, '');
  if (![11, 14].includes(cpfCnpj.length)) throw new Error('Cadastre um CPF válido para proteger o cartão no Asaas.');
  const created = await providerJson(`${baseUrl}/v3/customers`, headers, { method: 'POST', body: JSON.stringify({ name: user.name, email: user.email, cpfCnpj, mobilePhone: String(user.phone || '').replace(/\D/g, '') || undefined }) });
  const id = String(created.id || '').trim();
  if (!id) throw new Error('O Asaas não retornou o cliente protegido.');
  return id;
}

router.get('/config', async (req, res): Promise<void> => {
  const userId = customerId(req, res); if (!userId) return;
  const parsed = restaurantSchema.safeParse(req.query.restaurantId);
  if (!parsed.success) { res.status(400).json({ error: 'Restaurante inválido.' }); return; }
  try {
    const context = await gatewayContext(parsed.data);
    if (context.provider === 'PAGBANK') {
      let key = await providerJson(`${context.baseUrl}/public-keys/card`, { Authorization: `Bearer ${context.token}` });
      if (!String(key.public_key || key.publicKey || '').trim()) key = await providerJson(`${context.baseUrl}/public-keys`, { Authorization: `Bearer ${context.token}` }, { method: 'POST', body: JSON.stringify({ type: 'card' }) });
      const publicKey = String(key.public_key || key.publicKey || '').trim();
      if (!publicKey) throw new Error('O PagBank não retornou a chave pública do cartão.');
      res.json({ provider: context.provider, publicKey }); return;
    }
    if (context.provider === 'MERCADO_PAGO') {
      const publicKey = String(process.env.MERCADO_PAGO_PUBLIC_KEY || process.env.MP_PUBLIC_KEY || '').trim();
      if (!publicKey) throw new Error('Configure MERCADO_PAGO_PUBLIC_KEY para cadastrar cartões com Mercado Pago.');
      res.json({ provider: context.provider, publicKey }); return;
    }
    res.json({ provider: context.provider });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Falha ao preparar o cadastro seguro.' });
  }
});

router.get('/', async (req, res): Promise<void> => {
  const userId = customerId(req, res); if (!userId) return;
  const parsed = restaurantSchema.safeParse(req.query.restaurantId);
  if (!parsed.success) { res.status(400).json({ error: 'Restaurante inválido.' }); return; }
  const methods = await prisma.customerPaymentMethod.findMany({ where: { userId, restaurantId: parsed.data, active: true }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] });
  res.json({ paymentMethods: methods.map(toPublicPaymentMethod) });
});

router.post('/', async (req, res): Promise<void> => {
  const userId = customerId(req, res); if (!userId) return;
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Confira os dados do cartão e tente novamente.' }); return; }
  try {
    const context = await gatewayContext(parsed.data.restaurantId);
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true, cpf: true, phone: true, addresses: { where: { isDefault: true }, take: 1 } } });
    if (!user) throw new Error('Cliente não encontrado.');
    let providerId = '';
    let providerCustomerId: string | null = null;
    let providerBrand = '';
    if (context.provider === 'PAGBANK') {
      if (!parsed.data.encryptedCard) throw new Error('Cartão PagBank criptografado não informado.');
      const saved = await providerJson(`${context.baseUrl}/tokens/cards`, { Authorization: `Bearer ${context.token}` }, { method: 'POST', body: JSON.stringify({ encrypted: parsed.data.encryptedCard }) });
      providerId = String(saved.id || (saved.card as { id?: unknown } | undefined)?.id || '').trim();
      providerBrand = String(saved.brand || (saved.card as { brand?: unknown } | undefined)?.brand || '').trim();
    } else if (context.provider === 'MERCADO_PAGO') {
      if (!parsed.data.cardToken) throw new Error('Token seguro do Mercado Pago não informado.');
      providerCustomerId = await mercadoPagoCustomer(context.baseUrl, context.token, user);
      const saved = await providerJson(`${context.baseUrl}/v1/customers/${encodeURIComponent(providerCustomerId)}/cards`, { Authorization: `Bearer ${context.token}` }, { method: 'POST', body: JSON.stringify({ token: parsed.data.cardToken }) });
      providerId = String(saved.id || '').trim();
      providerBrand = String(saved.payment_method_id || (saved.payment_method as { id?: unknown } | undefined)?.id || '').trim();
    } else {
      if (!parsed.data.cardData) throw new Error('Dados do cartão Asaas não informados.');
      providerCustomerId = await asaasCustomer(context.baseUrl, context.token, user, parsed.data.holderTaxId);
      const address = user.addresses[0];
      const taxId = String(parsed.data.holderTaxId || user.cpf || '').replace(/\D/g, '');
      const postalCode = String(address?.zipCode || '').replace(/\D/g, '');
      const phone = String(user.phone || '').replace(/\D/g, '');
      if (postalCode.length !== 8 || !String(address?.number || '').trim() || phone.length < 10) {
        throw new Error('Complete o endereço principal e o celular no perfil antes de salvar um cartão no Asaas.');
      }
      const saved = await providerJson(`${context.baseUrl}/v3/creditCard/tokenizeCreditCard`, { access_token: context.token }, { method: 'POST', body: JSON.stringify({
        customer: providerCustomerId,
        creditCard: { holderName: parsed.data.holderName, number: parsed.data.cardData.number, expiryMonth: String(parsed.data.expMonth).padStart(2, '0'), expiryYear: String(parsed.data.expYear), ccv: parsed.data.cardData.securityCode },
        creditCardHolderInfo: { name: parsed.data.holderName, email: user.email, cpfCnpj: taxId, postalCode, addressNumber: address?.number, addressComplement: address?.complement || undefined, phone },
        remoteIp: req.ip,
      }) });
      providerId = String(saved.creditCardToken || saved.token || '').trim();
      providerBrand = String(saved.creditCardBrand || saved.brand || '').trim();
    }
    if (!providerId) throw new Error(`${context.provider} não retornou o token seguro do cartão.`);
    const count = await prisma.customerPaymentMethod.count({ where: { userId, restaurantId: parsed.data.restaurantId, active: true } });
    const makeDefault = parsed.data.isDefault || count === 0;
    const method = await prisma.$transaction(async (tx) => {
      if (makeDefault) await tx.customerPaymentMethod.updateMany({ where: { userId, restaurantId: parsed.data.restaurantId }, data: { isDefault: false } });
      return tx.customerPaymentMethod.create({ data: { userId, restaurantId: parsed.data.restaurantId, provider: context.provider, providerPaymentMethodId: providerId, providerCustomerId, brand: normalizeStoredCardBrand(providerBrand || parsed.data.brand), last4: parsed.data.last4, expMonth: parsed.data.expMonth, expYear: parsed.data.expYear, holderName: parsed.data.holderName, isDefault: makeDefault } });
    });
    res.status(201).json({ paymentMethod: toPublicPaymentMethod(method) });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Não foi possível cadastrar o cartão.' });
  }
});

router.put('/:publicId/default', async (req, res): Promise<void> => {
  const userId = customerId(req, res); if (!userId) return;
  const method = await prisma.customerPaymentMethod.findFirst({ where: { publicId: req.params.publicId, userId, active: true } });
  if (!method) { res.status(404).json({ error: 'Cartão não encontrado.' }); return; }
  const updated = await prisma.$transaction(async (tx) => { await tx.customerPaymentMethod.updateMany({ where: { userId, restaurantId: method.restaurantId }, data: { isDefault: false } }); return tx.customerPaymentMethod.update({ where: { id: method.id }, data: { isDefault: true } }); });
  res.json({ paymentMethod: toPublicPaymentMethod(updated) });
});

router.delete('/:publicId', async (req, res): Promise<void> => {
  const userId = customerId(req, res); if (!userId) return;
  const method = await prisma.customerPaymentMethod.findFirst({ where: { publicId: req.params.publicId, userId, active: true } });
  if (!method) { res.status(404).json({ error: 'Cartão não encontrado.' }); return; }
  await prisma.customerPaymentMethod.update({ where: { id: method.id }, data: { active: false, isDefault: false } });
  const fallback = await prisma.customerPaymentMethod.findFirst({ where: { userId, restaurantId: method.restaurantId, active: true }, orderBy: { createdAt: 'desc' } });
  if (fallback) await prisma.customerPaymentMethod.update({ where: { id: fallback.id }, data: { isDefault: true } });
  res.status(204).send();
});

export default router;
