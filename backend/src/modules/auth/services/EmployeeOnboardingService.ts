import prisma from '../../../config/prisma.js';

const ALLOWED_SUB_ROLES = new Set(['COZINHA', 'GARCOM', 'ATENDENTE']);

export type EmployeeOnboardingActor = {
  userId: number;
  role?: string | null;
  subRole?: string | null;
};

function normalize(value: unknown) {
  return String(value || '')
    .trim()
    .toUpperCase();
}

function assertEligible(actor: EmployeeOnboardingActor) {
  const userId = Number(actor.userId);
  const role = normalize(actor.role);
  const subRole = normalize(actor.subRole);

  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error('Usuário inválido para o onboarding.');
  }

  const eligible = role === 'MOTOQUEIRO' || (role === 'FUNCIONARIO' && ALLOWED_SUB_ROLES.has(subRole));
  if (!eligible) {
    throw new Error('Este onboarding é exclusivo para contas operacionais de funcionários.');
  }

  return { userId, role, subRole };
}

class EmployeeOnboardingService {
  async claim(actor: EmployeeOnboardingActor) {
    const normalized = assertEligible(actor);
    const rows = await prisma.$queryRaw<Array<{ userId: number }>>`
      INSERT INTO "EmployeeOnboardingState" ("userId", "claimedAt")
      VALUES (${normalized.userId}, CURRENT_TIMESTAMP)
      ON CONFLICT ("userId") DO NOTHING
      RETURNING "userId"
    `;

    return {
      showOnboarding: rows.length === 1,
      role: normalized.role,
      subRole: normalized.subRole || null,
    };
  }
}

export default new EmployeeOnboardingService();
