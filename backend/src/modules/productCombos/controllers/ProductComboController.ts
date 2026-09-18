import type { Request, Response } from 'express';
import OpenAI from 'openai';
import productComboService from '../services/ProductComboService.js';
import aiCreditService, { AiCreditsExhaustedError } from '../../aiSupport/services/AiCreditService.js';

function message(error: unknown) {
  return error instanceof Error ? error.message : 'Não foi possível processar o combo.';
}

class ProductComboController {
  async list(req: Request, res: Response) {
    try {
      return res.json({ combos: await productComboService.list(req.user.restaurantId) });
    } catch (error) {
      return res.status(400).json({ error: message(error) });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const combo = await productComboService.save(null, req.user.restaurantId, req.body);
      return res.status(201).json({ combo });
    } catch (error) {
      return res.status(400).json({ error: message(error) });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const combo = await productComboService.save(req.params.id, req.user.restaurantId, req.body);
      return res.json({ combo });
    } catch (error) {
      return res.status(400).json({ error: message(error) });
    }
  }

  async remove(req: Request, res: Response) {
    try {
      return res.json(await productComboService.remove(req.params.id, req.user.restaurantId));
    } catch (error) {
      return res.status(400).json({ error: message(error) });
    }
  }

  async generatePreviewImage(req: Request, res: Response) {
    const actor = {
      userId: Number(req.user?.id || 0),
      restaurantId: Number(req.user?.restaurantId || 0),
      userName: req.user?.email,
      userRole: req.user?.role,
    };
    try {
      await aiCreditService.assertAvailable(actor);
      const result = await productComboService.generatePreviewImage(actor.restaurantId, req.body);
      const credits = await aiCreditService.recordUsage({
        ...actor,
        feature: 'GENERATE_COMBO_IMAGE',
        model: result.aiUsage.model,
        costUsd: result.aiUsage.costUsd,
        usage: result.aiUsage.usage,
      });
      return res.json({ image: result.image, credits });
    } catch (error) {
      if (error instanceof AiCreditsExhaustedError) {
        return res.status(402).json({ error: error.message, code: error.code });
      }
      if (error instanceof OpenAI.RateLimitError) {
        return res.status(429).json({ error: 'A IA recebeu muitas solicitações. Tente novamente em instantes.' });
      }
      if (error instanceof OpenAI.APIConnectionTimeoutError) {
        return res.status(504).json({ error: 'A geração da imagem demorou demais. Tente novamente.' });
      }
      return res.status(400).json({ error: message(error) });
    }
  }

  async generateImage(req: Request, res: Response) {
    const actor = {
      userId: Number(req.user?.id || 0),
      restaurantId: Number(req.user?.restaurantId || 0),
      userName: req.user?.email,
      userRole: req.user?.role,
    };
    try {
      await aiCreditService.assertAvailable(actor);
      const result = await productComboService.generateImage(req.params.id, actor.restaurantId);
      const credits = await aiCreditService.recordUsage({
        ...actor,
        feature: 'GENERATE_COMBO_IMAGE',
        model: result.aiUsage.model,
        costUsd: result.aiUsage.costUsd,
        usage: result.aiUsage.usage,
      });
      return res.json({ image: result.image, credits });
    } catch (error) {
      if (error instanceof AiCreditsExhaustedError) {
        return res.status(402).json({ error: error.message, code: error.code });
      }
      if (error instanceof OpenAI.RateLimitError) {
        return res.status(429).json({ error: 'A IA recebeu muitas solicitações. Tente novamente em instantes.' });
      }
      if (error instanceof OpenAI.APIConnectionTimeoutError) {
        return res.status(504).json({ error: 'A geração da imagem demorou demais. Tente novamente.' });
      }
      return res.status(400).json({ error: message(error) });
    }
  }
}

export default new ProductComboController();
