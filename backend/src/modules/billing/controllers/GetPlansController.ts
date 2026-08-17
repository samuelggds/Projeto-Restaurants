import { Request, Response } from 'express';
import { PLAN_CONFIG } from '../config/planConfig.js';

class GetPlansController {
  handle(_req: Request, res: Response) {
    const plans = Object.entries(PLAN_CONFIG)
      .filter(([, config]) => config.availableForSale)
      .map(([key, config]) => ({
        plan: key,
        name: config.name,
        monthlyFee: config.monthlyFee,
        trialDays: config.trialDays,
        features: config.features,
      }));
    return res.status(200).json(plans);
  }
}

export default new GetPlansController();
