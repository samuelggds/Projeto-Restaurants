import type { Request, Response } from 'express';
import startCourierRouteService from '../services/StartCourierRouteService.js';
import navigationConnectService from '../services/NavigationConnectService.js';
import prepareCourierNavigationService from '../services/PrepareCourierNavigationService.js';

class StartCourierRouteController {
  async handle(req: Request, res: Response) {
    try {
      const orderId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const restaurantId = Number(req.user.restaurantId || 0);
      const courierId = Number(req.user.id || 0);
      const role = req.user.role;
      const order = await startCourierRouteService.execute({
        orderId,
        restaurantId,
        courierId,
        role,
        initialLocation:
          req.body?.initialLocation && typeof req.body.initialLocation === 'object'
            ? req.body.initialLocation
            : null,
      });

      if (!navigationConnectService.isEnabled()) {
        return res.status(200).json(order);
      }

      try {
        const navigation = await prepareCourierNavigationService.execute({
          orderId,
          restaurantId,
          courierId,
          role,
        });
        return res.status(200).json({ order, navigation });
      } catch (navigationError: unknown) {
        console.error(
          '[NAVIGATION_CONNECT_PREPARE_FAILED]',
          navigationError instanceof Error ? navigationError.message : String(navigationError),
        );
        return res.status(200).json({
          order,
          navigation: null,
          navigationError:
            navigationError instanceof Error
              ? navigationError.message
              : 'Não foi possível preparar a navegação externa.',
        });
      }
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Erro ao iniciar rota',
      });
    }
  }
}

export default new StartCourierRouteController();
