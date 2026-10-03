export function formatDeliveryTime(value?: string | null) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const normalized = raw.replace(/^entrega\s+em\s+/i, '').trim();
  if (/\b(?:min|minuto|minutos|h|hora|horas)\b/i.test(normalized)) return normalized;

  if (/^\d+(?:\s*(?:[-–—]|a)\s*\d+)?$/i.test(normalized)) {
    return `${normalized.replace(/\s*(?:[-–—]|a)\s*/gi, '-')} min`;
  }

  return normalized;
}
