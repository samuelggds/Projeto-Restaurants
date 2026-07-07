import crypto from "crypto";

export function requestIdMiddleware(req, res, next) {
  const requestId = req.headers["x-request-id"] || crypto.randomUUID();

  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);

  next();
}
