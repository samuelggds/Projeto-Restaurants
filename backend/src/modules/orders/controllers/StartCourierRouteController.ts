import type { Request, Response } from 'express';
import startCourierRouteService from '../services/StartCourierRouteService.js';

class StartCourierRouteController {
  async handle(req: Request, res: Response) {
    try {
      const order = await startCourierRouteService.execute({
        orderId: Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
        restaurantId: Number(req.user.restaurantId || 0),
        courierId: Number(req.user.id || 0),
        role: req.user.role,
        initialLocation:
          req.body?.initialLocation && typeof req.body.initialLocation === 'object'
            ? req.body.initialLocation
            : null,
      });
      return res.status(200).json(order);
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Erro ao iniciar rota',
      });
    }
  }
}

export default new StartCourierRouteController();
