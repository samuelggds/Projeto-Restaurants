import crypto from 'node:crypto';
import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import prisma from '../../../config/prisma.js';
import { setTenantDbContext } from '../../../database/tenantDbContext.js';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import { nfcRegistrationAccessMiddleware } from '../../../middlewares/nfcRegistrationAccessMiddleware.js';
import { encryptNfcPii, decryptNfcPii, maskNfcCpf, maskNfcPhone, nfcCpfFingerprints } from '../security/nfcCustomerPii.js';
import { createNfcCustomerSchema, lookupNfcCpfSchema, revokeNfcCardSchema, nfcIdSchema, nfcPageSchema, normalizeNfcCpf, normalizeNfcPhone, NfcRegistrationError } from '../domain/nfcRegistrationRules.js';

const router = Router();
router.use(authMiddleware, nfcRegistrationAccessMiddleware);
const pageSize = 20;
const tokenSchema = ZodToken();
function ZodToken() { return /^[A-Za-z0-9_-]{32,128}$/u; }
function normalizeTagToken(value: unknown) {
  const token = typeof value === 'string' ? value.trim() : '';
  if (!tokenSchema.test(token)) throw new NfcRegistrationError(422, 'Identificador NFC inválido.');
  return crypto.createHash('sha256').update(token).digest('hex');
}
const customerSelect = { id: true, restaurantId: true, nameEncrypted: true, cpfEncrypted: true, phoneEncrypted: true, createdAt: true, cards: { select: { id: true, displayCode: true, status: true, createdAt: true }, orderBy: { createdAt: 'desc' as const } } };
const ensureId = (value: unknown) => nfcIdSchema.parse(value);
function safe(res: import('express').Response, error: unknown) {
  const status = error instanceof ZodError ? 422 : error instanceof NfcRegistrationError ? error.statusCode : error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002' ? 409 : 500;
  const message = error instanceof ZodError ? error.issues[0]?.message : error instanceof NfcRegistrationError ? error.message : status === 409 ? 'Já existe um cadastro ou cartão ativo para este cliente.' : 'Não foi possível concluir a operação NFC.';
  return res.status(status).json({ error: message });
}
function serialize(restaurantId: number, customer: { id: string; nameEncrypted: string; cpfEncrypted: string; phoneEncrypted: string; createdAt: Date; cards: Array<{ id: string; displayCode: string; status: string; createdAt: Date }> }) {
  const cpf = decryptNfcPii(restaurantId, customer.id, 'cpf', customer.cpfEncrypted);
  const phone = decryptNfcPii(restaurantId, customer.id, 'phone', customer.phoneEncrypted);
  return { id: customer.id, name: decryptNfcPii(restaurantId, customer.id, 'name', customer.nameEncrypted), cpfMasked: maskNfcCpf(cpf), phoneMasked: maskNfcPhone(phone), createdAt: customer.createdAt, cards: customer.cards };
}
router.get('/customers', async (req, res) => {
  try {
    const restaurantId = Number(req.user.restaurantId);
    const page = nfcPageSchema.parse(req.query.page);
    const where = { restaurantId };
    const [customers, total] = await Promise.all([
      prisma.nfcCustomer.findMany({ where, select: customerSelect, orderBy: { createdAt: 'desc' }, take: pageSize, skip: (page - 1) * pageSize }),
      prisma.nfcCustomer.count({ where }),
    ]);
    res.setHeader('Cache-Control', 'no-store');
    return res.json({ customers: customers.map((customer) => serialize(restaurantId, customer)), page, total, pageSize });
  } catch (error) { return safe(res, error); }
});
router.post('/customers/lookup', async (req, res) => {
  try {
    const { cpf: input } = lookupNfcCpfSchema.parse(req.body);
    const restaurantId = Number(req.user.restaurantId);
    const cpf = normalizeNfcCpf(input);
    const customer = await prisma.nfcCustomer.findFirst({ where: { restaurantId, cpfFingerprint: { in: nfcCpfFingerprints(restaurantId, cpf) } }, select: customerSelect });
    res.setHeader('Cache-Control', 'no-store');
    return res.json({ customer: customer ? serialize(restaurantId, customer) : null });
  } catch (error) { return safe(res, error); }
});
router.post('/customers', async (req, res) => {
  try {
    const { name, cpf: rawCpf, phone: rawPhone } = createNfcCustomerSchema.parse(req.body);
    const restaurantId = Number(req.user.restaurantId);
    const cpf = normalizeNfcCpf(rawCpf);
    const phone = normalizeNfcPhone(rawPhone);
    const fingerprints = nfcCpfFingerprints(restaurantId, cpf);
    const existing = await prisma.nfcCustomer.findFirst({ where: { restaurantId, cpfFingerprint: { in: fingerprints } }, select: { id: true } });
    if (existing) throw new NfcRegistrationError(409, 'CPF já cadastrado neste restaurante. Localize o cliente existente.');
    const customerId = crypto.randomUUID();
    const created = await prisma.$transaction(async (tx) => {
      const customer = await tx.nfcCustomer.create({ data: {
        id: customerId, restaurantId, nameEncrypted: encryptNfcPii(restaurantId, customerId, 'name', name),
        cpfEncrypted: encryptNfcPii(restaurantId, customerId, 'cpf', cpf),
        cpfFingerprint: fingerprints[0],
        phoneEncrypted: encryptNfcPii(restaurantId, customerId, 'phone', phone),
      }, select: customerSelect });
      await tx.nfcRegistrationAudit.create({ data: { restaurantId, actorUserId: Number(req.user.id), customerId, action: 'CUSTOMER_CREATED' } });
      return customer;
    });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(201).json({ customer: serialize(restaurantId, created) });
  } catch (error) { return safe(res, error); }
});
router.post('/customers/:id/cards', async (req, res) => {
  try {
    const restaurantId = Number(req.user.restaurantId);
    const customerId = ensureId(req.params.id);
    const token = crypto.randomBytes(24).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const cardId = crypto.randomUUID();
    const card = await prisma.$transaction(async (tx) => {
      await setTenantDbContext(tx, restaurantId);
      const customer = await tx.nfcCustomer.findFirst({ where: { id: customerId, restaurantId }, select: { id: true } });
      if (!customer) throw new NfcRegistrationError(404, 'Cliente não encontrado neste restaurante.');
      const item = await tx.nfcCard.create({ data: { id: cardId, restaurantId, customerId, displayCode: 'NFC-' + cardId.slice(0, 8).toUpperCase(), tokenHash, issuedByUserId: Number(req.user.id) }, select: { id: true, displayCode: true, status: true } });
      await tx.nfcRegistrationAudit.create({ data: { restaurantId, actorUserId: Number(req.user.id), customerId, cardId, action: 'CARD_ISSUED' } });
      return item;
    });
    res.setHeader('Cache-Control', 'no-store');
    // The random registration value is returned ONCE. It contains no personal data.
    // Production tag-writing UX and activation are reserved for the next step.
    return res.status(201).json({ card, ndefUrl: 'https://www.gastronexa.com.br/nfc/' + token, warning: 'Cartão pendente de gravação; ainda não pode ser usado em pedidos.' });
  } catch (error) { return safe(res, error); }
});
router.post('/cards/:id/revoke', async (req, res) => {
  try {
    const cardId = ensureId(req.params.id);
    const { reason } = revokeNfcCardSchema.parse(req.body);
    const restaurantId = Number(req.user.restaurantId);
    const revoked = await prisma.$transaction(async (tx) => {
      await setTenantDbContext(tx, restaurantId);
      const result = await tx.nfcCard.updateMany({ where: { id: cardId, restaurantId, status: { in: ['PENDING_WRITE', 'ACTIVE'] } }, data: { status: 'REVOKED', revokedByUserId: Number(req.user.id), revokedAt: new Date(), revokeReason: reason } });
      if (result.count !== 1) throw new NfcRegistrationError(409, 'Cartão inexistente, já revogado ou pertencente a outro restaurante.');
      const card = await tx.nfcCard.findFirst({ where: { id: cardId, restaurantId }, select: { id: true, customerId: true, status: true } });
      if (!card) throw new NfcRegistrationError(404, 'Cartão não encontrado.');
      await tx.nfcRegistrationAudit.create({ data: { restaurantId, actorUserId: Number(req.user.id), customerId: card.customerId, cardId, action: 'CARD_REVOKED' } });
      return card;
    });
    return res.json({ card: revoked });
  } catch (error) { return safe(res, error); }
});

router.post('/cards/resolve', async (req, res) => {
  try {
    const restaurantId = Number(req.user.restaurantId);
    const tokenHash = normalizeTagToken(req.body?.token);
    const card = await prisma.nfcCard.findFirst({
      where: { restaurantId, tokenHash, status: 'ACTIVE' },
      select: { id: true, customerId: true, displayCode: true, status: true },
    });
    res.setHeader('Cache-Control', 'no-store');
    if (!card) return res.status(404).json({ error: 'Cartão NFC não ativo ou não pertence a este restaurante.' });
    return res.json({ card });
  } catch (error) { return safe(res, error); }
});
router.post('/cards/:id/activate', async (req, res) => {
  try {
    const restaurantId = Number(req.user.restaurantId);
    const cardId = ensureId(req.params.id);
    const tokenHash = normalizeTagToken(req.body?.token);
    const card = await prisma.$transaction(async (tx) => {
      await setTenantDbContext(tx, restaurantId);
      const current = await tx.nfcCard.findFirst({
        where: { restaurantId, id: cardId, tokenHash },
        select: { id: true, customerId: true, displayCode: true, status: true },
      });
      if (!current) throw new NfcRegistrationError(404, 'Cartão não corresponde ao cadastro neste restaurante.');
      if (current.status === 'REVOKED') throw new NfcRegistrationError(409, 'Cartão revogado não pode ser reativado.');
      if (current.status === 'PENDING_WRITE') {
        const updated = await tx.nfcCard.updateMany({
          where: { restaurantId, id: cardId, tokenHash, status: 'PENDING_WRITE' },
          data: { status: 'ACTIVE', activatedAt: new Date(), activatedByUserId: Number(req.user.id) },
        });
        if (updated.count !== 1) throw new NfcRegistrationError(409, 'Cartão alterado durante a ativação.');
        await tx.nfcRegistrationAudit.create({
          data: { restaurantId, actorUserId: Number(req.user.id), customerId: current.customerId, cardId, action: 'CARD_ACTIVATED' },
        });
      }
      return { ...current, status: 'ACTIVE' };
    });
    res.setHeader('Cache-Control', 'no-store');
    return res.json({ card });
  } catch (error) { return safe(res, error); }
});
export default router;
