import { Router } from 'express';
import { createHash, randomUUID } from 'node:crypto';
import { Prisma, NfcComandaStatus, PaymentMethod } from '@prisma/client';
import { z, ZodError } from 'zod';
import prisma from '../../../config/prisma.js';
import { setTenantDbContext, withTenantDbContext } from '../../../database/tenantDbContext.js';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import { calculateNfcComandaDueAt } from '../domain/nfcComandaDeadline.js';
import { nfcRegistrationAccessMiddleware } from '../../../middlewares/nfcRegistrationAccessMiddleware.js';

const router = Router();
router.use(authMiddleware, nfcRegistrationAccessMiddleware);
const uuid = z.uuid();
const openSchema = z.strictObject({
  customerId: z.uuid(),
  cardId: z.uuid().optional(),
  tableNumber: z.number().int().positive().max(100000).nullable().optional(),
});
const cashSchema = z.strictObject({ amountCents: z.number().int().positive().max(100000000) });
const requestKey = (value: unknown) => {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{16,128}$/.test(value)) throw new NfcFinancialError(422, 'Idempotency-Key obrigatória e inválida.');
  return createHash('sha256').update(value).digest('hex');
};
class NfcFinancialError extends Error {
  constructor(readonly code: number, message: string) { super(message); }
}
function fail(res: import('express').Response, error: unknown) {
  const status = error instanceof NfcFinancialError ? error.code :
    error instanceof ZodError ? 422 :
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002' ? 409 : 500;
  return res.status(status).json({ error: error instanceof NfcFinancialError ? error.message :
    error instanceof ZodError ? error.issues[0]?.message :
    status === 409 ? 'Comanda já aberta ou operação duplicada.' : 'Não foi possível concluir a operação NFC.' });
}
const id = (value: unknown) => uuid.parse(value);
const tenant = (req: import('express').Request) => Number(req.user.restaurantId);
const actor = (req: import('express').Request) => Number(req.user.id);
const accountSelect = {
  id: true, customerId: true, cardId: true, tableNumber: true,
  status: true, totalCents: true, paidCents: true, openedAt: true, dueAt: true,
  closedAt: true, paidAt: true,
  items: { select: { id: true, kind: true, description: true, quantity: true, unitPriceCents: true, totalCents: true, createdAt: true }, orderBy: { createdAt: 'asc' as const } },
  payments: { select: { id: true, method: true, amountCents: true, status: true, createdAt: true, confirmedAt: true, reversedAt: true }, orderBy: { createdAt: 'desc' as const } },
};
const money = (value: bigint) => Number(value);
function project<T extends { totalCents: bigint; paidCents: bigint; items?: Array<{ unitPriceCents: bigint; totalCents: bigint }>; payments?: Array<{ amountCents: bigint }> }>(record: T) {
  return { ...record, totalCents: money(record.totalCents), paidCents: money(record.paidCents),
    outstandingCents: money(record.totalCents - record.paidCents),
    items: record.items?.map((x) => ({ ...x, unitPriceCents: money(x.unitPriceCents), totalCents: money(x.totalCents) })),
    payments: record.payments?.map((x) => ({ ...x, amountCents: money(x.amountCents) })) };
}
async function lockCustomer(tx: Prisma.TransactionClient, restaurantId: number, customerId: string) {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "NfcCustomer" WHERE "restaurantId" = ${restaurantId}
    AND "id" = ${customerId}::uuid FOR UPDATE
  `;
  if (rows.length !== 1) throw new NfcFinancialError(404, 'Cliente não encontrado neste restaurante.');
}
async function lockComanda(tx: Prisma.TransactionClient, restaurantId: number, comandaId: string) {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "NfcComanda" WHERE "restaurantId" = ${restaurantId}
    AND "id" = ${comandaId}::uuid FOR UPDATE
  `;
  if (rows.length !== 1) throw new NfcFinancialError(404, 'Comanda não encontrada neste restaurante.');
}
async function assertNoActiveCashlessCheckout(tx: Prisma.TransactionClient, restaurantId: number, comandaId: string) {
  const count = await tx.nfcCashlessPayment.count({
    where: { restaurantId, comandaId, status: { in: ['RESERVED', 'PROCESSING'] } },
  });
  if (count !== 0) throw new NfcFinancialError(409,
    'Já existe cobrança Pix/Point em andamento. Consulte o provedor antes de receber outro pagamento.');
}
async function assertNoPendingCash(tx: Prisma.TransactionClient, restaurantId: number, comandaId: string) {
  const count = await tx.nfcComandaPayment.count({
    where: { restaurantId, comandaId, method: PaymentMethod.DINHEIRO, status: 'PENDING' },
  });
  if (count !== 0) throw new NfcFinancialError(409,
    'Existe recebimento em dinheiro aguardando confirmação. Confirme ou cancele antes de continuar.');
}
async function customerDebt(tx: Prisma.TransactionClient, restaurantId: number, customerId: string, now = new Date()) {
  const rows = await tx.nfcComanda.findMany({ where: { restaurantId, customerId, status: { in: [NfcComandaStatus.UNPAID, NfcComandaStatus.OPEN] }, dueAt: { lte: now } },
    select: { totalCents: true, paidCents: true } });
  return rows.reduce((sum, row) => sum + row.totalCents - row.paidCents, 0n);
}
async function statusOfCustomer(restaurantId: number, customerId: string) {
  return withTenantDbContext(restaurantId, async (tx) => ({
    debtCents: Number(await customerDebt(tx, restaurantId, customerId)),
    hasOpenComanda: await tx.nfcComanda.count({ where: { restaurantId, customerId, status: NfcComandaStatus.OPEN } }) > 0,
  }));
}
router.get('/customers/:customerId', async (req, res) => {
  try {
    const restaurantId = tenant(req), customerId = id(req.params.customerId);
    const result = await withTenantDbContext(restaurantId, async (tx) => {
      const customer = await tx.nfcCustomer.findFirst({ where: { restaurantId, id: customerId }, select: { id: true } });
      if (!customer) throw new NfcFinancialError(404, 'Cliente não encontrado.');
      const [comandas, outstandingCents, active] = await Promise.all([
        tx.nfcComanda.findMany({ where: { restaurantId, customerId }, select: accountSelect, orderBy: { openedAt: 'desc' }, take: 100 }),
        customerDebt(tx, restaurantId, customerId),
        tx.nfcComanda.count({ where: { restaurantId, customerId, status: NfcComandaStatus.OPEN } }),
      ]);
      return { customerId, blocked: outstandingCents > 0n, outstandingCents: Number(outstandingCents), hasOpenComanda: active > 0,
        comandas: comandas.map(project) };
    });
    res.setHeader('Cache-Control', 'no-store');
    return res.json(result);
  } catch (error) { return fail(res, error); }
});
router.get('/customers/:customerId/status', async (req, res) => {
  try {
    const restaurantId = tenant(req), customerId = id(req.params.customerId);
    return res.json(await statusOfCustomer(restaurantId, customerId));
  } catch (error) { return fail(res, error); }
});
// NFC ordering/checkout remains closed until operational integration and provider homologation.
router.post('/open', async (req, res) => {
  try {
    const restaurantId = tenant(req), payload = openSchema.parse(req.body), key = requestKey(req.headers['idempotency-key']);
    const saved = await prisma.$transaction(async (tx) => {
      await setTenantDbContext(tx, restaurantId);
      const mode = await tx.restaurantSettings.findUnique({
        where: { restaurantId }, select: { inPersonServiceMode: true },
      });
      if (mode?.inPersonServiceMode === 'QR_ONLY') {
        throw new NfcFinancialError(409, 'Ative atendimento NFC ou Ambos nas configurações do restaurante.');
      }
      await lockCustomer(tx, restaurantId, payload.customerId);
      const existing = await tx.nfcComanda.findFirst({ where: { restaurantId, customerId: payload.customerId, openRequestKeyHash: key }, select: accountSelect });
      if (existing) return existing;
      const debt = await customerDebt(tx, restaurantId, payload.customerId);
      if (debt > 0n) throw new NfcFinancialError(403, 'Cliente com pendência financeira. Quite o saldo antes de abrir nova comanda.');
      const alreadyOpen = await tx.nfcComanda.count({ where: { restaurantId, customerId: payload.customerId, status: NfcComandaStatus.OPEN } });
      if (alreadyOpen) throw new NfcFinancialError(409, 'Este cliente já possui uma comanda aberta.');
      if (payload.cardId) {
        const card = await tx.nfcCard.findFirst({ where: { id: payload.cardId, restaurantId, customerId: payload.customerId, status: 'ACTIVE' }, select: { id: true } });
        if (!card) throw new NfcFinancialError(409, 'Cartão não ativado ou não associado a este cliente.');
      }
      const settings = await tx.restaurantSettings.findFirst({ where: { restaurantId }, select: { nfcCoverChargeCents: true, nfcDebtDeadlineMode: true, businessHours: true, timezone: true } });
      const coverCents = settings?.nfcCoverChargeCents || 0;
      const created = await tx.nfcComanda.create({ data: {
        id: randomUUID(), restaurantId, customerId: payload.customerId, cardId: payload.cardId,
        tableNumber: payload.tableNumber ?? null, openRequestKeyHash: key,
        openedByUserId: actor(req), totalCents: BigInt(coverCents),
        dueAt: calculateNfcComandaDueAt({ openedAt: new Date(), mode: settings?.nfcDebtDeadlineMode || 'TWENTY_FOUR_HOURS', businessHours: settings?.businessHours, timeZone: settings?.timezone }),
        ...(coverCents > 0 ? { items: { create: { id: randomUUID(), restaurantId,
          kind: 'COVER', description: 'Entrada / couvert', quantity: 1,
          unitPriceCents: BigInt(coverCents), totalCents: BigInt(coverCents) } } } : {}),
      }, select: accountSelect });
      await tx.nfcRegistrationAudit.create({ data: { restaurantId, actorUserId: actor(req), customerId: payload.customerId, cardId: payload.cardId, action: 'COMANDA_OPENED' } });
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return res.status(201).json({ comanda: project(saved), warning: 'Lançamento de produtos por NFC permanece indisponível até homologação.' });
  } catch (error) { return fail(res, error); }
});
router.post('/:comandaId/close', async (req, res) => {
  try {
    const restaurantId = tenant(req), comandaId = id(req.params.comandaId);
    const updated = await prisma.$transaction(async (tx) => {
      await setTenantDbContext(tx, restaurantId);
      await lockComanda(tx, restaurantId, comandaId);
      const comanda = await tx.nfcComanda.findFirst({ where: { id: comandaId, restaurantId }, select: { status: true, totalCents: true, paidCents: true, cardId: true, customerId: true } });
      if (!comanda) throw new NfcFinancialError(404, 'Comanda não encontrada.');
      if (comanda.status !== 'OPEN') return comanda.status;
      await assertNoActiveCashlessCheckout(tx, restaurantId, comandaId);
      await assertNoPendingCash(tx, restaurantId, comandaId);
      const isPaid = comanda.totalCents === comanda.paidCents;
      await tx.nfcComanda.updateMany({ where: { id: comandaId, restaurantId, status: 'OPEN' }, data: { status: isPaid ? 'PAID' : 'UNPAID',
        closedAt: new Date(), closedByUserId: actor(req), paidAt: isPaid ? new Date() : null } });
      if (isPaid && comanda.cardId) await tx.nfcCard.updateMany({ where: { id: comanda.cardId, restaurantId, customerId: comanda.customerId, status: 'ACTIVE' }, data: { status: 'REVOKED', revokedAt: new Date(), revokeReason: 'CARD_RETURNED_AFTER_PAYMENT', revokedByUserId: actor(req) } });
      await tx.nfcRegistrationAudit.create({ data: { restaurantId, actorUserId: actor(req), customerId: comanda.customerId, cardId: comanda.cardId, action: isPaid ? 'COMANDA_PAID' : 'COMANDA_UNPAID' } });
      return isPaid ? 'PAID' : 'UNPAID';
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return res.json({ status: updated });
  } catch (error) { return fail(res, error); }
});
router.post('/:comandaId/payments/cash', async (req, res) => {
  try {
    const restaurantId = tenant(req), comandaId = id(req.params.comandaId);
    const { amountCents } = cashSchema.parse(req.body), key = requestKey(req.headers['idempotency-key']);
    const fingerprint = createHash('sha256').update(String(amountCents) + ':CASH').digest('hex');
    const result = await prisma.$transaction(async (tx) => {
      await setTenantDbContext(tx, restaurantId);
      await lockComanda(tx, restaurantId, comandaId);
      const comanda = await tx.nfcComanda.findFirst({ where: { restaurantId, id: comandaId }, select: { id: true, customerId: true, status: true, totalCents: true, paidCents: true } });
      if (!comanda) throw new NfcFinancialError(404, 'Comanda não encontrada.');
      const old = await tx.nfcComandaPayment.findFirst({ where: { restaurantId, comandaId, requestKeyHash: key } });
      if (old) {
        if (old.requestFingerprint !== fingerprint) throw new NfcFinancialError(409, 'Chave de pagamento reutilizada com outro valor.');
        return { paymentId: old.id, status: old.status };
      }
      if (comanda.status !== 'OPEN' && comanda.status !== 'UNPAID') {
        throw new NfcFinancialError(409, 'Comanda já quitada.');
      }
      await assertNoActiveCashlessCheckout(tx, restaurantId, comandaId);
      await assertNoPendingCash(tx, restaurantId, comandaId);
      const due = comanda.totalCents - comanda.paidCents;
      if (BigInt(amountCents) > due) throw new NfcFinancialError(422, 'Valor superior ao saldo devido.');
      const payment = await tx.nfcComandaPayment.create({ data: { id: randomUUID(), restaurantId, comandaId,
        amountCents: BigInt(amountCents), method: PaymentMethod.DINHEIRO, status: 'PENDING',
        requestKeyHash: key, requestFingerprint: fingerprint, recordedByUserId: actor(req) } });
      return { paymentId: payment.id, status: payment.status };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(201).json({ ...result, warning: 'Aguardando confirmação de recebimento pelo administrador.' });
  } catch (error) { return fail(res, error); }
});
// Staff can release an unreceived cash reservation; this is not a refund.
router.post('/payments/:paymentId/cancel-cash', async (req, res) => {
  try {
    if (String(req.user.role) !== 'ADMIN') throw new NfcFinancialError(403, 'Somente o administrador pode cancelar recebimento de dinheiro.');
    const restaurantId = tenant(req), paymentId = id(req.params.paymentId);
    const result = await prisma.$transaction(async (tx) => {
      await setTenantDbContext(tx, restaurantId);
      const preliminary = await tx.nfcComandaPayment.findFirst({
        where: { id: paymentId, restaurantId }, select: { comandaId: true },
      });
      if (!preliminary) throw new NfcFinancialError(404, 'Pagamento não encontrado.');
      await lockComanda(tx, restaurantId, preliminary.comandaId);
      const payment = await tx.nfcComandaPayment.findFirst({ where: { id: paymentId, restaurantId } });
      if (!payment || payment.method !== 'DINHEIRO') throw new NfcFinancialError(409, 'Pagamento não é em dinheiro.');
      if (payment.status === 'REVERSED') return { status: 'REVERSED', repeated: true };
      if (payment.status !== 'PENDING') throw new NfcFinancialError(409, 'Recebimento confirmado não pode ser cancelado por esta rota.');
      const updated = await tx.nfcComandaPayment.updateMany({
        where: { id: paymentId, restaurantId, status: 'PENDING' },
        data: { status: 'REVERSED', reversedAt: new Date() },
      });
      if (updated.count !== 1) throw new NfcFinancialError(409, 'Recebimento já alterado.');
      return { status: 'REVERSED', repeated: false };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return res.json(result);
  } catch (error) { return fail(res, error); }
});
router.post('/payments/:paymentId/confirm-cash', async (req, res) => {
  try {
    if (String(req.user.role) !== 'ADMIN') throw new NfcFinancialError(403, 'Somente o administrador pode confirmar recebimento de dinheiro.');
    const restaurantId = tenant(req), paymentId = id(req.params.paymentId);
    const result = await prisma.$transaction(async (tx) => {
      await setTenantDbContext(tx, restaurantId);
      const prelim = await tx.nfcComandaPayment.findFirst({ where: { id: paymentId, restaurantId }, select: { comandaId: true } });
      if (!prelim) throw new NfcFinancialError(404, 'Pagamento não encontrado.');
      await lockComanda(tx, restaurantId, prelim.comandaId);
      const payment = await tx.nfcComandaPayment.findFirst({ where: { id: paymentId, restaurantId } });
      if (!payment) throw new NfcFinancialError(404, 'Pagamento não encontrado.');
      if (payment.status === 'CONFIRMED') return { status: 'CONFIRMED', repeated: true };
      if (payment.status !== 'PENDING' || payment.method !== 'DINHEIRO') throw new NfcFinancialError(409, 'Pagamento inválido para confirmação manual.');
      await assertNoActiveCashlessCheckout(tx, restaurantId, payment.comandaId);
      const comanda = await tx.nfcComanda.findFirst({ where: { id: payment.comandaId, restaurantId } });
      if (!comanda || comanda.status === 'PAID' || comanda.totalCents - comanda.paidCents < payment.amountCents) throw new NfcFinancialError(409, 'Saldo insuficiente ou comanda já liquidada.');
      const confirmed = await tx.nfcComandaPayment.updateMany({ where: { id: paymentId, restaurantId, status: 'PENDING' },
        data: { status: 'CONFIRMED', confirmedByUserId: actor(req), confirmedAt: new Date() } });
      if (confirmed.count !== 1) throw new NfcFinancialError(409, 'Pagamento já processado por outro operador.');
      const fullyPaid = comanda.totalCents === comanda.paidCents + payment.amountCents;
      const credited = await tx.nfcComanda.updateMany({ where: { restaurantId, id: payment.comandaId, status: { in: ['OPEN', 'UNPAID'] },
        paidCents: { lte: comanda.totalCents - payment.amountCents } },
        data: { paidCents: { increment: payment.amountCents },
          ...(fullyPaid && comanda.status === 'UNPAID' ? { status: 'PAID', paidAt: new Date() } : {}) } });
      if (credited.count !== 1) throw new NfcFinancialError(409, 'O saldo mudou; pagamento não creditado.');
      if (fullyPaid && comanda.status === 'UNPAID' && comanda.cardId) await tx.nfcCard.updateMany({
        where: { id: comanda.cardId, restaurantId, customerId: comanda.customerId, status: 'ACTIVE' },
        data: { status: 'REVOKED', revokedByUserId: actor(req), revokedAt: new Date(), revokeReason: 'CARD_RETURNED_AFTER_PAYMENT' },
      });
      await tx.nfcRegistrationAudit.create({ data: { restaurantId, actorUserId: actor(req), customerId: comanda.customerId, cardId: comanda.cardId, action: fullyPaid ? 'COMANDA_PAID' : 'PAYMENT_PARTIAL' } });
      return { status: 'CONFIRMED', fullyPaid, repeated: false };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return res.json(result);
  } catch (error) { return fail(res, error); }
});
export default router;
