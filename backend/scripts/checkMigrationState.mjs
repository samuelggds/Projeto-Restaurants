import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

const prisma = new PrismaClient();

try {
  const databaseInfo = await prisma.$queryRawUnsafe(`
    SELECT
      current_database() AS database,
      current_schema() AS schema,
      inet_server_addr()::text AS server_address,
      inet_server_port() AS server_port,
      pg_postmaster_start_time() AS server_started_at
  `);

 const migrations = await prisma.$queryRawUnsafe(`
  SELECT
    id,
    migration_name,
    checksum,
    started_at,
    finished_at,
    rolled_back_at,
    applied_steps_count
  FROM "_prisma_migrations"
  WHERE migration_name = '20260825190000_add_table_participants'
  ORDER BY started_at ASC
`);
  console.log('BANCO:');
  console.table(databaseInfo);

  console.log('MIGRATION:');
  console.table(migrations);
} finally {
  await prisma.$disconnect();
}