import 'dotenv/config';
import { FuncionarioSubRole, UserRole } from '@prisma/client';
import prisma from '../src/config/prisma.js';
import {
  assertAllowedOptions,
  hasFlag,
  optionalString,
  parseCliArgs,
  rejectPositionals,
  requiredString,
} from './_shared/cli.mjs';
import {
  requireReason,
  requireWriteConfirmation,
  resolveExecutionMode,
} from './_shared/confirmation.mjs';
import {
  assertActiveSuperAdminContinuity,
  buildAdminChangeConfirmation,
  snapshotsMatch,
} from './_shared/adminChangePlan.mjs';
import { assertOperationalEnvironment } from './_shared/environmentGuard.mjs';
import { redactEmail, safeError } from './_shared/redaction.mjs';

async function main() {
  const parsed = parseCliArgs(process.argv.slice(2));
  rejectPositionals(parsed);
  assertAllowedOptions(parsed, [
    'email',
    'role',
    'sub-role',
    'environment',
    'apply',
    'dry-run',
    'reason',
    'confirm',
    'allow-production',
  ]);
  const email = requiredString(parsed, 'Email do usuário', 'email').trim().toLowerCase();
  const roleName = requiredString(parsed, 'Novo papel', 'role').trim().toUpperCase();
  const targetEnvironment = requiredString(parsed, 'Ambiente alvo', 'environment');
  const mode = resolveExecutionMode({
    apply: hasFlag(parsed, 'apply'),
    dryRun: hasFlag(parsed, 'dry-run'),
  });
  const reason = optionalString(parsed, 'reason');
  const confirmation = optionalString(parsed, 'confirm');

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
    throw new Error('--email deve conter um endereço válido.');
  }
  if (!Object.values(UserRole).includes(roleName as UserRole)) {
    throw new Error('--role deve ser ADMIN, FUNCIONARIO, CLIENTE ou MOTOQUEIRO.');
  }

  const nextRole = roleName as UserRole;
  if (nextRole === UserRole.SUPER_ADMIN) {
    throw new Error(
      'SUPER_ADMIN só pode ser concedido pelo script promoteUserToSuperAdmin.ts, que aplica controles adicionais.',
    );
  }

  const rawSubRole = optionalString(parsed, 'sub-role').toUpperCase();
  const validSubRole = Object.values(FuncionarioSubRole).includes(rawSubRole as FuncionarioSubRole);
  if (rawSubRole && !validSubRole) {
    throw new Error('--sub-role deve ser COZINHA ou GARCOM.');
  }
  const nextSubRole = rawSubRole ? (rawSubRole as FuncionarioSubRole) : null;
  if (nextRole !== UserRole.FUNCIONARIO && nextSubRole) {
    throw new Error('--sub-role só pode ser usado com --role FUNCIONARIO.');
  }

  const context = assertOperationalEnvironment({
    targetEnvironment,
    allowProduction: hasFlag(parsed, 'allow-production'),
  });
  requireReason(mode, reason);

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    select: {
      id: true,
      email: true,
      role: true,
      subRole: true,
      active: true,
      authVersion: true,
    },
  });
  if (!user) throw new Error('Usuário não encontrado.');

  const before = {
    role: user.role,
    subRole: user.subRole,
    active: user.active,
    authVersion: user.authVersion,
  };
  const after = {
    role: nextRole,
    subRole: nextRole === UserRole.FUNCIONARIO ? nextSubRole : null,
    active: user.active,
    authVersion: user.authVersion + 1,
  };
  const activeSuperAdminCount =
    user.role === UserRole.SUPER_ADMIN && user.active
      ? await prisma.user.count({
          where: { role: UserRole.SUPER_ADMIN, active: true },
        })
      : null;
  assertActiveSuperAdminContinuity({
    before,
    after,
    activeSuperAdminCount: activeSuperAdminCount ?? 0,
  });
  const requested = {
    environment: context.target,
    allowProduction: hasFlag(parsed, 'allow-production'),
    role: nextRole,
    subRole: after.subRole,
  };
  const expectedConfirmation = buildAdminChangeConfirmation({
    action: 'SET_USER_ROLE',
    databaseLabel: context.databaseLabel,
    email,
    targetId: user.id,
    before,
    after,
    requested,
  });

  const plan = {
    mode,
    environment: context.target,
    database: context.database,
    target: { id: user.id, email: redactEmail(email) },
    before,
    after,
    requested,
    activeSuperAdminCount,
    protectsLastActiveSuperAdmin: true,
    revokeSessions: true,
    reason: reason || null,
    confirmation: expectedConfirmation,
  };

  requireWriteConfirmation({
    mode,
    provided: confirmation,
    expected: expectedConfirmation,
    action: 'alterar papel de usuário',
  });

  if (mode === 'dry-run') {
    console.log(JSON.stringify(plan, null, 2));
    console.log(`DRY_RUN: para aplicar, use --apply --confirm=${expectedConfirmation}.`);
    return;
  }

  const result = await prisma.$transaction(async (transaction) => {
    // Serializa mudanças administrativas para impedir duas demissões concorrentes
    // de observarem o mesmo total de SUPER_ADMINs ativos.
    await transaction.$queryRaw`SELECT pg_advisory_xact_lock(742839105)`;
    const current = await transaction.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        role: true,
        subRole: true,
        active: true,
        authVersion: true,
      },
    });
    const snapshotFields = ['id', 'email', 'role', 'subRole', 'active', 'authVersion'];
    if (!current || !snapshotsMatch(current, user, snapshotFields)) {
      throw new Error(
        'O usuário mudou após a confirmação. Execute novamente o dry-run e confirme o novo plano.',
      );
    }

    const currentActiveSuperAdminCount =
      current.role === UserRole.SUPER_ADMIN && current.active
        ? await transaction.user.count({
            where: { role: UserRole.SUPER_ADMIN, active: true },
          })
        : 0;
    assertActiveSuperAdminContinuity({
      before: current,
      after,
      activeSuperAdminCount: currentActiveSuperAdminCount,
    });

    const mutation = await transaction.user.updateMany({
      where: {
        id: user.id,
        email: user.email,
        role: user.role,
        subRole: user.subRole,
        active: user.active,
        authVersion: user.authVersion,
      },
      data: {
        role: nextRole,
        subRole: after.subRole,
        authVersion: { increment: 1 },
      },
    });
    if (mutation.count !== 1) {
      throw new Error(
        'O usuário mudou durante a operação. Nenhuma alteração de papel foi concluída.',
      );
    }
    const updated = await transaction.user.findUniqueOrThrow({
      where: { id: user.id },
      select: {
        id: true,
        role: true,
        subRole: true,
        active: true,
        authVersion: true,
      },
    });
    const [refreshSessions, mfaChallenges] = await Promise.all([
      transaction.authRefreshSession.deleteMany({ where: { userId: user.id } }),
      transaction.authMfaChallenge.deleteMany({ where: { userId: user.id } }),
    ]);
    return {
      updated,
      refreshSessionsRevoked: refreshSessions.count,
      mfaChallengesRevoked: mfaChallenges.count,
    };
  });

  console.log(
    JSON.stringify(
      {
        status: 'role_updated',
        environment: context.target,
        email: redactEmail(email),
        ...result,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(safeError(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
