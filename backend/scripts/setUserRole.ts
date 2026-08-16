import 'dotenv/config';
import { UserRole } from '@prisma/client';
import prisma from '../src/config/prisma.js';

const emailArg = String(process.argv[2] || '')
  .trim()
  .toLowerCase();
const roleArg = String(process.argv[3] || '')
  .trim()
  .toUpperCase();

async function main() {
  if (!emailArg || !roleArg) {
    throw new Error(
      'Uso: tsx scripts/setUserRole.ts <email> <ADMIN|SUPER_ADMIN|FUNCIONARIO|CLIENTE|MOTOQUEIRO>',
    );
  }

  if (!(roleArg in UserRole)) {
    throw new Error(`Role inválida: ${roleArg}`);
  }

  const nextRole = UserRole[roleArg as keyof typeof UserRole];

  const user = await prisma.user.findFirst({
    where: {
      email: {
        equals: emailArg,
        mode: 'insensitive',
      },
    },
    select: {
      id: true,
      email: true,
      role: true,
      active: true,
    },
  });

  if (!user) {
    console.log(
      JSON.stringify(
        {
          status: 'not_found',
          email: emailArg,
        },
        null,
        2,
      ),
    );
    return;
  }

  const updated = await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      role: nextRole,
    },
    select: {
      id: true,
      email: true,
      role: true,
      active: true,
      updatedAt: true,
    },
  });

  console.log(
    JSON.stringify(
      {
        status: 'role_updated',
        before: user,
        after: updated,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
