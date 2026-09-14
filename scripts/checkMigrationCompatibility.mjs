import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const [baseSha, headSha] = process.argv.slice(2);
const shaPattern = /^[0-9a-f]{40}$/u;
if (!shaPattern.test(baseSha || '') || !shaPattern.test(headSha || '')) {
  throw new Error('Informe baseSha e headSha completos para validar migrations alteradas.');
}

const changed = execFileSync(
  'git',
  ['diff', '--name-only', '--diff-filter=ACMR', baseSha, headSha, '--', 'backend/prisma/migrations'],
  { encoding: 'utf8' },
)
  .split(/\r?\n/u)
  .map((value) => value.trim())
  .filter((value) => value.endsWith('/migration.sql'));

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

const violations = [];
for (const file of changed) {
  const sql = readFileSync(file, 'utf8');
  for (const [label, pattern] of destructiveRules) {
    if (pattern.test(sql)) violations.push(`${file}: ${label}`);
  }
}

if (violations.length) {
  console.error(
    [
      'Automatic production promotion requires expand/contract migrations compatible with the previous app version.',
      'The following changed migration operations are not allowed in the automatic path:',
      ...violations.map((value) => `- ${value}`),
      '',
      'Split the change into an expand/contract sequence. Do not bypass this check with continue-on-error.',
    ].join('\n'),
  );
  process.exit(1);
}

console.log(
  changed.length
    ? `Validated ${changed.length} changed migration(s): no blocked destructive operation found.`
    : 'No changed Prisma migration SQL files in this commit range.',
);
