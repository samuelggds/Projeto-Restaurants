import crypto from "crypto";
import { NextFunction, Request, Response } from "express";

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const rawRequestId = req.headers["x-request-id"];
  const requestId = Array.isArray(rawRequestId)
    ? rawRequestId[0]
    : rawRequestId || crypto.randomUUID();

  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);

  next();
}
