import { AxiosError, AxiosHeaders, isAxiosError } from 'axios';
import { sanitizeApiErrorData } from './userFacingError';
import { redactTelemetryText } from '../security/telemetrySanitizer';

const PUBLIC_ERROR_FIELDS = new Set([
  'error',
  'message',
  'code',
  'requestId',
  'invoiceId',
  'restaurantId',
  'dueDate',
  'retryAfter',
  'retryAfterSeconds',
  'remainingAttempts',
  'maintenanceMode',
  'requiresMfa',
  'requiresPasswordChange',
]);

/** Keep the error contract, never the request body, credentials or transport. */
export function publicApiError(error: unknown): unknown {
  if (!isAxiosError(error)) return error;
  const safe = new AxiosError(
    'Não foi possível concluir a solicitação.',
    typeof error.code === 'string' && /^[A-Z_]{1,64}$/.test(error.code) ? error.code : undefined,
  );
  if (error.response) {
    const source = sanitizeApiErrorData(error.response.data);
    const data: Record<string, unknown> = {};
    if (source && typeof source === 'object' && !Array.isArray(source)) {
      for (const [key, value] of Object.entries(source)) {
        if (!PUBLIC_ERROR_FIELDS.has(key)) continue;
        if (typeof value === 'string') data[key] = redactTelemetryText(value, 300);
        else if (
          typeof value === 'boolean' ||
          (typeof value === 'number' && Number.isFinite(value))
        )
          data[key] = value;
      }
    }
    safe.response = {
      status: error.response.status,
      statusText: '',
      data,
      headers: {},
      config: { headers: new AxiosHeaders() },
    };
  } else {
    safe.message =
      'Não foi possível se comunicar com o sistema. Verifique sua conexão e tente novamente.';
  }
  return safe;
}
