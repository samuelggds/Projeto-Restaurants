import * as Sentry from "@sentry/node";
import { notifyCriticalError } from "../../services/alertNotifier.js";
const INTERNAL_SERVER_ERROR_MESSAGE = "Erro interno do servidor";
export const errorHandlerMiddleware = (err, req, res, _next) => {
    const errObj = typeof err === "object" && err !== null
        ? err
        : {};
    const statusCode = Number(errObj.status || errObj.statusCode || 500);
    const safeStatusCode = statusCode >= 400 && statusCode < 600 ? statusCode : 500;
    if (safeStatusCode >= 500) {
        console.error("[API_ERROR]", {
            requestId: req.requestId,
            method: req.method,
            path: req.originalUrl,
            message: errObj.message,
            stack: errObj.stack,
        });
        notifyCriticalError("[CRITICAL_API_ERROR]", `requestId=${req.requestId} method=${req.method} path=${req.originalUrl} message=${errObj.message || "unknown"}`);
    }
    Sentry.withScope((scope) => {
        scope.setTag("request_id", req.requestId || "unknown");
        scope.setTag("method", req.method || "unknown");
        scope.setTag("path", req.originalUrl || "unknown");
        scope.setContext("request", {
            headers: req.headers,
            query: req.query,
            params: req.params,
        });
        Sentry.captureException(err);
    });
    const message = safeStatusCode >= 500
        ? INTERNAL_SERVER_ERROR_MESSAGE
        : errObj.message || "Erro na requisicao";
    return res.status(safeStatusCode).json({
        error: message,
        requestId: req.requestId,
    });
};
