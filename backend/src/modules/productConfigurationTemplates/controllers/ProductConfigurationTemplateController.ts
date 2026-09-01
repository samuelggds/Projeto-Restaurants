import type { Request, Response } from 'express';

import service from '../services/ProductConfigurationTemplateService.js';

function actor(req: Request) {
  return {
    userId: Number(req.user?.id || 0) || undefined,
    userName: req.user?.email,
    userRole: req.user?.role,
  };
}

function message(error: unknown) {
  return error instanceof Error ? error.message : 'Não foi possível processar o modelo.';
}

export async function listProductConfigurationTemplates(req: Request, res: Response) {
  try {
    const templates = await service.list(req.user.restaurantId);
    return res.status(200).json({ templates, count: templates.length });
  } catch (error) {
    return res.status(400).json({ message: message(error) });
  }
}

export async function createProductConfigurationTemplate(req: Request, res: Response) {
  try {
    const template = await service.create(req.body, req.user.restaurantId, actor(req));
    return res.status(201).json({ template });
  } catch (error) {
    return res.status(400).json({ message: message(error) });
  }
}

export async function updateProductConfigurationTemplate(req: Request, res: Response) {
  try {
    const template = await service.update(
      Number(req.params.id),
      req.body,
      req.user.restaurantId,
      actor(req),
    );
    return res.status(200).json({ template });
  } catch (error) {
    return res.status(400).json({ message: message(error) });
  }
}

export async function deleteProductConfigurationTemplate(req: Request, res: Response) {
  try {
    const result = await service.deactivate(
      Number(req.params.id),
      req.user.restaurantId,
      actor(req),
    );
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ message: message(error) });
  }
}
