const DEBUG_ENABLED = process.env.BILLING_DEBUG === 'true';

type LogMeta = Record<string, unknown>;

function formatMeta(meta?: LogMeta) {
  if (!meta) {
    return '';
  }

  return ` ${JSON.stringify(meta)}`;
}

function log(level: string, message: string, meta?: LogMeta) {
  const line = `[billing] ${level} ${message}${formatMeta(meta)}`;

  if (level === 'ERROR') {
    console.error(line);
    return;
  }

  if (level === 'WARN') {
    console.warn(line);
    return;
  }

  console.log(line);
}

export function info(message: string, meta?: LogMeta) {
  log('INFO', message, meta);
}

export function warn(message: string, meta?: LogMeta) {
  log('WARN', message, meta);
}

export function error(message: string, meta?: LogMeta) {
  log('ERROR', message, meta);
}

export function debug(message: string, meta?: LogMeta) {
  if (!DEBUG_ENABLED) {
    return;
  }

  log('DEBUG', message, meta);
}
