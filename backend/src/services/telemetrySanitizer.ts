const REDACTED = '[REDACTED]';
const TRUNCATED = '[TRUNCATED]';
const CIRCULAR = '[CIRCULAR]';

const DEFAULT_MAX_STRING_LENGTH = 2_000;
const DEFAULT_MAX_DEPTH = 6;
const DEFAULT_MAX_ENTRIES = 200;

const SENSITIVE_KEY_PATTERN =
  /(?:^|[-_.])(authorization|proxy[-_]?authorization|cookie|set[-_]?cookie|password|passwd|senha|secret|client[-_]?secret|token|jwt|api[-_]?key|access[-_]?key|private[-_]?key|session|signature|credential|database[-_]?url|dsn|pix[-_]?key|csrf|state|code|otp|mfa)(?:$|[-_.])/iu;
const PII_KEY_PATTERN =
  /(?:^|[-_.])(email|e[-_]?mail|phone|telefone|celular|cpf|cnpj|document|documento|address|endereco|cep|postal[-_]?code)(?:$|[-_.])/iu;

const AUTH_PATTERN = /\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/giu;
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/gu;
const DATABASE_URL_PATTERN =
  /\b((?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis):\/\/)[^\s/@]+(?::[^\s/@]*)?@/giu;
const SENSITIVE_ASSIGNMENT_PATTERN =
  /\b((?:authorization|password|passwd|senha|secret|client[_-]?secret|access[_-]?token|refresh[_-]?token|token|jwt|api[_-]?key|access[_-]?key|private[_-]?key|session|signature|cookie|set-cookie|database[_-]?url|dsn)\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;&]+)/giu;
const SENSITIVE_QUERY_PATTERN =
  /([?&](?:authorization|password|passwd|senha|secret|client_secret|access_token|refresh_token|token|jwt|api_key|key|signature|session|code)=)[^&#\s]*/giu;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu;
const FORMATTED_CPF_PATTERN = /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/gu;
const FORMATTED_CNPJ_PATTERN = /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/gu;
const BRAZILIAN_PHONE_PATTERN = /(?<!\d)(?:\+?55[\s.-]?)?\(?\d{2}\)?[\s.-]?9?\d{4}[\s.-]?\d{4}(?!\d)/gu;
// Caracteres de controle são removidos para impedir quebra/injeção de linhas
// em transportes de log estruturado.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/gu;

export interface TelemetrySanitizationOptions {
  maxStringLength?: number;
  maxDepth?: number;
  maxEntries?: number;
}

interface SanitizationContext {
  maxStringLength: number;
  maxDepth: number;
  remainingEntries: number;
  seen: WeakSet<object>;
}

function positiveIntegerOrDefault(value: number | undefined, fallback: number): number {
  return Number.isSafeInteger(value) && Number(value) > 0 ? Number(value) : fallback;
}

export function limitTelemetryText(value: unknown, maximumLength = DEFAULT_MAX_STRING_LENGTH): string {
  const text = String(value ?? '');
  const safeMaximum = positiveIntegerOrDefault(maximumLength, DEFAULT_MAX_STRING_LENGTH);

  if (text.length <= safeMaximum) {
    return text;
  }

  if (safeMaximum <= TRUNCATED.length) {
    return TRUNCATED.slice(0, safeMaximum);
  }

  return `${text.slice(0, safeMaximum - TRUNCATED.length)}${TRUNCATED}`;
}

export function redactTelemetryText(
  value: unknown,
  maximumLength = DEFAULT_MAX_STRING_LENGTH,
): string {
  const redacted = String(value ?? '')
    .replace(DATABASE_URL_PATTERN, '$1[REDACTED]@')
    .replace(AUTH_PATTERN, '$1 [REDACTED]')
    .replace(JWT_PATTERN, '[REDACTED_JWT]')
    .replace(SENSITIVE_QUERY_PATTERN, '$1[REDACTED]')
    .replace(SENSITIVE_ASSIGNMENT_PATTERN, '$1[REDACTED]')
    .replace(EMAIL_PATTERN, '[REDACTED_EMAIL]')
    .replace(FORMATTED_CPF_PATTERN, '[REDACTED_CPF]')
    .replace(FORMATTED_CNPJ_PATTERN, '[REDACTED_CNPJ]')
    .replace(BRAZILIAN_PHONE_PATTERN, '[REDACTED_PHONE]')
    .replace(CONTROL_CHARACTER_PATTERN, '');

  return limitTelemetryText(redacted, maximumLength);
}

export function telemetryPath(value: unknown, maximumLength = 512): string {
  const raw = String(value ?? '').trim();
  if (!raw) return 'unknown';

  try {
    const absolute = /^[a-z][a-z\d+.-]*:\/\//iu.test(raw);
    const parsed = new URL(raw, 'http://telemetry.invalid');
    const path = redactTelemetryText(parsed.pathname || '/', maximumLength);
    return absolute ? `${parsed.protocol}//${parsed.host}${path}` : path;
  } catch {
    const path = raw.split(/[?#]/u, 1)[0] || '/';
    return redactTelemetryText(path, maximumLength);
  }
}

function sanitizeValue(
  value: unknown,
  key: string,
  depth: number,
  context: SanitizationContext,
): unknown {
  const normalizedKey = key.replace(/([a-z\d])([A-Z])/gu, '$1_$2').toLowerCase();
  if (SENSITIVE_KEY_PATTERN.test(normalizedKey) || PII_KEY_PATTERN.test(normalizedKey)) {
    return REDACTED;
  }

  if (value === null || value === undefined || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return redactTelemetryText(value, context.maxStringLength);
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : String(value);
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (typeof value === 'function' || typeof value === 'symbol') {
    return `[${typeof value}]`;
  }

  if (depth >= context.maxDepth || context.remainingEntries <= 0) {
    return TRUNCATED;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? 'Invalid Date' : value.toISOString();
  }

  if (value instanceof Error) {
    return {
      name: safeErrorName(value),
      message: redactTelemetryText(value.message, context.maxStringLength),
    };
  }

  if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) {
    const byteLength = value instanceof ArrayBuffer ? value.byteLength : value.byteLength;
    return `[BINARY:${byteLength}]`;
  }

  if (typeof value !== 'object') {
    return redactTelemetryText(value, context.maxStringLength);
  }

  if (context.seen.has(value)) {
    return CIRCULAR;
  }
  context.seen.add(value);

  if (Array.isArray(value)) {
    const output: unknown[] = [];
    for (const item of value) {
      if (context.remainingEntries <= 0) {
        output.push(TRUNCATED);
        break;
      }
      context.remainingEntries -= 1;
      output.push(sanitizeValue(item, '', depth + 1, context));
    }
    return output;
  }

  const output: Record<string, unknown> = {};
  for (const [childKey, childValue] of Object.entries(value)) {
    if (context.remainingEntries <= 0) {
      output[TRUNCATED] = true;
      break;
    }
    context.remainingEntries -= 1;
    output[childKey] = sanitizeValue(childValue, childKey, depth + 1, context);
  }
  return output;
}

export function sanitizeTelemetryValue(
  value: unknown,
  options: TelemetrySanitizationOptions = {},
): unknown {
  const context: SanitizationContext = {
    maxStringLength: positiveIntegerOrDefault(
      options.maxStringLength,
      DEFAULT_MAX_STRING_LENGTH,
    ),
    maxDepth: positiveIntegerOrDefault(options.maxDepth, DEFAULT_MAX_DEPTH),
    remainingEntries: positiveIntegerOrDefault(options.maxEntries, DEFAULT_MAX_ENTRIES),
    seen: new WeakSet<object>(),
  };

  return sanitizeValue(value, '', 0, context);
}

export function safeErrorName(error: unknown): string {
  const candidate = error instanceof Error ? error.name : 'UnknownError';
  const normalized = candidate.replace(/[^A-Za-z0-9_.-]/gu, '').slice(0, 80);
  return normalized || 'Error';
}

export function safeErrorSummary(error: unknown, maximumLength = DEFAULT_MAX_STRING_LENGTH): string {
  if (error instanceof Error) {
    return redactTelemetryText(`${safeErrorName(error)}: ${error.message}`, maximumLength);
  }
  if (typeof error === 'string') {
    return redactTelemetryText(`UnknownError: ${error}`, maximumLength);
  }
  return 'UnknownError';
}

export const TELEMETRY_REDACTED_VALUE = REDACTED;
