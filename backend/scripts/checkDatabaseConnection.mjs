import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const startedAt = Date.now();

try {
  const [database] = await prisma.$queryRawUnsafe(
    "SELECT current_database() AS database, current_schema() AS schema",
  );
  console.log(
    `Database connection OK (${Date.now() - startedAt} ms): ${database.database}.${database.schema}`,
  );
} catch (error) {
  console.error("Database connection failed.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
