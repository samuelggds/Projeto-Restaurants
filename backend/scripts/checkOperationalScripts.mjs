import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const scriptsDirectory = path.resolve('scripts');
const manifest = JSON.parse(
  await readFile(path.join(scriptsDirectory, 'operational-scripts.json'), 'utf8'),
);
const catalogFiles = Object.values(manifest).flat();
const duplicates = catalogFiles.filter((name, index) => catalogFiles.indexOf(name) !== index);
assert.deepEqual(duplicates, [], `Scripts repetidos no catálogo: ${duplicates.join(', ')}`);

const ignoredFiles = new Set([
  'README.md',
  'checkOperationalScripts.mjs',
  'operational-scripts.json',
]);
const executableExtensions = new Set(['.ts', '.mjs', '.cjs']);
const actualFiles = (await readdir(scriptsDirectory, { withFileTypes: true }))
  .filter(
    (entry) =>
      entry.isFile() &&
      executableExtensions.has(path.extname(entry.name)) &&
      !ignoredFiles.has(entry.name),
  )
  .map((entry) => entry.name)
  .sort();
const catalogSorted = [...catalogFiles].sort();
assert.deepEqual(
  catalogSorted,
  actualFiles,
  'Todo script executável deve aparecer uma única vez em operational-scripts.json.',
);

const mutationPattern =
  /\.(?:create|createMany|update|updateMany|upsert|delete|deleteMany)\s*\(|\b(?:POST|PUT|PATCH|DELETE)\b/u;
for (const name of [...manifest.readOnly, ...manifest.guardedRead]) {
  const source = await readFile(path.join(scriptsDirectory, name), 'utf8');
  assert.equal(
    mutationPattern.test(source),
    false,
    `${name} está classificado como readOnly, mas contém uma operação potencialmente mutável.`,
  );
}

for (const name of manifest.guardedRead) {
  const source = await readFile(path.join(scriptsDirectory, name), 'utf8');
  assert.match(
    source,
    /guardSensitiveRead\.mjs|assertOperationalEnvironment/u,
    `${name} deve validar ambiente e identidade do banco antes da leitura sensível.`,
  );
}

for (const name of manifest.disabledLegacy) {
  const source = await readFile(path.join(scriptsDirectory, name), 'utf8');
  assert.match(
    source,
    /import ['"]\.\/_shared\/disabledLegacyScript\.mjs['"]/u,
    `${name} deve importar o bloqueio de quarentena antes de qualquer lógica.`,
  );
}

for (const name of manifest.guardedWrite) {
  const source = await readFile(path.join(scriptsDirectory, name), 'utf8');
  if (name === 'createSuperAdmin.ts') {
    assert.match(source, /promoteUserToSuperAdmin\.js/u);
    continue;
  }
  for (const requiredControl of [
    'assertOperationalEnvironment',
    'resolveExecutionMode',
    'requireWriteConfirmation',
  ]) {
    assert.match(source, new RegExp(requiredControl, 'u'), `${name} não usa ${requiredControl}.`);
  }
}

console.log(
  `Catálogo operacional validado: ${manifest.guardedWrite.length} escritas protegidas, ${manifest.guardedRead.length} leituras protegidas, ${manifest.disabledLegacy.length} em quarentena e ${manifest.readOnly.length} utilitários somente leitura.`,
);
