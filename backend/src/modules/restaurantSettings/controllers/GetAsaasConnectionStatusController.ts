import { Request, Response } from 'express';
import service from '../services/GetAsaasConnectionStatusService.js';

class GetAsaasConnectionStatusController {
  async handle(req: Request, res: Response) {
    try {
      return res.json(await service.execute({ restaurantId: req.user?.restaurantId }));
    } catch {
      return res.status(400).json({ error: 'Não foi possível consultar a conexão Asaas.' });
    }
  }
}
export default new GetAsaasConnectionStatusController();
