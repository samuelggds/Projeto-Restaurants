import { Request, Response } from 'express';
import getRestaurantsMetricsService from '../services/GetRestaurantsMetricsService.js';

class GetRestaurantsMetricsController {
  async handle(req: Request, res: Response) {
    try {
      const metrics = await getRestaurantsMetricsService.execute();
      return res.status(200).json(metrics);
    } catch (error: unknown) {
      return res.status(400).json({
        message: error instanceof Error ? error.message : 'Erro ao buscar metricas de restaurantes',
      });
    }
  }
}

export default new GetRestaurantsMetricsController();
