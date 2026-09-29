import { Request, Response } from 'express';
import { z } from 'zod';
import { clearableBrazilPhoneSchema } from '../../../validators/PhoneValidator.js';
import updateProfileService from '../services/UpdateProfileService.js';

const updateProfileSchema = z.object({ phone: clearableBrazilPhoneSchema }).passthrough();

class UpdateProfileController {
  async handle(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const parsed = updateProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: parsed.error.issues[0]?.message || 'Telefone inválido.',
        });
      }

      const user = await updateProfileService.execute(userId, parsed.data);

      return res.status(200).json(user);
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Erro ao atualizar perfil',
      });
    }
  }
}

export default new UpdateProfileController();
