type Environment = Record<string, string | undefined>;

export function canLogLocalAuthCode(env: Environment = process.env) {
  const nodeEnv = String(env.NODE_ENV || '').trim().toLowerCase();
  return (
    (nodeEnv === 'development' || nodeEnv === 'test') &&
    String(env.ALLOW_LOCAL_AUTH_CODE_LOGGING || '').trim().toLowerCase() === 'true'
  );
}
