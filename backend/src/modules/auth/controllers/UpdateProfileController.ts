import { Request, Response } from 'express';
import updateProfileService from '../services/UpdateProfileService.js';

class UpdateProfileController {
  async handle(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const profileData = req.body;

      const user = await updateProfileService.execute(userId, profileData);

      return res.status(200).json(user);
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Erro ao atualizar perfil',
      });
    }
  }
}

export default new UpdateProfileController();
