import type { NextFunction, Request, Response } from 'express';
import credentialService from '../services/LalamoveCredentialService.js';

class LalamoveCredentialController {
  async status(req: Request, res: Response, next: NextFunction) {
    try {
      res.setHeader('Cache-Control', 'no-store');
      return res.json(await credentialService.status(req.user?.id, req.params.restaurantId));
    } catch (error) { return next(error); }
  }
  async configure(req: Request, res: Response, next: NextFunction) {
    try {
      res.setHeader('Cache-Control', 'no-store');
      return res.json(await credentialService.configure(req.user?.id, req.params.restaurantId, req.body));
    } catch (error) { return next(error); }
  }
  async verifySandbox(req: Request, res: Response, next: NextFunction) {
    try {
      res.setHeader('Cache-Control', 'no-store');
      return res.json(await credentialService.verifySandbox(req.user?.id, req.params.restaurantId, req.body));
    } catch (error) { return next(error); }
  }
  async revoke(req: Request, res: Response, next: NextFunction) {
    try {
      res.setHeader('Cache-Control', 'no-store');
      return res.json(await credentialService.revoke(
        req.user?.id, req.params.restaurantId, req.params.environment, req.body,
      ));
    } catch (error) { return next(error); }
  }
}
export default new LalamoveCredentialController();
