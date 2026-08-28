import 'dotenv/config';
import bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';
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
  buildAdminChangeConfirmation,
  buildSuperAdminAfterState,
  snapshotsMatch,
} from './_shared/adminChangePlan.mjs';
import { assertOperationalEnvironment } from './_shared/environmentGuard.mjs';
import { redactEmail, safeError } from './_shared/redaction.mjs';

const ADMIN_CHANGE_ADVISORY_LOCK = 742839105;

const parsed = parseCliArgs(process.argv.slice(2));
rejectPositionals(parsed);
assertAllowedOptions(parsed, [
  'email',
  'environment',
  'create-if-missing',
  'reset-password',
  'activate',
  'apply',
  'dry-run',
  'reason',
  'confirm',
  'allow-production',
  'name',
  'password-env',
]);

const email = requiredString(parsed, 'Email do usuário', 'email').trim().toLowerCase();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
  throw new Error('--email deve conter um endereço de email válido.');
}

const targetEnvironment = requiredString(parsed, 'Ambiente alvo', 'environment');
const createIfMissing = hasFlag(parsed, 'create-if-missing');
const resetPassword = hasFlag(parsed, 'reset-password');
const activate = hasFlag(parsed, 'activate');
const mode = resolveExecutionMode({
  apply: hasFlag(parsed, 'apply'),
  dryRun: hasFlag(parsed, 'dry-run'),
});
const reason = optionalString(parsed, 'reason');
const confirmation = optionalString(parsed, 'confirm');
const context = assertOperationalEnvironment({
  targetEnvironment,
  allowProduction: hasFlag(parsed, 'allow-production'),
});

requireReason(mode, reason);

const name = optionalString(parsed, 'name');
const passwordEnvironmentKey = optionalString(parsed, 'password-env');
if (passwordEnvironmentKey && !/^[A-Z][A-Z0-9_]*$/u.test(passwordEnvironmentKey)) {
  throw new Error('--password-env deve ser o nome de uma variável de ambiente em maiúsculas.');
}
let password = '';

async function main() {
  const existing = await prisma.user.findFirst({
    where: {
      email: {
        equals: email,
        mode: 'insensitive',
      },
    },
    select: {
      id: true,
      email: true,
      role: true,
      active: true,
      restaurantId: true,
      subRole: true,
      authVersion: true,
      mfaEnabled: true,
      mustChangePassword: true,
    },
  });

  if (!existing && !createIfMissing) {
    throw new Error(
      'Usuário não encontrado. A criação exige a opção explícita --create-if-missing.',
    );
  }
  if (!existing && !name) {
    throw new Error('--name é obrigatório quando um SUPER_ADMIN será criado.');
  }

  const needsPassword = !existing || resetPassword;
  if (needsPassword && !passwordEnvironmentKey) {
    throw new Error(
      '--password-env é obrigatório quando um usuário será criado ou terá a senha redefinida.',
    );
  }

  const before = existing
    ? {
        role: existing.role,
        subRole: existing.subRole,
        restaurantId: existing.restaurantId,
        active: existing.active,
        authVersion: existing.authVersion,
        mfaEnabled: existing.mfaEnabled,
        mustChangePassword: existing.mustChangePassword,
      }
    : null;
  const after = buildSuperAdminAfterState({ existing, activate, resetPassword });
  const requested = {
    environment: context.target,
    allowProduction: hasFlag(parsed, 'allow-production'),
    activate,
    resetPassword,
    createIfMissing,
    name: name || null,
    passwordEnvironmentKey: passwordEnvironmentKey || null,
  };
  const expectedConfirmation = buildAdminChangeConfirmation({
    action: 'PROMOTE_SUPER_ADMIN',
    databaseLabel: context.databaseLabel,
    email,
    targetId: existing?.id ?? null,
    before,
    after,
    requested,
  });

  const plan = {
    mode,
    environment: context.target,
    database: context.database,
    target: {
      userId: existing?.id ?? null,
      email: redactEmail(email),
    },
    action: existing ? 'promote_existing_user' : 'create_super_admin',
    before,
    after,
    requested,
    revokeRefreshSession: Boolean(existing),
    revokeAccessTokens: Boolean(existing),
    enableMfa: true,
    requirePasswordChange: after.mustChangePassword,
    clearLoginLockout: true,
    reason: reason || null,
    confirmation: expectedConfirmation,
  };

  requireWriteConfirmation({
    mode,
    provided: confirmation,
    expected: expectedConfirmation,
    action: 'promover usuário a SUPER_ADMIN',
  });

  if (mode === 'dry-run') {
    console.log(JSON.stringify(plan, null, 2));
    console.log(
      `DRY_RUN: nenhuma alteração feita. Para aplicar, use --apply --confirm=${expectedConfirmation}.`,
    );
    return;
  }

  if (needsPassword) {
    password = String(process.env[passwordEnvironmentKey] ?? '');
    if (password.length < 12) {
      throw new Error(
        `A variável ${passwordEnvironmentKey} deve conter uma senha com pelo menos 12 caracteres. O valor não foi exibido.`,
      );
    }
  }

  const passwordHash = password ? await bcrypt.hash(password, 12) : undefined;
  const result = await prisma.$transaction(async (transaction) => {
    // Compartilha a mesma trava dos demais fluxos administrativos e do bootstrap
    // para que duas promoções concorrentes não observem a ausência de SUPER_ADMIN.
    await transaction.$queryRaw`SELECT pg_advisory_xact_lock(${ADMIN_CHANGE_ADVISORY_LOCK})`;

    const anotherSuperAdmin = await transaction.user.findFirst({
      where: {
        role: UserRole.SUPER_ADMIN,
        ...(existing ? { id: { not: existing.id } } : {}),
      },
      select: { id: true },
    });
    if (anotherSuperAdmin) {
      throw new Error(
        'Operação bloqueada: já existe um SUPER_ADMIN. A plataforma permite somente uma conta com esse papel.',
      );
    }

    let updated;
    if (existing) {
      const snapshotFields = [
        'id',
        'email',
        'role',
        'subRole',
        'restaurantId',
        'active',
        'authVersion',
        'mfaEnabled',
        'mustChangePassword',
      ];
      const current = await transaction.user.findUnique({
        where: { id: existing.id },
        select: {
          id: true,
          email: true,
          role: true,
          subRole: true,
          restaurantId: true,
          active: true,
          authVersion: true,
          mfaEnabled: true,
          mustChangePassword: true,
        },
      });
      if (!current || !snapshotsMatch(current, existing, snapshotFields)) {
        throw new Error(
          'O usuário mudou após a confirmação. Execute novamente o dry-run e confirme o novo plano.',
        );
      }

      const mutation = await transaction.user.updateMany({
        where: {
          id: existing.id,
          email: existing.email,
          role: existing.role,
          subRole: existing.subRole,
          restaurantId: existing.restaurantId,
          active: existing.active,
          authVersion: existing.authVersion,
          mfaEnabled: existing.mfaEnabled,
          mustChangePassword: existing.mustChangePassword,
        },
        data: {
          role: UserRole.SUPER_ADMIN,
          restaurantId: null,
          subRole: null,
          mfaEnabled: true,
          authVersion: { increment: 1 },
          ...(activate ? { active: true } : {}),
          ...(passwordHash
            ? {
                password: passwordHash,
                mustChangePassword: true,
              }
            : {}),
        },
      });
      if (mutation.count !== 1) {
        throw new Error(
          'O usuário mudou durante a operação. Nenhuma promoção foi concluída; revise o novo dry-run.',
        );
      }
      updated = await transaction.user.findUniqueOrThrow({
        where: { id: existing.id },
        select: {
          id: true,
          role: true,
          active: true,
          authVersion: true,
          mfaEnabled: true,
          mustChangePassword: true,
        },
      });
    } else {
      updated = await transaction.user.create({
        data: {
          name,
          email,
          password: passwordHash!,
          role: UserRole.SUPER_ADMIN,
          active: true,
          restaurantId: null,
          subRole: null,
          mustChangePassword: true,
          mfaEnabled: true,
        },
        select: {
          id: true,
          role: true,
          active: true,
          authVersion: true,
          mfaEnabled: true,
          mustChangePassword: true,
        },
      });
    }

    const [lockout, refreshSession, mfaChallenge] = await Promise.all([
      transaction.loginLockout.deleteMany({ where: { emailNormalized: email } }),
      transaction.authRefreshSession.deleteMany({ where: { userId: updated.id } }),
      transaction.authMfaChallenge.deleteMany({ where: { userId: updated.id } }),
    ]);

    return {
      user: updated,
      lockoutsCleared: lockout.count,
      refreshSessionsRevoked: refreshSession.count,
      mfaChallengesRevoked: mfaChallenge.count,
    };
  });

  console.log(
    JSON.stringify(
      {
        status: existing ? 'promoted' : 'created',
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
    password = '';
    await prisma.$disconnect();
  });
