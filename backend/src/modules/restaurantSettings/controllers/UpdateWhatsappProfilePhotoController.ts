import { Request, Response } from 'express';
import prisma from '../../../config/prisma.js';
import { updateGupshupProfilePhoto } from '../../../services/gupshupProfilePhoto.js';
import { resolveWhatsAppDeliveryProvider } from '../../../services/whatsappProvider.js';

class UpdateWhatsappProfilePhotoController {
  async handle(req: Request, res: Response) {
    try {
      const restaurantId = Number(req.user.restaurantId);
      const imageDataUrl = String(req.body?.imageDataUrl || '').trim();

      if (!restaurantId) {
        return res.status(400).json({ error: 'Restaurante inválido.' });
      }
      if (!imageDataUrl) {
        return res.status(400).json({ error: 'Selecione uma foto para o WhatsApp.' });
      }
      if (resolveWhatsAppDeliveryProvider() !== 'gupshup') {
        return res.status(409).json({
          error: 'A foto do perfil só pode ser sincronizada quando a Gupshup estiver ativa.',
        });
      }

      const restaurant = await prisma.restaurant.findUnique({
        where: { id: restaurantId },
        select: {
          whatsapp: true,
          settings: {
            select: { whatsappEnabled: true },
          },
        },
      });

      if (!restaurant) {
        return res.status(404).json({ error: 'Restaurante não encontrado.' });
      }
      if (restaurant.settings?.whatsappEnabled === false) {
        return res.status(409).json({ error: 'Ative o WhatsApp antes de sincronizar a foto.' });
      }

      const source = String(restaurant.whatsapp || '').replace(/\D/g, '');
      if (!source) {
        return res.status(400).json({ error: 'Informe o número comercial do WhatsApp.' });
      }

      await updateGupshupProfilePhoto({ source, imageDataUrl });
      return res.status(200).json({ updated: true });
    } catch (error: unknown) {
      console.error('[WHATSAPP_PROFILE_PHOTO_ERROR]', {
        name: error instanceof Error ? error.name : 'UnknownError',
      });
      return res.status(400).json({
        error:
          error instanceof Error
            ? error.message
            : 'Não foi possível atualizar a foto do perfil do WhatsApp.',
      });
    }
  }
}

export default new UpdateWhatsappProfilePhotoController();
