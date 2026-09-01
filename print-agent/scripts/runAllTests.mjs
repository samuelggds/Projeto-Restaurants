import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import path from 'node:path';

async function collectTests(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const tests = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) tests.push(...(await collectTests(entryPath)));
    else if (entry.name.endsWith('.test.ts')) tests.push(path.relative(process.cwd(), entryPath));
  }
  return tests;
}

const tests = (await collectTests(path.resolve('src'))).sort();
if (!tests.length) throw new Error('Nenhum teste do Print Agent foi encontrado.');
console.log(`Executando ${tests.length} arquivos de teste do Print Agent.`);
const runner = path.resolve('scripts/runTsxWithOsUserInfoFallback.cjs');
const child = spawn(process.execPath, [runner, '--test', ...tests], {
  cwd: process.cwd(),
  env: process.env,
  stdio: 'inherit',
  windowsHide: true,
});
child.once('error', (error) => {
  console.error('Não foi possível iniciar os testes do Print Agent:', error.message);
  process.exitCode = 1;
});
child.once('exit', (code) => {
  process.exitCode = code ?? 1;
});
