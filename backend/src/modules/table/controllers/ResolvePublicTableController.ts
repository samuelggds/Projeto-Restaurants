import type { Request, Response } from 'express';
import resolvePublicTableService, {
  PublicTableResolutionError,
} from '../services/ResolvePublicTableService.js';

class ResolvePublicTableController {
  async handle(req: Request, res: Response) {
    try {
      const table = await resolvePublicTableService.execute({
        tableNumber: String(req.query.tableNumber || ''),
        tableId: req.query.tableId ? String(req.query.tableId) : null,
        restaurantId: req.query.restaurantId ? String(req.query.restaurantId) : null,
        restaurantSlug: req.query.slug ? String(req.query.slug) : null,
      });

      return res.status(200).json(table);
    } catch (error: unknown) {
      const statusCode = error instanceof PublicTableResolutionError ? error.statusCode : 500;
      const code =
        error instanceof PublicTableResolutionError ? error.code : 'PUBLIC_TABLE_RESOLUTION_FAILED';

      return res.status(statusCode).json({
        error: error instanceof Error ? error.message : 'Não foi possível identificar a mesa.',
        code,
      });
    }
  }
}

export default new ResolvePublicTableController();
