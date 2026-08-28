import 'dotenv/config';
import './config/validateEnvOnStartup.js';
import prisma from './config/prisma.js';
import bootstrapSuperAdminService from './modules/superAdmin/services/BootstrapSuperAdminService.js';
import { safeErrorSummary } from './services/telemetrySanitizer.js';

try {
  const result = await bootstrapSuperAdminService.execute();
  console.info('[SUPER_ADMIN_BOOTSTRAP]', result);
} catch (error) {
  console.error('[SUPER_ADMIN_BOOTSTRAP_FAILED]', safeErrorSummary(error));
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
