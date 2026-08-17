import { Request, Response } from 'express';
import getAsaasWalletBalanceService from '../services/GetAsaasWalletBalanceService.js';

class GetAsaasWalletBalanceController {
  async handle(req: Request, res: Response) {
    try {
      const restaurantId = req.user?.restaurantId;

      const result = await getAsaasWalletBalanceService.execute({
        restaurantId,
      });

      return res.status(200).json(result);
    } catch (error: unknown) {
      return res.status(400).json({
        error:
          error instanceof Error ? error.message : 'Erro ao consultar saldo da carteira Asaas.',
      });
    }
  }
}

export default new GetAsaasWalletBalanceController();
