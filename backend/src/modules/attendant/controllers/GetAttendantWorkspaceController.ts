import type { Request, Response } from 'express';
import { safeErrorName } from '../../../services/telemetrySanitizer.js';
import getAttendantWorkspaceService, {
  AttendantWorkspaceAccessError,
} from '../services/GetAttendantWorkspaceService.js';

class GetAttendantWorkspaceController {
  async handle(req: Request, res: Response) {
    try {
      const workspace = await getAttendantWorkspaceService.execute({
        restaurantId: req.user?.restaurantId,
        role: req.user?.role,
        subRole: req.user?.subRole,
      });
      return res.status(200).json(workspace);
    } catch (error) {
      if (error instanceof AttendantWorkspaceAccessError) {
        return res.status(403).json({ error: error.message });
      }

      console.error('[ATTENDANT_WORKSPACE_LOAD_FAILED]', {
        errorType: safeErrorName(error),
      });
      return res.status(500).json({
        error: 'Não foi possível carregar a área de atendimento.',
      });
    }
  }
}

export default new GetAttendantWorkspaceController();
