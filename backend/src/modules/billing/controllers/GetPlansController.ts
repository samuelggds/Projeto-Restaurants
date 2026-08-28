import { Request, Response } from 'express';
import platformPlanCatalogService from '../services/PlatformPlanCatalogService.js';

export class GetPlansController {
  constructor(
    private readonly planCatalog: Pick<
      typeof platformPlanCatalogService,
      'list'
    > = platformPlanCatalogService,
  ) {}

  async handle(_req: Request, res: Response) {
    try {
      const plans = await this.planCatalog.list({ activeOnly: true });
      return res.status(200).json(plans);
    } catch (_error: unknown) {
      return res.status(503).json({
        message: 'Não foi possível carregar o catálogo de planos no momento.',
      });
    }
  }
}

export default new GetPlansController();
