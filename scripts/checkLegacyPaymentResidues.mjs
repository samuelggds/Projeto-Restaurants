import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const scanRoots = [
  '.github/workflows',
  'backend/src',
  'backend/scripts',
  'frontend/src',
];
const scanFiles = [
  '.env.docker.example',
  '.env.production.example',
  'backend/.env.docker.example',
  'backend/.env.example',
  'backend/package.json',
  'backend/package-lock.json',
  'docker-compose.yml',
  'docker-compose.ci.yml',
  'docker-compose.production.yml',
  'DEPLOY.md',
  'INFRA_CHECKLIST_100_RESTAURANTS.md',
  'LOAD_TEST_100_RESTAURANTS.md',
];

const redactionOnly = path.normalize(
  'backend/src/modules/aiSupport/domain/adminAiSecurityPolicy.ts',
);
const forbidden = /\b(?:pagbank|stripe)\b|(?:PAGBANK|STRIPE)_[A-Z0-9_]+/giu;
const allowedLegacyRedactionNames = new Set([
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'PAGBANK_TOKEN',
]);

async function collect(dir) {
  const entries = await readdir(path.join(root, dir), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await collect(relative)));
    else if (entry.isFile() && /\.(?:ts|tsx|js|mjs|cjs|json|ya?ml|md)$/iu.test(entry.name)) {
      files.push(relative);
    }
  }
  return files;
}

const files = [...scanFiles];
for (const dir of scanRoots) files.push(...(await collect(dir)));

const findings = [];
for (const relative of [...new Set(files.map((file) => path.normalize(file)))].sort()) {
  const content = await readFile(path.join(root, relative), 'utf8');
  for (const match of content.matchAll(forbidden)) {
    const value = match[0];
    if (relative === redactionOnly && allowedLegacyRedactionNames.has(value)) continue;
    const line = content.slice(0, match.index).split('\n').length;
    findings.push(`${relative}:${line}: ${value}`);
  }
}

if (findings.length) {
  console.error(
    ['PagBank/Stripe residue found in active runtime/configuration paths:', ...findings].join('\n'),
  );
  process.exit(1);
}

console.log(
  'No active PagBank/Stripe runtime or configuration residue found; historical migrations/artifacts are intentionally outside this gate.',
);
