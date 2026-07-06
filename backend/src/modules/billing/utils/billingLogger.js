const DEBUG_ENABLED = process.env.BILLING_DEBUG === "true";

function formatMeta(meta) {
  if (!meta) {
    return "";
  }

  return ` ${JSON.stringify(meta)}`;
}

function log(level, message, meta) {
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

export function info(message, meta) {
  log("INFO", message, meta);
}

export function warn(message, meta) {
  log("WARN", message, meta);
}

export function error(message, meta) {
  log("ERROR", message, meta);
}

export function debug(message, meta) {
  if (!DEBUG_ENABLED) {
    return;
  }

  log("DEBUG", message, meta);
}
