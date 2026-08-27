import 'dotenv/config';
import prisma from '../src/config/prisma.js';
import {
  assertAllowedOptions,
  hasFlag,
  parseCliArgs,
  rejectPositionals,
  requiredString,
} from './_shared/cli.mjs';
import { assertOperationalEnvironment } from './_shared/environmentGuard.mjs';
import { redactEmail, safeError } from './_shared/redaction.mjs';

async function main() {
  const parsed = parseCliArgs(process.argv.slice(2));
  rejectPositionals(parsed);
  assertAllowedOptions(parsed, ['email', 'environment', 'allow-production']);
  const email = requiredString(parsed, 'Email do usuário', 'email').trim().toLowerCase();
  const targetEnvironment = requiredString(parsed, 'Ambiente alvo', 'environment');
  const context = assertOperationalEnvironment({
    targetEnvironment,
    allowProduction: hasFlag(parsed, 'allow-production'),
  });

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    select: {
      id: true,
      role: true,
      subRole: true,
      active: true,
      restaurantId: true,
      password: true,
      authVersion: true,
      mfaEnabled: true,
    },
  });

  if (!user) {
    console.log(
      JSON.stringify({ status: 'not_found', email: redactEmail(email), database: context.database }),
    );
    return;
  }

  const passwordHash = String(user.password || '');
  console.log(
    JSON.stringify(
      {
        status: 'found',
        environment: context.target,
        database: context.database,
        user: {
          id: user.id,
          email: redactEmail(email),
          role: user.role,
          subRole: user.subRole,
          active: user.active,
          restaurantId: user.restaurantId,
          authVersion: user.authVersion,
          mfaEnabled: user.mfaEnabled,
          passwordHashConfigured: passwordHash.length > 0,
          passwordHashAlgorithm: passwordHash.startsWith('$2') ? 'bcrypt' : 'unknown',
        },
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
