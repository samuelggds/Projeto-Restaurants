const DEBUG_ENABLED = process.env.BILLING_DEBUG === "true";

function formatMeta(meta?: any) {
  if (!meta) {
    return "";
  }

  return ` ${JSON.stringify(meta)}`;
}

function log(level: string, message: string, meta?: any) {
  const line = `[billing] ${level} ${message}${formatMeta(meta)}`;

  if (level === "ERROR") {
    console.error(line);
    return;
  }

  if (level === "WARN") {
    console.warn(line);
    return;
  }

  console.log(line);
}

export function info(message: string, meta?: any) {
  log("INFO", message, meta);
}

export function warn(message: string, meta?: any) {
  log("WARN", message, meta);
}

export function error(message: string, meta?: any) {
  log("ERROR", message, meta);
}

export function debug(message: string, meta?: any) {
  if (!DEBUG_ENABLED) {
    return;
  }

  log("DEBUG", message, meta);
}
