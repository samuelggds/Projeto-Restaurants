import { PrismaClient } from '@prisma/client';

const databaseUrl = process.env.DATABASE_URL;
let runtimeUrl: string | undefined;
if (databaseUrl) {
  const url = new URL(databaseUrl);
  const configured = Number(process.env.DATABASE_CONNECTION_LIMIT || 10);
  if (!Number.isSafeInteger(configured) || configured < 1 || configured > 100) {
    throw new Error('DATABASE_CONNECTION_LIMIT deve estar entre 1 e 100.');
  }
  if (!url.searchParams.has('connection_limit'))
    url.searchParams.set('connection_limit', String(configured));
  if (!url.searchParams.has('pool_timeout')) url.searchParams.set('pool_timeout', '10');
  runtimeUrl = url.toString();
}
const prisma = new PrismaClient(runtimeUrl ? { datasourceUrl: runtimeUrl } : undefined);

export default prisma;
