import 'dotenv/config';
import {
  databaseFingerprint,
  formatDatabaseFingerprint,
  normalizeEnvironment,
} from './_shared/environmentGuard.mjs';

try {
  const environment = normalizeEnvironment(process.argv[2] || process.env.OPS_DATABASE_ENV);
  const fingerprint = databaseFingerprint();
  if (!fingerprint) throw new Error('DATABASE_URL é obrigatória.');

  const variable = `OPS_DATABASE_FINGERPRINT_${environment.toUpperCase()}`;
  console.log(`Banco: ${formatDatabaseFingerprint(fingerprint)}`);
  console.log(`${variable}=${fingerprint.identityHash}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Não foi possível identificar o banco.');
  process.exitCode = 1;
}
