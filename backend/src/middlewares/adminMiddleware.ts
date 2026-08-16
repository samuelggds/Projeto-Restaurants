import { NextFunction, Request, Response } from 'express';
import { UserRole } from '@prisma/client';

export function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.user.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: 'Acesso negado!' });
  }
  return next();
}
