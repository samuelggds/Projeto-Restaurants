// Run from backend: node ../artifacts/run-pagination-audit.mjs
// Reuses the existing disposable database lifecycle and safety checks.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const sourceUrl = new URL('../backend/scripts/runTenantE2E.mjs', import.meta.url);
const probeUrl = new URL('./auditoria-pagination-probe.ts', import.meta.url);
const runnerUrl = new URL('./.pagination-audit-runner.mjs', import.meta.url);
const safetyUrl = new URL('../backend/scripts/tenantE2eDatabaseSafety.mjs', import.meta.url);
const source = (await readFile(sourceUrl, 'utf8'))
  .replace("'./tenantE2eDatabaseSafety.mjs'", JSON.stringify(safetyUrl.href))
  .replace('const testFiles = await collectE2ETests({ rlsOnly });',
    `const testFiles = [${JSON.stringify(fileURLToPath(probeUrl))}];`);
process.env.TENANT_E2E_OWNER_DATABASE_URL = '';
await writeFile(runnerUrl, source);
await import(runnerUrl.href);
