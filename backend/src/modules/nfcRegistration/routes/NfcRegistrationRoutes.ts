import crypto from 'node:crypto';
import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { ZodError } from 'zod';
import prisma from '../../../config/prisma.js';
import { setTenantDbContext, withTenantDbContext } from '../../../database/tenantDbContext.js';
import { linkedNfcCustomerMatches, linkedNfcPaymentState } from '../domain/nfcLinkedCustomersSearch.js';
import { nextNfcReturnCpfFailure, nfcReturnCpfRemainingMinutes } from '../domain/nfcReturnCpfLockout.js';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import { nfcRegistrationAccessMiddleware } from '../../../middlewares/nfcRegistrationAccessMiddleware.js';
import { premiumNfcPlanMiddleware } from '../../../middlewares/premiumNfcPlanMiddleware.js';
import { encryptNfcPii, decryptNfcPii, maskNfcCpf, maskNfcPhone, nfcCpfFingerprints } from '../security/nfcCustomerPii.js';
import { createNfcCustomerSchema, lookupNfcCpfSchema, revokeNfcCardSchema, nfcIdSchema, nfcPageSchema, normalizeNfcCpf, normalizeNfcPhone, NfcRegistrationError } from '../domain/nfcRegistrationRules.js';

const router = Router();
router.use(authMiddleware, nfcRegistrationAccessMiddleware);
// Settlement and card return remain available to clear existing debts after downgrade.
router.use((req, res, next) => (req.method === 'GET' || (req.method === 'POST' && (req.path === '/cards/return' || /^\/cards\/[^/]+\/revoke$/.test(req.path)))) ? next() : premiumNfcPlanMiddleware(req, res, next));
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

// Return the *same* NFC chip to inventory only after a physical scan, full CPF and
// authoritative ledger settlement. Never accept a client-supplied paid flag.
const returnSchema = z.strictObject({
  token: z.string().regex(/^[A-Za-z0-9_-]{32,128}$/u),
  cpf: z.string().trim().min(11).max(18),
  comandaId: z.uuid().optional(),
});
router.post('/cards/return', async (req, res) => {
  try {
    const input = returnSchema.parse(req.body);
    const restaurantId = Number(req.user.restaurantId);
    const tokenHash = normalizeTagToken(input.token);
    // Any 11-digit input with wrong check digits must count as a failed attempt.
    const cpf = input.cpf.replace(/\D/gu, '');
    if (cpf.length !== 11) throw new NfcRegistrationError(422, 'Informe os 11 dígitos do CPF.');
    const result = await prisma.$transaction(async tx => {
      await setTenantDbContext(tx, restaurantId);
      // Resolve without trusting a claimed customer, then lock comanda before card
      // (same lock order as settlement). Recheck ownership after locking.
      const preview = await tx.nfcCard.findFirst({
        where: { restaurantId, tokenHash, status: 'ACTIVE' },
        select: { id: true, customerId: true, displayCode: true },
      });
      if (!preview?.customerId) throw new NfcRegistrationError(409, 'Cartão não está vinculado a uma visita ativa.');
      const current = await tx.nfcComanda.findFirst({
        where: { restaurantId, cardId: preview.id, customerId: preview.customerId, status: { in: ['OPEN', 'UNPAID', 'PAID'] } },
        select: { id: true }, orderBy: { openedAt: 'desc' },
      });
      if (!current) throw new NfcRegistrationError(409, 'Não há comanda ativa vinculada a este cartão.');
      if (input.comandaId && current.id !== input.comandaId) throw new NfcRegistrationError(409, 'O cartão não corresponde à comanda selecionada para pagamento.');
      await tx.$queryRaw`SELECT "id" FROM "NfcComanda" WHERE "restaurantId" = ${restaurantId} AND "id" = ${current.id}::uuid FOR UPDATE`;
      const locked = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "NfcCard"
        WHERE "restaurantId" = ${restaurantId} AND "id" = ${preview.id}::uuid FOR UPDATE
      `;
      if (locked.length !== 1) throw new NfcRegistrationError(404, 'Cartão não encontrado.');
      const card = await tx.nfcCard.findFirst({ where: { id: preview.id, restaurantId, tokenHash } });
      const comanda = await tx.nfcComanda.findFirst({ where: { id: current.id, restaurantId } });
      if (!card || card.status !== 'ACTIVE' || card.customerId !== preview.customerId
        || !comanda || comanda.cardId !== card.id || comanda.customerId !== card.customerId
        || !['OPEN', 'UNPAID', 'PAID'].includes(comanda.status)) {
        throw new NfcRegistrationError(409, 'A visita foi alterada. Leia novamente o cartão.');
      }
      if (card.returnCpfLockedUntil && card.returnCpfLockedUntil > new Date()) {
        throw new NfcRegistrationError(429, `Verificação bloqueada. Tente novamente em ${nfcReturnCpfRemainingMinutes(card.returnCpfLockedUntil, new Date())} minuto(s).`);
      }
      const customer = await tx.nfcCustomer.findFirst({
        where: { restaurantId, id: card.customerId! }, select: { cpfFingerprint: true },
      });
      if (!customer) throw new NfcRegistrationError(404, 'Cliente não encontrado.');
      const fingerprints = nfcCpfFingerprints(restaurantId, cpf);
      const matched = fingerprints.some(f => crypto.timingSafeEqual(
        Buffer.from(f, 'hex'), Buffer.from(customer.cpfFingerprint, 'hex')));
      if (!matched) {
        const { attempts, lockedUntil } = nextNfcReturnCpfFailure(card.failedReturnCpfAttempts, new Date());
        await tx.nfcCard.updateMany({
          where: { id: card.id, restaurantId, status: 'ACTIVE', customerId: card.customerId },
          data: { failedReturnCpfAttempts: attempts,
            returnCpfLockedUntil: lockedUntil },
        });
        await tx.nfcRegistrationAudit.create({ data: {
          restaurantId, actorUserId: Number(req.user.id), customerId: card.customerId,
          cardId: card.id, action: 'CARD_RETURN_CPF_DENIED',
        } });
        return { released: false as const, incorrectCpf: true as const, locked: lockedUntil !== null,
          remainingMinutes: lockedUntil ? nfcReturnCpfRemainingMinutes(lockedUntil, new Date()) : 0 };
      }
      const otherComandas = await tx.nfcComanda.findMany({
        where: { restaurantId, customerId: card.customerId!, id: { not: comanda.id },
          status: { in: ['OPEN', 'UNPAID'] } },
        select: { totalCents: true, paidCents: true },
      });
      if (otherComandas.some(other => other.totalCents > other.paidCents)) {
        throw new NfcRegistrationError(409, 'Cliente possui outra comanda pendente. Verifique antes de liberar.');
      }
      if (comanda.totalCents !== comanda.paidCents) {
        throw new NfcRegistrationError(409, 'Comanda ainda não está totalmente quitada no servidor.');
      }
      const processing = await tx.nfcCashlessPayment.count({
        where: { restaurantId, comandaId: comanda.id, status: { in: ['RESERVED', 'PROCESSING'] } },
      });
      const pending = await tx.nfcComandaPayment.count({
        where: { restaurantId, comandaId: comanda.id, status: 'PENDING' },
      });
      const orderChallenges = await tx.nfcOrderConfirmation.count({
        where: { restaurantId, comandaId: comanda.id, consumedAt: null, expiresAt: { gt: new Date() } },
      });
      if (processing || pending || orderChallenges) throw new NfcRegistrationError(409,
        'Existem pagamentos ou pedidos em processamento. Aguarde a conciliação.');
      const now = new Date();
      const closed = await tx.nfcComanda.updateMany({
        where: { restaurantId, id: comanda.id, status: { in: ['OPEN', 'UNPAID', 'PAID'] },
          totalCents: comanda.totalCents, paidCents: comanda.paidCents },
        data: { status: 'PAID', paidAt: comanda.paidAt || now,
          closedAt: comanda.closedAt || now, closedByUserId: Number(req.user.id) },
      });
      if (closed.count !== 1) throw new NfcRegistrationError(409, 'Comanda foi alterada. Consulte novamente.');
      // Old visit credentials must not authenticate the next customer's visit.
      await tx.nfcComandaAccess.updateMany({
        where: { restaurantId, comandaId: comanda.id, revokedAt: null },
        data: { revokedAt: now, sessionHash: null },
      });
      const returned = await tx.nfcCard.updateMany({
        where: { restaurantId, id: card.id, status: 'ACTIVE', customerId: card.customerId },
        data: { customerId: null, status: 'READY', activatedAt: null, activatedByUserId: null,
          failedReturnCpfAttempts: 0, returnCpfLockedUntil: null,
          failedOrderConfirmAttempts: 0, orderConfirmationLockedUntil: null },
      });
      if (returned.count !== 1) throw new NfcRegistrationError(409, 'Cartão já foi liberado por outro funcionário.');
      await tx.nfcRegistrationAudit.create({ data: {
        restaurantId, actorUserId: Number(req.user.id), customerId: card.customerId,
        cardId: card.id, action: 'CARD_RETURNED_READY',
      } });
      return { released: true as const, cardId: card.id,
        displayCode: card.displayCode, status: 'READY' as const };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    res.setHeader('Cache-Control', 'no-store');
    if (!result.released) return res.status(result.locked ? 429 : 403).json({
      error: result.locked ? `Muitas tentativas incorretas. Tente novamente em ${result.remainingMinutes} minuto(s).` : 'CPF não corresponde ao titular do cartão.',
    });
    return res.json(result);
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
      if (current.status === 'REVOKED' || current.status === 'READY') throw new NfcRegistrationError(409, 'Cartão não está associado a um cliente para ativação.');
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

const intakeSchema = z.strictObject({
  token: z.string().min(32).max(128),
  customerId: z.uuid().optional(),
  name: z.string().trim().min(2).max(120).optional(),
  cpf: z.string().min(11).max(18).optional(),
  phone: z.string().min(10).max(24).optional(),
  tableNumber: z.number().int().min(1).max(100000).nullable().optional(),
});
router.post('/cards/provision', async (req, res) => {
  try {
    const restaurantId = Number(req.user.restaurantId);
    const token = crypto.randomBytes(24).toString('base64url');
    const tokenHash = normalizeTagToken(token);
    const cardId = crypto.randomUUID();
    const card = await prisma.$transaction(async tx => {
      await setTenantDbContext(tx, restaurantId);
      const created = await tx.nfcCard.create({
        data: { id: cardId, restaurantId, customerId: null, displayCode: 'NFC-' + cardId.slice(0, 8).toUpperCase(),
          tokenHash, issuedByUserId: Number(req.user.id), status: 'PENDING_WRITE' },
        select: { id: true, displayCode: true, status: true },
      });
      await tx.nfcRegistrationAudit.create({
        data: { restaurantId, actorUserId: Number(req.user.id), cardId, action: 'CARD_PREPROVISIONED' },
      });
      return created;
    });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(201).json({ card, ndefUrl: 'https://www.gastronexa.com.br/nfc/' + token });
  } catch (error) { return safe(res, error); }
});
router.post('/cards/:id/prepare', async (req, res) => {
  try {
    const restaurantId = Number(req.user.restaurantId), cardId = ensureId(req.params.id);
    const tokenHash = normalizeTagToken(req.body?.token);
    const card = await prisma.$transaction(async tx => {
      await setTenantDbContext(tx, restaurantId);
      const updated = await tx.nfcCard.updateMany({
        where: { id: cardId, restaurantId, tokenHash, customerId: null, status: 'PENDING_WRITE' },
        data: { status: 'READY' },
      });
      if (updated.count !== 1) throw new NfcRegistrationError(409, 'Cartão não está disponível para preparação.');
      await tx.nfcRegistrationAudit.create({
        data: { restaurantId, actorUserId: Number(req.user.id), cardId, action: 'CARD_READY' },
      });
      return { id: cardId, status: 'READY' as const };
    });
    return res.json({ card });
  } catch (error) { return safe(res, error); }
});
router.post('/cards/intake', async (req, res) => {
  try {
    const input = intakeSchema.parse(req.body);
    const restaurantId = Number(req.user.restaurantId), tokenHash = normalizeTagToken(input.token);
    const result = await prisma.$transaction(async tx => {
      await setTenantDbContext(tx, restaurantId);
      // Lock the card so two employees cannot allocate the same plastic simultaneously.
      const rows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "NfcCard" WHERE "restaurantId" = ${restaurantId}
        AND "tokenHash" = ${tokenHash} FOR UPDATE
      `;
      if (rows.length !== 1) throw new NfcRegistrationError(404, 'Cartão não encontrado neste restaurante.');
      const card = await tx.nfcCard.findFirst({ where: { id: rows[0].id, restaurantId } });
      if (!card || card.status !== 'READY' || card.customerId) {
        throw new NfcRegistrationError(409, 'Cartão já vinculado, revogado ou não preparado.');
      }
      let customerId: string;
      if (input.customerId) {
        const found = await tx.nfcCustomer.findFirst({ where: { id: input.customerId, restaurantId }, select: { id: true } });
        if (!found) throw new NfcRegistrationError(404, 'Cliente não encontrado neste restaurante.');
        customerId = found.id;
      } else {
        if (!input.name || !input.cpf || !input.phone) throw new NfcRegistrationError(422, 'Nome, CPF e telefone são obrigatórios para novo cliente.');
        const cpf = normalizeNfcCpf(input.cpf), phone = normalizeNfcPhone(input.phone);
        const fingerprints = nfcCpfFingerprints(restaurantId, cpf);
        const found = await tx.nfcCustomer.findFirst({ where: { restaurantId, cpfFingerprint: { in: fingerprints } }, select: { id: true } });
        if (found) throw new NfcRegistrationError(409, 'Cliente já cadastrado. Localize pelo CPF antes de vincular.');
        customerId = crypto.randomUUID();
        await tx.nfcCustomer.create({ data: {
          id: customerId, restaurantId, nameEncrypted: encryptNfcPii(restaurantId, customerId, 'name', input.name),
          cpfEncrypted: encryptNfcPii(restaurantId, customerId, 'cpf', cpf),
          cpfFingerprint: fingerprints[0], phoneEncrypted: encryptNfcPii(restaurantId, customerId, 'phone', phone),
        } });
        await tx.nfcRegistrationAudit.create({ data: {
          restaurantId, actorUserId: Number(req.user.id), customerId, action: 'CUSTOMER_CREATED',
        } });
      }
      const debt = await tx.nfcComanda.findMany({ where: { restaurantId, customerId, status: { in: ['OPEN', 'UNPAID'] }, dueAt: { lte: new Date() } }, select: { totalCents: true, paidCents: true } });
      if (debt.some(item => item.totalCents > item.paidCents)) throw new NfcRegistrationError(403, 'Cliente com dívida vencida neste restaurante; regularize antes de receber o cartão.');
      const hasCard = await tx.nfcCard.count({ where: { restaurantId, customerId, status: { in: ['ACTIVE', 'PENDING_WRITE'] } } });
      if (hasCard) throw new NfcRegistrationError(409, 'Cliente já possui cartão ativo ou em preparação.');
      const updated = await tx.nfcCard.updateMany({
        where: { restaurantId, id: card.id, status: 'READY', customerId: null },
        data: { customerId, status: 'ACTIVE', activatedByUserId: Number(req.user.id), activatedAt: new Date() },
      });
      if (updated.count !== 1) throw new NfcRegistrationError(409, 'Vínculo concorrente detectado.');
      await tx.nfcRegistrationAudit.create({ data: {
        restaurantId, actorUserId: Number(req.user.id), customerId, cardId: card.id, action: 'CARD_ASSIGNED',
      } });
      return { customerId, cardId: card.id, displayCode: card.displayCode, tableNumber: input.tableNumber ?? null };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(201).json({ assignment: result, warning: 'A mesa opcional será confirmada ao abrir a comanda NFC.' });
  } catch (error) { return safe(res, error); }
});
const linkedSearchSchema = z.strictObject({
  q: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
});
router.get('/linked-customers', async (req, res) => {
  try {
    const restaurantId = Number(req.user.restaurantId);
    const { q = '', page } = linkedSearchSchema.parse(req.query);
    const digits = q.replace(/\D/g, '');
    // CPF is matched only by the scoped HMAC; raw CPF never leaves this endpoint.
    const cpfKeys = digits.length === 11 ? nfcCpfFingerprints(restaurantId, digits) : [];
    const result = await withTenantDbContext(restaurantId, async (tx) => {
      const activeCards = await tx.nfcCard.findMany({
        where: { restaurantId, status: 'ACTIVE', customerId: { not: null } },
        select: { id: true, customerId: true, displayCode: true, activatedAt: true },
        orderBy: { createdAt: 'desc' },
      });
      const linkedIds = activeCards.map(card => card.customerId).filter((value): value is string => !!value);
      if (!linkedIds.length) return { customers: [], total: 0, page, pageSize };
      const customers = await tx.nfcCustomer.findMany({
        where: { restaurantId, id: { in: linkedIds } },
        select: { id: true, nameEncrypted: true, phoneEncrypted: true, cpfFingerprint: true, cpfEncrypted: true },
      });
      const byId = new Map(customers.map(customer => [customer.id, customer]));
      const matching = activeCards.flatMap(card => {
        if (!card.customerId) return [];
        const customer = byId.get(card.customerId);
        if (!customer) return [];
        const name = decryptNfcPii(restaurantId, customer.id, 'name', customer.nameEncrypted);
        const phone = decryptNfcPii(restaurantId, customer.id, 'phone', customer.phoneEncrypted);
        const cpfMatch = cpfKeys.includes(customer.cpfFingerprint);
        if (!linkedNfcCustomerMatches(q, name, phone, cpfMatch)) return [];
        return [{ card, customer, name, phone }];
      });
      const selected = matching.slice((page - 1) * pageSize, page * pageSize);
      const ids = selected.map(item => item.customer.id);
      const accounts = ids.length ? await tx.nfcComanda.findMany({
        where: { restaurantId, customerId: { in: ids }, status: 'OPEN' },
        orderBy: { openedAt: 'desc' },
        select: { id: true, cardId: true, customerId: true, tableNumber: true, status: true,
          totalCents: true, paidCents: true, openedAt: true },
      }) : [];
      return {
        page, pageSize, total: matching.length,
        customers: selected.map(({ card, customer, name, phone }) => {
          const current = accounts.find(a => a.customerId === customer.id && a.cardId === card.id);
          const amounts = current ? { totalCents: Number(current.totalCents), paidCents: Number(current.paidCents) } : null;
          return {
            customerId: customer.id,
            name,
            cpfMasked: maskNfcCpf(decryptNfcPii(restaurantId, customer.id, 'cpf', customer.cpfEncrypted)),
            phoneMasked: maskNfcPhone(phone),
            card: { id: card.id, displayCode: card.displayCode },
            comanda: current ? { id: current.id, tableNumber: current.tableNumber, openedAt: current.openedAt,
              status: linkedNfcPaymentState({ status: current.status, ...amounts! }),
              totalCents: amounts!.totalCents, paidCents: amounts!.paidCents,
              outstandingCents: Math.max(0, amounts!.totalCents - amounts!.paidCents) } : null,
          };
        }),
      };
    });
    res.setHeader('Cache-Control', 'no-store, private');
    return res.json(result);
  } catch (error) { return safe(res, error); }
});


export default router;
