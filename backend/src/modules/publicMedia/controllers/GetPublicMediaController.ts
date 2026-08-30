import type { Request, Response } from 'express';

import getPublicMediaService, { type PublicMedia } from '../services/GetPublicMediaService.js';

const DATA_IMAGE_PATTERN = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\r\n]+)$/i;
const MAX_PUBLIC_IMAGE_BYTES = 5 * 1024 * 1024;

function sendMedia(res: Response, media: PublicMedia) {
  if (/^https?:\/\//i.test(media.source)) {
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.redirect(302, media.source);
  }

  const match = DATA_IMAGE_PATTERN.exec(media.source);
  if (!match) return res.status(404).json({ error: 'Imagem não encontrada.' });

  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length || buffer.length > MAX_PUBLIC_IMAGE_BYTES) {
    return res.status(404).json({ error: 'Imagem não encontrada.' });
  }

  res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Last-Modified', media.updatedAt.toUTCString());
  res.type(match[1]);
  return res.send(buffer);
}

function errorStatus(error: unknown) {
  return error instanceof Error && /inválid/i.test(error.message) ? 400 : 404;
}

class GetPublicMediaController {
  async logo(req: Request, res: Response) {
    try {
      return sendMedia(
        res,
        await getPublicMediaService.restaurantImage(req.params.restaurantId, 'logo'),
      );
    } catch (error: unknown) {
      return res.status(errorStatus(error)).json({
        error: error instanceof Error ? error.message : 'Imagem não encontrada.',
      });
    }
  }

  async cover(req: Request, res: Response) {
    try {
      return sendMedia(
        res,
        await getPublicMediaService.restaurantImage(req.params.restaurantId, 'cover'),
      );
    } catch (error: unknown) {
      return res.status(errorStatus(error)).json({
        error: error instanceof Error ? error.message : 'Imagem não encontrada.',
      });
    }
  }

  async banner(req: Request, res: Response) {
    try {
      return sendMedia(
        res,
        await getPublicMediaService.bannerImage(req.params.restaurantId, req.params.bannerId),
      );
    } catch (error: unknown) {
      return res.status(errorStatus(error)).json({
        error: error instanceof Error ? error.message : 'Imagem não encontrada.',
      });
    }
  }

  async product(req: Request, res: Response) {
    try {
      return sendMedia(
        res,
        await getPublicMediaService.productImage(req.params.restaurantId, req.params.productId),
      );
    } catch (error: unknown) {
      return res.status(errorStatus(error)).json({
        error: error instanceof Error ? error.message : 'Imagem não encontrada.',
      });
    }
  }
}

export default new GetPublicMediaController();
