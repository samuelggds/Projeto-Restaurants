const { spawn, spawnSync } = require('node:child_process');
const path = require('node:path');

const preload = './scripts/nodeOsUserInfoFallback.cjs';
const nodeOptions = [process.env.NODE_OPTIONS, `--require=${preload}`]
  .filter(Boolean)
  .join(' ');
const tsxCli = path.resolve(__dirname, '../node_modules/tsx/dist/cli.mjs');

const child = spawn(process.execPath, [tsxCli, ...process.argv.slice(2)], {
  cwd: process.cwd(),
  env: { ...process.env, NODE_OPTIONS: nodeOptions },
  stdio: 'inherit',
  windowsHide: true,
});

let stopping = false;

function stopProcessTree(signal) {
  if (stopping) return;
  stopping = true;

  if (process.platform === 'win32') {
    spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    });
    return;
  }

  child.kill(signal);
}

child.on('error', (error) => {
  console.error('[tsx] Não foi possível iniciar o processo:', error.message);
  process.exitCode = 1;
});

child.on('exit', (code, signal) => {
  if (!stopping) process.exitCode = code ?? (signal ? 1 : 0);
});

process.once('SIGINT', () => stopProcessTree('SIGINT'));
process.once('SIGTERM', () => stopProcessTree('SIGTERM'));
