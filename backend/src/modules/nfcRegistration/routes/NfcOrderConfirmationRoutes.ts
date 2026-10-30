import { Router } from 'express';
import crypto from 'node:crypto';
import { Prisma, OrderType } from '@prisma/client';
import createOrderService from '../../orders/services/CreateOrderService.js';
import { OrderRequestError } from '../../orders/domain/OrderRequestError.js';
import { z, ZodError } from 'zod';
import prisma from '../../../config/prisma.js';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import { nfcRegistrationAccessMiddleware } from '../../../middlewares/nfcRegistrationAccessMiddleware.js';
import { premiumNfcPlanMiddleware } from '../../../middlewares/premiumNfcPlanMiddleware.js';
import { setTenantDbContext } from '../../../database/tenantDbContext.js';
import { decryptNfcPii } from '../security/nfcCustomerPii.js';

const router = Router();
router.use(authMiddleware, nfcRegistrationAccessMiddleware, premiumNfcPlanMiddleware);
const LIMIT = 3, LOCK_MS = 15 * 60_000, CHALLENGE_MS = 2 * 60_000;
const uuid = z.uuid();
const keyPattern = /^[A-Za-z0-9_-]{16,128}$/u;
const tokenPattern = /^[A-Za-z0-9_-]{32,128}$/u;
const draft = z.strictObject({
  comandaId: uuid,
  items: z.array(z.strictObject({
    productId: z.number().int().positive(),
    quantity: z.number().int().min(1).max(100),
  })).min(1).max(50),
  observation: z.string().trim().max(400).optional(),
});
const verify = z.strictObject({
  token: z.string().regex(tokenPattern),
  cpfPrefix: z.string().regex(/^\d{3}$/u),
});
class VerificationError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}
const hash = (x: string) => crypto.createHash('sha256').update(x).digest('hex');
const tenant = (req: import('express').Request) => Number(req.user.restaurantId);
const actor = (req: import('express').Request) => Number(req.user.id);
function responseError(res: import('express').Response, error: unknown) {
  const status = error instanceof VerificationError ? error.status
    : error instanceof OrderRequestError ? error.statusCode
    : error instanceof ZodError ? 422
    : error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002' ? 409 : 500;
  return res.status(status).json({
    error: error instanceof VerificationError || error instanceof OrderRequestError ? error.message
      : error instanceof ZodError ? 'Verifique os campos do pedido e os três primeiros números do CPF.'
      : status === 409 ? 'Esta confirmação já foi criada.' : 'Não foi possível validar o pedido NFC.',
  });
}
async function lockCard(tx: Prisma.TransactionClient, restaurantId: number, cardId: string) {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "NfcCard"
    WHERE "id" = ${cardId}::uuid AND "restaurantId" = ${restaurantId} FOR UPDATE
  `;
  if (rows.length !== 1) throw new VerificationError(404, 'Cartão não encontrado neste restaurante.');
}
async function assertActiveComanda(tx: Prisma.TransactionClient, restaurantId: number, comandaId: string) {
  const comanda = await tx.nfcComanda.findFirst({ where: { restaurantId, id: comandaId },
    select: { customerId: true, cardId: true, status: true, dueAt: true, totalCents: true, paidCents: true } });
  if (!comanda || comanda.status !== 'OPEN' || !comanda.cardId) {
    throw new VerificationError(409, 'Abra uma comanda individual com cartão ativo antes de registrar o pedido.');
  }
  if (comanda.dueAt <= new Date() && comanda.totalCents > comanda.paidCents) {
    throw new VerificationError(403, 'Prazo da comanda encerrado e valor pendente. Regularize o pagamento.');
  }
  return comanda;
}
router.post('/challenges', async (req, res) => {
  try {
    const restaurantId = tenant(req), userId = actor(req);
    const input = draft.parse(req.body);
    const header = req.headers['idempotency-key'];
    if (typeof header !== 'string' || !keyPattern.test(header)) throw new VerificationError(422, 'Idempotency-Key obrigatória.');
    const requestKeyHash = hash(header);
    const fingerprint = hash(JSON.stringify(input));
    const result = await prisma.$transaction(async tx => {
      await setTenantDbContext(tx, restaurantId);
      const comanda = await assertActiveComanda(tx, restaurantId, input.comandaId);
      await lockCard(tx, restaurantId, comanda.cardId!);
      const card = await tx.nfcCard.findFirst({ where: { restaurantId, id: comanda.cardId!, status: 'ACTIVE', customerId: comanda.customerId } });
      if (!card) throw new VerificationError(409, 'Cartão não está ativo para esta comanda.');
      if (card.orderConfirmationLockedUntil && card.orderConfirmationLockedUntil > new Date()) {
        throw new VerificationError(429, 'Confirmação temporariamente bloqueada por tentativas incorretas.');
      }
      const previous = await tx.nfcOrderConfirmation.findFirst({
        where: { restaurantId, comandaId: input.comandaId, requestKeyHash },
      });
      if (previous) {
        if (previous.orderFingerprint !== fingerprint || previous.createdByUserId !== userId) {
          throw new VerificationError(409, 'Esta chave de confirmação já pertence a outro pedido.');
        }
        return previous;
      }
      const products = await tx.product.findMany({
        where: { restaurantId, id: { in: input.items.map(i => i.productId) }, active: true },
        select: { id: true },
      });
      if (new Set(products.map(p => p.id)).size !== new Set(input.items.map(i => i.productId)).size) {
        throw new VerificationError(422, 'Há produtos inexistentes ou indisponíveis no restaurante.');
      }
      const now = new Date();
      return tx.nfcOrderConfirmation.create({ data: {
        id: crypto.randomUUID(), restaurantId, comandaId: input.comandaId, customerId: comanda.customerId,
        cardId: card.id, createdByUserId: userId, requestKeyHash, orderFingerprint: fingerprint,
        draftItems: input.items, observation: input.observation || null,
        expiresAt: new Date(now.getTime() + CHALLENGE_MS),
      } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(201).json({ challengeId: result.id, expiresAt: result.expiresAt,
      confirmed: Boolean(result.verifiedAt), alreadyConsumed: Boolean(result.consumedAt) });
  } catch (error) { return responseError(res, error); }
});
router.post('/challenges/pending', async (req, res) => {
  try {
    const restaurantId = tenant(req), userId = actor(req);
    const token = z.string().regex(tokenPattern).parse(req.body?.token);
    const card = await prisma.nfcCard.findFirst({
      where: { restaurantId, tokenHash: hash(token), status: 'ACTIVE' }, select: { id: true },
    });
    if (!card) throw new VerificationError(404, 'Cartão NFC não identificado neste restaurante.');
    const challenge = await prisma.nfcOrderConfirmation.findFirst({
      where: { restaurantId, cardId: card.id, createdByUserId: userId,
        verifiedAt: null, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, expiresAt: true, draftItems: true },
    });
    res.setHeader('Cache-Control', 'no-store');
    return res.json({ challenge });
  } catch (error) { return responseError(res, error); }
});
router.post('/challenges/:id/verify', async (req, res) => {
  try {
    const restaurantId = tenant(req), challengeId = uuid.parse(req.params.id), userId = actor(req);
    const { token, cpfPrefix } = verify.parse(req.body);
    const result = await prisma.$transaction(async tx => {
      await setTenantDbContext(tx, restaurantId);
      const preview = await tx.nfcOrderConfirmation.findFirst({ where: { id: challengeId, restaurantId },
        select: { cardId: true } });
      if (!preview) throw new VerificationError(404, 'Confirmação NFC não encontrada.');
      await lockCard(tx, restaurantId, preview.cardId);
      const challenge = await tx.nfcOrderConfirmation.findFirst({ where: { id: challengeId, restaurantId } });
      if (!challenge || challenge.createdByUserId !== userId) throw new VerificationError(403, 'Confirmação pertence a outro operador.');
      const card = await tx.nfcCard.findFirst({ where: { id: preview.cardId, restaurantId } });
      if (!card || card.status !== 'ACTIVE' || card.customerId !== challenge.customerId
        || !crypto.timingSafeEqual(Buffer.from(card.tokenHash, 'hex'), Buffer.from(hash(token), 'hex'))) {
        throw new VerificationError(403, 'Cartão não corresponde ao cliente ou à comanda.');
      }
      if (card.orderConfirmationLockedUntil && card.orderConfirmationLockedUntil > new Date()) {
        throw new VerificationError(429, 'Verificação temporariamente bloqueada. Solicite ajuda ao administrador.');
      }
      if (challenge.consumedAt || challenge.verifiedAt || challenge.expiresAt <= new Date()) {
        throw new VerificationError(409, 'Confirmação já utilizada ou expirada. Inicie outra.');
      }
      const comanda = await assertActiveComanda(tx, restaurantId, challenge.comandaId);
      if (comanda.cardId !== card.id || comanda.customerId !== card.customerId) {
        throw new VerificationError(409, 'Cartão não corresponde à comanda deste cliente.');
      }
      const customer = await tx.nfcCustomer.findFirst({ where: { id: challenge.customerId, restaurantId },
        select: { id: true, cpfEncrypted: true } });
      if (!customer) throw new VerificationError(404, 'Cliente não encontrado.');
      const cpf = decryptNfcPii(restaurantId, customer.id, 'cpf', customer.cpfEncrypted);
      const matched = crypto.timingSafeEqual(Buffer.from(cpf.slice(0, 3)), Buffer.from(cpfPrefix));
      if (!matched) {
        const failures = Math.min((card.orderConfirmationLockedUntil && card.orderConfirmationLockedUntil <= new Date() ? 0 : card.failedOrderConfirmAttempts) + 1, LIMIT);
        const lockedUntil = failures >= LIMIT ? new Date(Date.now() + LOCK_MS) : null;
        await tx.nfcCard.updateMany({ where: { id: card.id, restaurantId },
          data: { failedOrderConfirmAttempts: failures, orderConfirmationLockedUntil: lockedUntil } });
        await tx.nfcOrderConfirmation.updateMany({ where: { id: challengeId, restaurantId },
          data: { attempts: { increment: 1 } } });
        // Return a result instead of throwing: incorrect attempts must persist.
        return { verified: false, locked: failures >= LIMIT };
      }
      await tx.nfcOrderConfirmation.updateMany({ where: { id: challengeId, restaurantId },
        data: { verifiedAt: new Date() } });
      await tx.nfcCard.updateMany({ where: { id: card.id, restaurantId },
        data: { failedOrderConfirmAttempts: 0, orderConfirmationLockedUntil: null } });
      await tx.nfcRegistrationAudit.create({ data: { restaurantId, actorUserId: userId,
        customerId: challenge.customerId, cardId: card.id, action: 'ORDER_IDENTITY_VERIFIED' } });
      return { verified: true, locked: false };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    res.setHeader('Cache-Control', 'no-store');
    if (!result.verified) return res.status(result.locked ? 429 : 403).json({
      error: result.locked ? 'Muitas tentativas inválidas. Aguarde quinze minutos.' : 'Cartão ou código não confirmado.',
    });
    return res.json({ verified: true, warning: 'Identidade conferida. Pedido ainda não foi enviado à cozinha.' });
  } catch (error) { return responseError(res, error); }
});
router.post('/challenges/:id/finalize', async (req, res) => {
  try {
    const restaurantId = tenant(req), userId = actor(req), challengeId = uuid.parse(req.params.id);
    const found = await prisma.nfcOrderConfirmation.findFirst({
      where: { restaurantId, id: challengeId, createdByUserId: userId },
      select: { id: true, orderId: true, verifiedAt: true, expiresAt: true, draftItems: true, observation: true, comandaId: true },
    });
    if (!found || !found.verifiedAt) throw new VerificationError(403, 'Confirmação de cliente necessária.');
    if (found.orderId) return res.json({ orderId: found.orderId, paid: false, replayed: true });
    if (found.expiresAt <= new Date()) throw new VerificationError(409, 'Confirmação expirada. Inicie outra.');
    const items = draft.shape.items.parse(found.draftItems);
    const order = await createOrderService.execute({
      type: OrderType.NFC, restaurantId, userRestaurantId: restaurantId,
      nfcChallengeId: challengeId, paid: false,
      observation: found.observation || undefined,
      items,
    });
    return res.status(201).json({ orderId: order.id, paid: false, status: order.status });
  } catch (error) { return responseError(res, error); }
});
export default router;
