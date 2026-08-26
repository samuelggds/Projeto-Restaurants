import type { Request, Response } from 'express';
import getTableAccountAdminSnapshotService from '../services/GetTableAccountAdminSnapshotService.js';
import { TablePaymentError } from '../services/tablePaymentSupport.js';

class GetTableAccountAdminSnapshotController {
  async handle(req: Request, res: Response) {
    try {
      const result = await getTableAccountAdminSnapshotService.execute({
        sessionPublicId: String(req.params.sessionPublicId || '').trim(),
        actor: {
          id: Number(req.user?.id),
          role: String(req.user?.role || '') as never,
          subRole: (req.user?.subRole || null) as never,
          restaurantId: Number(req.user?.restaurantId || 0),
        },
      });
      res.setHeader('Cache-Control', 'no-store');
      return res.json(result);
    } catch (error) {
      if (error instanceof TablePaymentError) {
        return res.status(error.statusCode).json({ error: error.message, code: error.code });
      }
      console.error(
        '[GET_TABLE_ACCOUNT_ADMIN_SNAPSHOT_ERROR]',
        error instanceof Error ? error.message : String(error),
      );
      return res.status(500).json({ error: 'Não foi possível carregar o histórico da mesa.' });
    }
  }
}

export default new GetTableAccountAdminSnapshotController();
