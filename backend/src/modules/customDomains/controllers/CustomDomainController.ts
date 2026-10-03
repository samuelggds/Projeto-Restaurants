import type { NextFunction, Request, Response } from 'express';
import { SuperAdminError } from '../../superAdmin/domain/superAdminErrors.js';
import type { AuditContext } from '../../superAdmin/repositories/SuperAdminRepository.js';
import restaurantCustomDomainService from '../services/RestaurantCustomDomainService.js';
import { resolveActiveCustomDomain } from '../services/PublicCustomDomainService.js';

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function auditContext(req: Request): AuditContext {
  const actorUserId = Number(req.user?.id);
  if (!Number.isInteger(actorUserId) || actorUserId <= 0) {
    throw new SuperAdminError('Não autenticado.', 401, 'UNAUTHENTICATED');
  }
  return {
    actorUserId,
    ipAddress: String(req.ip || '').trim().slice(0, 128) || null,
    requestId: String(req.requestId || '').trim().slice(0, 191) || null,
    userAgent: String(req.headers['user-agent'] || '').trim().slice(0, 1000) || null,
  };
}

export class CustomDomainController {
  async list(_req: Request, res: Response, next: NextFunction) {
    try {
      return res.status(200).json({ domains: await restaurantCustomDomainService.list() });
    } catch (error) {
      return next(error);
    }
  }

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const domain = await restaurantCustomDomainService.get(first(req.params.restaurantId));
      return res.status(200).json({ domain });
    } catch (error) {
      return next(error);
    }
  }

  async save(req: Request, res: Response, next: NextFunction) {
    try {
      const domain = await restaurantCustomDomainService.save(
        first(req.params.restaurantId),
        req.body,
        auditContext(req),
      );
      return res.status(200).json({ domain });
    } catch (error) {
      return next(error);
    }
  }

  async verify(req: Request, res: Response, next: NextFunction) {
    try {
      const domain = await restaurantCustomDomainService.verify(
        first(req.params.restaurantId),
        auditContext(req),
      );
      return res.status(200).json({ domain });
    } catch (error) {
      return next(error);
    }
  }

  async activate(req: Request, res: Response, next: NextFunction) {
    try {
      const domain = await restaurantCustomDomainService.activate(
        first(req.params.restaurantId),
        auditContext(req),
      );
      return res.status(200).json({ domain });
    } catch (error) {
      return next(error);
    }
  }

  async disable(req: Request, res: Response, next: NextFunction) {
    try {
      const domain = await restaurantCustomDomainService.disable(
        first(req.params.restaurantId),
        auditContext(req),
      );
      return res.status(200).json({ domain });
    } catch (error) {
      return next(error);
    }
  }

  async resolve(req: Request, res: Response, next: NextFunction) {
    try {
      const hostname = first(req.query.hostname as string | string[] | undefined);
      const resolved = await resolveActiveCustomDomain(hostname);
      res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      return resolved
        ? res.status(200).json(resolved)
        : res.status(404).json({ error: 'Domínio não encontrado ou indisponível.' });
    } catch (error) {
      return next(error);
    }
  }

  async caddyAllow(req: Request, res: Response) {
    const domain = first(req.query.domain as string | string[] | undefined);
    const resolved = await resolveActiveCustomDomain(domain).catch(() => null);
    res.setHeader('Cache-Control', 'no-store');
    return resolved ? res.status(204).end() : res.status(403).end();
  }
}

export default new CustomDomainController();
