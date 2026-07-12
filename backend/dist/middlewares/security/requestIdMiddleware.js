import crypto from "crypto";
export function requestIdMiddleware(req, res, next) {
    const rawRequestId = req.headers["x-request-id"];
    const requestId = Array.isArray(rawRequestId)
        ? rawRequestId[0]
        : rawRequestId || crypto.randomUUID();
    req.requestId = requestId;
    res.setHeader("X-Request-Id", requestId);
    next();
}
