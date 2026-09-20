import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const rawRequestId = req.headers['x-request-id'];
  const supplied = Array.isArray(rawRequestId) ? rawRequestId[0] : rawRequestId;
  const requestId = typeof supplied === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/iu.test(supplied)
    ? supplied
    : crypto.randomUUID();

  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  next();
}
