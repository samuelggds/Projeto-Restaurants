const NETWORK_PATTERN =
  /(?:network error|econn(?:refused|reset)|socket hang up|timeout|timed out|fetch failed|failed to fetch)/i;
const SESSION_PATTERN =
  /(?:access[ -]?token|refresh[ -]?token|jwt|bearer|authorization header|token de acesso|token de atualiza(?:ç|c)[aã]o)/i;
const TECHNICAL_PATTERN =
  /(?:\bwebhook\b|\boauth\b|\bcallback\b|\bendpoint\b|\bpayload\b|\bbackend\b|\btenant\b|\bapi\b|\bprisma\b|\bpostgres(?:ql)?\b|request id|status code|http\s*\d{3}|stack trace)/i;
const PAYMENT_INFRA_PATTERN =
  /(?:gateway|provedor|credencial|client secret|secret key|public key|api key|access key)/i;

/**
 * Converte detalhes úteis para desenvolvimento em mensagens apropriadas para
 * clientes, administradores e funcionários. Códigos estruturados continuam
 * disponíveis separadamente na resposta para a aplicação tomar decisões.
 */
export function toUserFacingErrorMessage(value: unknown, fallback = 'Não foi possível concluir esta ação. Tente novamente.') {
  const message = typeof value === 'string' ? value.trim() : '';
  if (!message) return fallback;

  if (NETWORK_PATTERN.test(message)) {
    return 'Não foi possível se comunicar com o sistema. Verifique sua conexão e tente novamente.';
  }
  if (SESSION_PATTERN.test(message)) {
    return 'Não foi possível validar seu acesso. Entre novamente e tente de novo.';
  }
  if (/^request failed with status code/i.test(message) || TECHNICAL_PATTERN.test(message)) {
    return fallback;
  }
  if (PAYMENT_INFRA_PATTERN.test(message)) {
    return 'A conexão necessária para esta operação ainda não está pronta. Tente novamente em instantes.';
  }
  if (/\b(?:unauthorized|unauthorised)\b/i.test(message)) {
    return 'Sua sessão não permite esta ação. Entre novamente e tente de novo.';
  }
  if (/\bforbidden\b/i.test(message)) {
    return 'Você não tem permissão para realizar esta ação.';
  }

  return message.slice(0, 300);
}

export function sanitizeApiErrorData(data: unknown) {
  if (!data || Array.isArray(data) || typeof data !== 'object') return data;
  const source = data as Record<string, unknown>;
  const next = { ...source };

  if (typeof source.error === 'string') {
    next.error = toUserFacingErrorMessage(source.error);
  }
  if (typeof source.message === 'string') {
    next.message = toUserFacingErrorMessage(source.message);
  }

  return next;
}
