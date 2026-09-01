export type AgentLogger = {
  info(event: string, fields?: Record<string, unknown>): void;
  error(event: string, fields?: Record<string, unknown>): void;
};

function sanitizeFields(fields: Record<string, unknown> = {}) {
  return Object.fromEntries(
    Object.entries(fields)
      .filter(([key]) => !/token|credential|payload|authorization/iu.test(key))
      .map(([key, value]) => [
        key,
        typeof value === 'string'
          ? value
              .replace(/pa_[0-9a-f-]{36}\.[A-Za-z0-9_-]+/giu, '<redacted>')
              .replace(/Bearer\s+\S+/giu, 'Bearer <redacted>')
              .slice(0, 300)
          : value,
      ]),
  );
}

export const consoleLogger: AgentLogger = {
  info(event, fields = {}) {
    console.info('[PRINT_AGENT]', { event, ...sanitizeFields(fields) });
  },
  error(event, fields = {}) {
    console.error('[PRINT_AGENT]', { event, ...sanitizeFields(fields) });
  },
};

export { sanitizeFields };
