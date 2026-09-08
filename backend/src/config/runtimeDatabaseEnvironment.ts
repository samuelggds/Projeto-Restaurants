type RuntimeEnvironment = Record<string, string | undefined>;

const migrationOnlyVariables = ['DIRECT_URL', 'POSTGRES_PASSWORD', 'POSTGRES_PASSWORD_FILE'];

/** Runtime must not receive a second credential capable of bypassing its database role. */
export function assertSafeRuntimeDatabaseEnvironment(env: RuntimeEnvironment = process.env) {
  if (env.NODE_ENV !== 'production') return;

  const forbidden = migrationOnlyVariables.filter((name) => Boolean(env[name]?.trim()));
  if (forbidden.length > 0) {
    // Report variable names only: URLs/passwords must never enter logs.
    throw new Error(
      `Credenciais de migracao nao podem ser injetadas na API/worker: ${forbidden.join(', ')}. ` +
        'Use .env.production.runtime e execute as migrations no servico migrate separado.',
    );
  }
}
