import { Request, Response } from 'express';
import reactivateUserService from '../services/ReactivateUserService.js';

class ReactivateUserController {
  async handle(req: Request, res: Response) {
    try {
      const userId = req.user.id;

      const user = await reactivateUserService.execute(userId);

      return res.json(user);
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Erro ao reativar usuario',
      });
    }
  }
}

export default new ReactivateUserController();
