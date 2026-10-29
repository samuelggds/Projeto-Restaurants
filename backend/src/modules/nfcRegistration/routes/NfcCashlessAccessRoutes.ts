import { Router } from 'express';
import crypto from 'node:crypto';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '../../../config/prisma.js';
import { setTenantDbContext } from '../../../database/tenantDbContext.js';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import { nfcRegistrationAccessMiddleware } from '../../../middlewares/nfcRegistrationAccessMiddleware.js';

const router = Router();
const uuid = z.uuid();
const codeHash = (restaurantId: number, comandaId: string, code: string) =>
  crypto.createHmac('sha256', process.env.CREDENTIAL_ENCRYPTION_KEY || '').update(`${restaurantId}:${comandaId}:${code}`).digest('hex');
const STAFF_CODE_TTL = 8 * 60 * 60 * 1000;
function failure(res: import('express').Response, error: unknown) {
  const message = error instanceof Error ? error.message : '';
  const known = ['Comanda indisponível.', 'Credencial inválida ou expirada.', 'Acesso temporariamente bloqueado.', 'Acesso não autorizado.'];
  const status = message.includes('bloqueado') ? 429 : 403;
  return res.status(known.includes(message) ? status : 500).json({
    error: known.includes(message) ? message : 'Não foi possível concluir a operação.',
  });
}
router.post('/staff/comandas/:id/access-code', authMiddleware, nfcRegistrationAccessMiddleware, async (req, res) => {
  try {
    const restaurantId = Number(req.user.restaurantId), comandaId = uuid.parse(req.params.id);
    if (!process.env.CREDENTIAL_ENCRYPTION_KEY) throw new Error('Missing credential encryption key');
    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
    const result = await prisma.$transaction(async tx => {
      await setTenantDbContext(tx, restaurantId);
      const comanda = await tx.nfcComanda.findFirst({ where: { id: comandaId, restaurantId, status: 'OPEN' }, select: { id: true } });
      if (!comanda) throw new Error('Comanda indisponível.');
      await tx.nfcComandaAccess.updateMany({
        where: { restaurantId, comandaId, revokedAt: null },
        data: { revokedAt: new Date(), sessionHash: null },
      });
      const saved = await tx.nfcComandaAccess.create({
        data: { restaurantId, comandaId, codeHash: codeHash(restaurantId, comandaId, code),
          expiresAt: new Date(Date.now() + STAFF_CODE_TTL), createdByUserId: Number(req.user.id) },
        select: { expiresAt: true },
      });
      return saved;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(201).json({ code, expiresAt: result.expiresAt,
      notice: 'Código mostrado uma única vez. Entregue ao cliente pelo canal autorizado.' });
  } catch (error) { return failure(res, error); }
});
// Public view is intentionally unavailable until tenant-scoped QR proof and
// distributed attempt throttling are integrated. A six-digit code alone is not
// sufficient proof to select a customer from a public table.
router.post('/guest/verify', (_req, res) => res.status(503).json({
  error: 'Consulta cashless em homologação. Nenhuma comanda foi exposta.',
}));
export default router;
