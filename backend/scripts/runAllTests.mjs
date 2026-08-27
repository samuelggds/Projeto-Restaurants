import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const testRoots = [path.resolve('src'), path.resolve('scripts')];

async function collectTests(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const tests = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      tests.push(...(await collectTests(entryPath)));
    } else if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.mjs')) {
      tests.push(path.relative(process.cwd(), entryPath));
    }
  }

  return tests;
}

const tests = (await Promise.all(testRoots.map((root) => collectTests(root)))).flat().sort();
if (!tests.length) {
  console.error('Nenhum teste backend foi encontrado em src ou scripts.');
  process.exit(1);
}

console.log(`Executando ${tests.length} testes backend descobertos automaticamente.`);

const runner = path.resolve('scripts/runTsxWithOsUserInfoFallback.cjs');
const child = spawn(process.execPath, [runner, '--test', ...tests], {
  cwd: process.cwd(),
  env: process.env,
  stdio: 'inherit',
  windowsHide: true,
});

child.once('error', (error) => {
  console.error('Não foi possível iniciar os testes backend:', error.message);
  process.exitCode = 1;
});
child.once('exit', (code) => {
  process.exitCode = code ?? 1;
});
