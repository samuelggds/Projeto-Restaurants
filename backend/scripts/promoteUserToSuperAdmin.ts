import 'dotenv/config';
import bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';
import prisma from '../src/config/prisma.js';

const emailArg = String(process.argv[2] || 'emanuel@hotmail.com')
  .trim()
  .toLowerCase();
const passwordArg = String(process.argv[3] || '123456').trim();

async function main() {
  if (!emailArg || !passwordArg) {
    throw new Error('Informe email e senha.');
  }

  const existing = await prisma.user.findFirst({
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

  const hash = await bcrypt.hash(passwordArg, 10);

  const updated = existing
    ? await prisma.user.update({
        where: {
          id: existing.id,
        },
        data: {
          email: emailArg,
          password: hash,
          role: UserRole.SUPER_ADMIN,
          active: true,
        },
        select: {
          id: true,
          email: true,
          role: true,
          active: true,
        },
      })
    : await prisma.user.create({
        data: {
          name: 'Super Admin',
          email: emailArg,
          password: hash,
          role: UserRole.SUPER_ADMIN,
          active: true,
        },
        select: {
          id: true,
          email: true,
          role: true,
          active: true,
        },
      });

  await prisma.loginLockout.deleteMany({
    where: {
      emailNormalized: emailArg,
    },
  });

  console.log(
    JSON.stringify(
      {
        status: existing ? 'updated' : 'created',
        before: existing,
        after: updated,
        lockoutCleared: true,
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
