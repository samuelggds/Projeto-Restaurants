import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z, ZodError } from 'zod';
import prisma from '../../../config/prisma.js';
import { setTenantDbContext } from '../../../database/tenantDbContext.js';
import { normalizeNfcCpf, NfcRegistrationError } from '../domain/nfcRegistrationRules.js';
import { nfcCpfFingerprints } from '../security/nfcCustomerPii.js';
import { nfcCustomerDeletionEligibility } from '../services/nfcCustomerDeletionEligibility.js';

const router = Router();
const reactivateSchema = z.strictObject({
  cpf: z.string().trim().min(11).max(18),
  confirmation: z.literal('REATIVAR CADASTRO'),
});

// Previously archived profiles keep their CPF uniqueness and financial history.
// Reactivation is an explicit administrator action, never an automatic side
// effect of NFC enrollment or a staff search.
router.post('/customers/reactivate', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, private');
  try {
    if (String(req.user.role).toUpperCase() !== 'ADMIN') {
      throw new NfcRegistrationError(403, 'Somente o administrador pode reativar cadastros NFC.');
    }
    const { cpf: input } = reactivateSchema.parse(req.body);
    const restaurantId = Number(req.user.restaurantId);
    const fingerprints = nfcCpfFingerprints(restaurantId, normalizeNfcCpf(input));
    const customerId = await prisma.$transaction(async tx => {
      await setTenantDbContext(tx, restaurantId);
      const candidate = await tx.nfcCustomer.findFirst({
        where: { restaurantId, cpfFingerprint: { in: fingerprints } },
        select: { id: true },
      });
      if (!candidate) throw new NfcRegistrationError(404, 'Cadastro não encontrado neste restaurante.');
      const locked = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "NfcCustomer" WHERE "restaurantId"=${restaurantId}
          AND "id"=${candidate.id}::uuid FOR UPDATE
      `;
      if (locked.length !== 1) throw new NfcRegistrationError(409, 'Cadastro alterado. Consulte novamente.');
      const current = await tx.nfcCustomer.findFirst({
        where: { id: candidate.id, restaurantId, cpfFingerprint: { in: fingerprints } },
        select: { id: true, archivedAt: true },
      });
      if (!current) throw new NfcRegistrationError(409, 'Cadastro alterado. Consulte novamente.');
      if (!current.archivedAt) throw new NfcRegistrationError(409, 'Este cadastro já está ativo neste restaurante.');
      // Refuse reactivation while any linked card, payment, visit or order remains unsettled.
      const eligibility = await nfcCustomerDeletionEligibility(tx, restaurantId, current.id);
      if (!eligibility.eligible) {
        throw new NfcRegistrationError(409, eligibility.reason || 'Regularize as pendências antes de reativar.');
      }
      const updated = await tx.nfcCustomer.updateMany({
        where: { id: current.id, restaurantId, archivedAt: { not: null }, cpfFingerprint: { in: fingerprints } },
        data: { archivedAt: null },
      });
      if (updated.count !== 1) throw new NfcRegistrationError(409, 'Cadastro alterado. Consulte novamente.');
      await tx.nfcRegistrationAudit.create({
        data: { restaurantId, actorUserId: Number(req.user.id), customerId: current.id, action: 'CUSTOMER_REACTIVATED' },
      });
      return current.id;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return res.json({ reactivated: true, customerId });
  } catch (error) {
    const status = error instanceof ZodError ? 422
      : error instanceof NfcRegistrationError ? error.statusCode : 500;
    const message = error instanceof ZodError
      ? error.issues[0]?.message
      : error instanceof NfcRegistrationError ? error.message : 'Não foi possível reativar o cadastro NFC.';
    return res.status(status).json({ error: message });
  }
});

export default router;
