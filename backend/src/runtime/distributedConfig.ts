export function distributedStateEnabled(env: NodeJS.ProcessEnv = process.env) {
  return env.DISTRIBUTED_STATE === 'postgres';
}

export function validateDistributedConfig(env: NodeJS.ProcessEnv = process.env) {
  const mode = env.DISTRIBUTED_STATE || 'memory';
  const replicas = Number(env.API_REPLICA_COUNT || 1);
  if (!['memory', 'postgres'].includes(mode))
    throw new Error('DISTRIBUTED_STATE deve ser memory ou postgres.');
  if (!Number.isSafeInteger(replicas) || replicas < 1 || replicas > 32) {
    throw new Error('API_REPLICA_COUNT deve ser um inteiro entre 1 e 32.');
  }
  if (replicas > 1 && mode !== 'postgres') {
    throw new Error(
      'Múltiplas APIs exigem DISTRIBUTED_STATE=postgres para compartilhar eventos e limites.',
    );
  }
}
