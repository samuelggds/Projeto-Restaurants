import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const [baseSha, headSha] = process.argv.slice(2);
const shaPattern = /^[0-9a-f]{40}$/u;
if (!shaPattern.test(baseSha || '') || !shaPattern.test(headSha || '')) {
  throw new Error('Informe baseSha e headSha completos para validar migrations.');
}

const migrationRoot = 'backend/prisma/migrations/';
const migrationFilePattern = /^backend\/prisma\/migrations\/[^/]+\/migration\.sql$/u;
const statusOutput = execFileSync(
  'git',
  ['diff', '--name-status', '--find-renames', baseSha, headSha, '--', migrationRoot],
  { encoding: 'utf8' },
).trim();

const changes = statusOutput
  ? statusOutput.split(/\r?\n/u).map((line) => {
      const parts = line.split('\t');
      return { status: parts[0], paths: parts.slice(1) };
    })
  : [];

const immutableViolations = [];
const additions = [];
for (const change of changes) {
  const code = change.status[0];
  const oldPath = change.paths[0] || '';
  const newPath = change.paths.at(-1) || '';

  if (code === 'A' && migrationFilePattern.test(newPath)) {
    additions.push(newPath);
    continue;
  }

  const touchesMigration = change.paths.some((value) => migrationFilePattern.test(value));
  if (touchesMigration && ['M', 'D', 'R', 'C', 'T'].includes(code)) {
    immutableViolations.push(`${change.status}: ${change.paths.join(' -> ')}`);
  }

  // A migration directory must only enter the repository as a new migration.sql.
  if (code === 'A' && newPath.startsWith(migrationRoot) && !migrationFilePattern.test(newPath)) {
    immutableViolations.push(`${change.status}: unexpected migration artifact ${newPath}`);
  }

  if (code !== 'A' && oldPath.startsWith(migrationRoot) && !touchesMigration) {
    immutableViolations.push(`${change.status}: migration directory history changed at ${change.paths.join(' -> ')}`);
  }
}

if (immutableViolations.length) {
  console.error(
    [
      'Prisma migration history is immutable after it reaches the approved base.',
      'Existing migrations must not be modified, deleted, renamed, moved, copied or replaced:',
      ...immutableViolations.map((value) => `- ${value}`),
      '',
      'Create a new migration. Destructive changes require an explicit expand/contract plan; do not bypass this gate.',
    ].join('\n'),
  );
  process.exit(1);
}

const destructiveRules = [
  ['DROP TABLE', /\bDROP\s+TABLE\b/iu],
  ['DROP COLUMN', /\bDROP\s+COLUMN\b/iu],
  ['DROP TYPE', /\bDROP\s+TYPE\b/iu],
  ['TRUNCATE', /\bTRUNCATE\b/iu],
  ['DELETE FROM', /\bDELETE\s+FROM\b/iu],
  ['RENAME TABLE/COLUMN', /\bALTER\s+TABLE[\s\S]{0,300}\bRENAME\b/iu],
  ['ALTER COLUMN TYPE', /\bALTER\s+(?:COLUMN\s+)?[^;\n]+\s+TYPE\b/iu],
  ['SET NOT NULL', /\bALTER\s+(?:COLUMN\s+)?[^;\n]+\s+SET\s+NOT\s+NULL\b/iu],
];

const additionViolations = [];
for (const file of additions) {
  const folder = path.basename(path.dirname(file));
  if (!/^\d{14}_[a-z0-9][a-z0-9_-]*$/iu.test(folder)) {
    additionViolations.push(`${file}: migration directory must use <YYYYMMDDHHMMSS>_<name>`);
    continue;
  }
  const sql = readFileSync(file, 'utf8');
  for (const [label, pattern] of destructiveRules) {
    if (pattern.test(sql)) additionViolations.push(`${file}: ${label}`);
  }
}

if (additionViolations.length) {
  console.error(
    [
      'Automatic production promotion requires additive expand/contract migrations compatible with the previous app version.',
      'The following newly added migration operations are not allowed in the automatic path:',
      ...additionViolations.map((value) => `- ${value}`),
      '',
      'Split the change into an explicit expand/contract sequence. Do not bypass this check with continue-on-error.',
    ].join('\n'),
  );
  process.exit(1);
}

console.log(
  additions.length
    ? `Validated ${additions.length} new migration(s); approved history is unchanged and no blocked destructive operation was found.`
    : 'No Prisma migration changes in this commit range; approved migration history is unchanged.',
);
