import { Request, Response } from 'express';
import googleAuthService from '../services/GoogleAuthService.js';

class GoogleAuthController {
  async handle(req: Request, res: Response) {
    try {
      const { idToken } = req.body;

      const result = await googleAuthService.execute({ idToken });

      return res.json(result);
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Erro no login Google',
      });
    }
  }
}

export default new GoogleAuthController();
