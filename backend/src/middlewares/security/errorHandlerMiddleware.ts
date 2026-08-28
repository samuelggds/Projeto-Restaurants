import { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import * as Sentry from '@sentry/node';
import { notifyCriticalError } from '../../services/alertNotifier.js';
import {
  safeErrorName,
  safeErrorSummary,
  sanitizeTelemetryValue,
  telemetryPath,
} from '../../services/telemetrySanitizer.js';

const INTERNAL_SERVER_ERROR_MESSAGE = 'Erro interno do servidor';
const SENSITIVE_HEADERS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'x-session-token',
]);

function sanitizedHeaders(headers: Request['headers']) {
  const filtered = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [
      key,
      SENSITIVE_HEADERS.has(key.toLowerCase()) ? '[Filtered]' : value,
    ]),
  );
  return sanitizeTelemetryValue(filtered);
}

export const errorHandlerMiddleware: ErrorRequestHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const errObj =
    typeof err === 'object' && err !== null
      ? (err as {
          status?: number;
          statusCode?: number;
          message?: string;
          stack?: string;
        })
      : {};

  const statusCode = Number(errObj.status || errObj.statusCode || 500);
  const safeStatusCode = statusCode >= 400 && statusCode < 600 ? statusCode : 500;
  const safePath = telemetryPath(req.path);

  if (safeStatusCode >= 500) {
    console.error('[API_ERROR]', {
      requestId: req.requestId,
      method: req.method,
      path: safePath,
      error: safeErrorSummary(err, 500),
    });

    void notifyCriticalError('[CRITICAL_API_ERROR]', {
      requestId: req.requestId,
      method: req.method,
      path: safePath,
      errorType: safeErrorName(err),
    });

    Sentry.withScope((scope) => {
      scope.setTag('request_id', req.requestId || 'unknown');
      scope.setTag('method', req.method || 'unknown');
      scope.setTag('path', safePath);
      scope.setContext('request', {
        headers: sanitizedHeaders(req.headers),
        query: sanitizeTelemetryValue(req.query),
        params: sanitizeTelemetryValue(req.params),
      });

      Sentry.captureException(err);
    });
  }

  const message =
    safeStatusCode >= 500 ? INTERNAL_SERVER_ERROR_MESSAGE : errObj.message || 'Erro na requisicao';

  return res.status(safeStatusCode).json({
    error: message,
    requestId: req.requestId,
  });
};
