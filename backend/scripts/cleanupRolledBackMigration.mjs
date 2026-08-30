import './_shared/disabledLegacyScript.mjs';
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

const prisma = new PrismaClient();

const migrationName =
  '20260825190000_add_table_participants';

try {
  const failedRows = await prisma.$queryRaw`
    SELECT
      id,
      migration_name,
      checksum,
      finished_at,
      rolled_back_at,
      applied_steps_count
    FROM "_prisma_migrations"
    WHERE migration_name = ${migrationName}
      AND finished_at IS NULL
      AND rolled_back_at IS NOT NULL
      AND applied_steps_count = 0
  `;

  const successfulRows = await prisma.$queryRaw`
    SELECT
      id,
      migration_name,
      checksum,
      finished_at,
      rolled_back_at,
      applied_steps_count
    FROM "_prisma_migrations"
    WHERE migration_name = ${migrationName}
      AND finished_at IS NOT NULL
      AND rolled_back_at IS NULL
      AND applied_steps_count > 0
  `;

  console.log('Tentativa falhada encontrada:');
  console.table(failedRows);

  console.log('Migration aplicada corretamente:');
  console.table(successfulRows);

  if (failedRows.length !== 1) {
    throw new Error(
      `Esperava exatamente 1 tentativa falhada, encontrei ${failedRows.length}.`,
    );
  }

  if (successfulRows.length !== 1) {
    throw new Error(
      `Esperava exatamente 1 migration aplicada, encontrei ${successfulRows.length}.`,
    );
  }

  const failedId = failedRows[0].id;

  const deletedRows = await prisma.$queryRaw`
    DELETE FROM "_prisma_migrations"
    WHERE id = ${failedId}
      AND finished_at IS NULL
      AND rolled_back_at IS NOT NULL
      AND applied_steps_count = 0
    RETURNING
      id,
      migration_name,
      checksum,
      rolled_back_at
  `;

  console.log('Registro antigo removido:');
  console.table(deletedRows);
} finally {
  await prisma.$disconnect();
}
