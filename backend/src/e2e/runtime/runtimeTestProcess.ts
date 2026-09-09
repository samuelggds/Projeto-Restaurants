import { spawn } from 'node:child_process';
import { once } from 'node:events';

export async function startRuntimeTestProcess() {
  // Only synthetic test credentials enter children; owner and integration keys do not.
  const env: NodeJS.ProcessEnv = {};
  for (const name of [
    'PATH',
    'Path',
    'SystemRoot',
    'SYSTEMROOT',
    'TEMP',
    'TMP',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'JWT_MFA_SECRET',
    'CREDENTIAL_ENCRYPTION_KEY',
  ]) {
    if (process.env[name]) env[name] = process.env[name];
  }
  Object.assign(env, {
    NODE_ENV: 'test',
    DISTRIBUTED_STATE: 'postgres',
    API_REPLICA_COUNT: '2',
    DATABASE_URL: process.env.TENANT_E2E_RUNTIME_DATABASE_URL,
    AUTH_RATE_LIMIT_MAX_REQUESTS: '1000',
    RATE_LIMIT_MAX_REQUESTS: '5000',
    DATABASE_CONNECTION_LIMIT: '10',
    ALLOW_GLOBAL_PAYMENT_FALLBACK: 'false',
  });
  const child = spawn(
    process.execPath,
    [
      '--require',
      './scripts/nodeOsUserInfoFallback.cjs',
      '--import',
      'tsx',
      'src/e2e/runtime/runtimeTestServer.ts',
    ],
    { cwd: process.cwd(), env, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true },
  );
  const exited = once(child, 'exit');
  let output = '';
  child.stdout.on('data', (chunk) => {
    output = (output + chunk).slice(-12_000);
  });
  child.stderr.on('data', (chunk) => {
    output = (output + chunk).slice(-12_000);
  });
  let baseUrl: string;
  try {
    baseUrl = await new Promise<string>((resolve, reject) => {
      const deadline = setTimeout(
        () => finish(new Error(`API fixture startup timeout: ${output}`)),
        30_000,
      );
      const inspect = () => {
        const match = output.match(/RUNTIME_TEST_READY:(http:\/\/127\.0\.0\.1:\d+)/);
        if (match) finish(undefined, match[1]);
      };
      const fail = () => finish(new Error(`API fixture exited before readiness: ${output}`));
      function finish(error?: Error, result?: string) {
        clearTimeout(deadline);
        child.stdout.off('data', inspect);
        child.off('exit', fail);
        child.off('error', finish);
        if (error) reject(error);
        else resolve(result!);
      }
      child.stdout.on('data', inspect);
      child.once('exit', fail);
      child.once('error', finish);
    });
  } catch (error) {
    child.kill();
    await exited.catch(() => undefined);
    throw error;
  }
  return {
    baseUrl,
    pid: child.pid!,
    publish(room: string, event: string, payload: unknown) {
      child.stdin.write(JSON.stringify({ action: 'publish', room, event, payload }) + '\n');
    },
    async close() {
      if (child.exitCode !== null) return;
      child.stdin.end(JSON.stringify({ action: 'close' }) + '\n');
      const deadline = setTimeout(() => child.kill(), 10_000);
      try {
        await exited;
      } finally {
        clearTimeout(deadline);
      }
    },
  };
}
