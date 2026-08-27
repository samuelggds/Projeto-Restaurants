const SECRET_KEY_PATTERN =
  /(authorization|cookie|password|passwd|senha|secret|token|api[-_]?key|access[-_]?key|database[_-]?url|private[_-]?key)/iu;

export function redactEmail(email) {
  const normalized = String(email ?? '').trim();
  const at = normalized.lastIndexOf('@');
  if (at <= 0) {
    return '[REDACTED_EMAIL]';
  }
  const local = normalized.slice(0, at);
  const domain = normalized.slice(at + 1);
  return `${local.slice(0, 1)}***@${domain}`;
}

export function redactUrl(value) {
  try {
    const parsed = new URL(String(value));
    parsed.username = '';
    parsed.password = '';
    for (const key of parsed.searchParams.keys()) {
      parsed.searchParams.set(key, '[REDACTED]');
    }
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return '[REDACTED_URL]';
  }
}

export function redactText(value) {
  return String(value ?? '')
    .replace(/(postgres(?:ql)?:\/\/)[^\s/@]+(?::[^\s/@]*)?@/giu, '$1[REDACTED]@')
    .replace(/(bearer\s+)[a-z0-9._~+/=-]+/giu, '$1[REDACTED]')
    .replace(/(basic\s+)[a-z0-9+/=]+/giu, '$1[REDACTED]')
    .replace(
      /([?&](?:access_token|refresh_token|client_secret|token|secret|key|signature|password)=)[^&#\s]*/giu,
      '$1[REDACTED]',
    )
    .replace(
      /(["'](?:authorization|password|secret|token|access_token|refresh_token|client_secret)["']\s*:\s*["'])[^"']*/giu,
      '$1[REDACTED]',
    )
    .replace(
      /\b((?:PASSWORD|SECRET|TOKEN|API_KEY|ACCESS_KEY|CLIENT_SECRET)\s*=\s*)[^\s,;]+/gu,
      '$1[REDACTED]',
    )
    .replace(/\beyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b/gu, '[REDACTED_JWT]');
}

export function redactObject(value, key = '') {
  if (SECRET_KEY_PATTERN.test(key)) {
    return '[REDACTED]';
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactObject(item));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [
        childKey,
        redactObject(childValue, childKey),
      ]),
    );
  }
  return typeof value === 'string' ? redactText(value) : value;
}

export function safeError(error) {
  if (error instanceof Error) {
    return `${error.name}: ${redactText(error.message)}`;
  }
  return redactText(error);
}
