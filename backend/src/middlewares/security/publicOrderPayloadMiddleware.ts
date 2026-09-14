import type { RequestHandler } from 'express';
import { publicOrderPayload } from '../../modules/orders/domain/publicOrderPayload.js';

export const publicOrderPayloadMiddleware: RequestHandler = (_req, res, next) => {
  const json = res.json.bind(res);
  res.json = (body) => json(publicOrderPayload(body));
  next();
};
