import { Request, Response } from 'express';
import createRestaurantService from '../services/CreateRestaurantService.js';

class CreateRestaurantController {
  async handle(req: Request, res: Response) {
    try {
      const { restaurant, admin, plan } = req.body;

      const result = await createRestaurantService.execute({
        restaurant,
        admin,
        plan,
        actor:
          req.user?.id && req.user.role
            ? {
                userId: req.user.id,
                ipAddress: req.ip,
                requestId: req.requestId ?? null,
                userAgent: req.get('user-agent') ?? null,
              }
            : undefined,
      });

      return res.status(201).json(result);
    } catch (error: unknown) {
      return res.status(400).json({
        message: error instanceof Error ? error.message : 'Erro ao criar restaurante',
      });
    }
  }
}

export default new CreateRestaurantController();
