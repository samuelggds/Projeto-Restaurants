import type { NextFunction, Request, Response } from 'express';

import printerAgentAuthService from '../modules/kitchenPrinting/services/PrinterAgentAuthService.js';

export async function printerAgentAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const [scheme, token] = String(req.headers.authorization || '')
    .trim()
    .split(/\s+/u);
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Credencial do agente inválida.' });
  }

  try {
    const agent = await printerAgentAuthService.authenticate(token);
    if (!agent) return res.status(401).json({ error: 'Credencial do agente inválida.' });
    req.printerAgent = agent;
    return next();
  } catch {
    return res.status(401).json({ error: 'Credencial do agente inválida.' });
  }
}
