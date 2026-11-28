import type { Prisma } from '@prisma/client';
import prisma from '../../../config/prisma.js';

export async function getTrialSignupAvailability(db: Prisma.TransactionClient = prisma) {
  const settings = await db.platformSettings.findUnique({
    where: { id: 1 },
    select: { allowRestaurantSignup: true, requireManualApproval: true },
  });
  const manualApproval = settings?.requireManualApproval ?? true;
  return { available: Boolean(settings?.allowRestaurantSignup && !manualApproval), manualApproval };
}

export class TrialSignupUnavailableError extends Error {
  constructor() {
    super('A ativação automática está indisponível. Fale com a equipe da GastroNexa para cadastrar o restaurante.');
  }
}

export async function ensureTrialSignupAvailable(db: Prisma.TransactionClient = prisma) {
  if (!(await getTrialSignupAvailability(db)).available) throw new TrialSignupUnavailableError();
}
