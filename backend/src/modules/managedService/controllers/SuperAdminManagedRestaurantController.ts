import type { NextFunction, Request, Response } from 'express';
import service from '../services/SuperAdminManagedRestaurantService.js';

function actor(req: Request) {
  return {
    userId: Number(req.user?.id || 0),
    userName: req.user?.name ?? null,
    userRole: req.user?.role ?? null,
    ipAddress: String(req.ip || '').trim().slice(0, 128) || null,
    requestId: String(req.requestId || '').trim().slice(0, 191) || null,
    userAgent: String(req.headers['user-agent'] || '').trim().slice(0, 1000) || null,
  };
}

class SuperAdminManagedRestaurantController {
  async workspace(req: Request, res: Response, next: NextFunction) {
    try { return res.json(await service.getWorkspace(req.params.restaurantId, actor(req))); }
    catch (error) { return next(error); }
  }
  async createProduct(req: Request, res: Response, next: NextFunction) {
    try { return res.status(201).json(await service.createProduct(req.params.restaurantId, req.body, actor(req))); }
    catch (error) { return next(error); }
  }
  async updateProduct(req: Request, res: Response, next: NextFunction) {
    try { return res.json(await service.updateProduct(req.params.restaurantId, req.params.productId, req.body, actor(req))); }
    catch (error) { return next(error); }
  }
  async createCategory(req: Request, res: Response, next: NextFunction) {
    try { return res.status(201).json(await service.createCategory(req.params.restaurantId, req.body, actor(req))); }
    catch (error) { return next(error); }
  }
  async updateCategory(req: Request, res: Response, next: NextFunction) {
    try { return res.json(await service.updateCategory(req.params.restaurantId, req.params.categoryId, req.body, actor(req))); }
    catch (error) { return next(error); }
  }
  async createCombo(req: Request, res: Response, next: NextFunction) {
    try { return res.status(201).json(await service.saveCombo(req.params.restaurantId, null, req.body, actor(req))); }
    catch (error) { return next(error); }
  }
  async updateCombo(req: Request, res: Response, next: NextFunction) {
    try { return res.json(await service.saveCombo(req.params.restaurantId, req.params.comboId, req.body, actor(req))); }
    catch (error) { return next(error); }
  }
  async createBanner(req: Request, res: Response, next: NextFunction) {
    try { return res.status(201).json(await service.createBanner(req.params.restaurantId, req.body, actor(req))); }
    catch (error) { return next(error); }
  }
  async updateBanner(req: Request, res: Response, next: NextFunction) {
    try { return res.json(await service.updateBanner(req.params.restaurantId, req.params.bannerId, req.body, actor(req))); }
    catch (error) { return next(error); }
  }
  async updateSettings(req: Request, res: Response, next: NextFunction) {
    try { return res.json(await service.updateSafeSettings(req.params.restaurantId, req.body, actor(req))); }
    catch (error) { return next(error); }
  }
}
export default new SuperAdminManagedRestaurantController();
