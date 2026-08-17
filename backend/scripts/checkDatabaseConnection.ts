import 'dotenv/config';

import prisma from '../src/config/prisma.js';

async function main() {
  const startedAt = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log(`Database connection OK (${Date.now() - startedAt} ms).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Database connection failed.');
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
