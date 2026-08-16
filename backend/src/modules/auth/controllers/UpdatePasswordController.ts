import { Request, Response } from 'express';
import updatePasswordService from '../services/UpdatePasswordService.js';

class UpdatePasswordController {
  async handle(req: Request, res: Response) {
    try {
      const userId = req.user.id;

      const { oldPassword, newPassword } = req.body;

      await updatePasswordService.execute(userId, oldPassword, newPassword);

      return res.status(200).json({ message: 'Senha atualizada com sucesso!' });
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Erro ao atualizar senha',
      });
    }
  }
}

export default new UpdatePasswordController();
