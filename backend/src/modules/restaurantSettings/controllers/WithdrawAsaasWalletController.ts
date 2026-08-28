import { Request, Response } from 'express';
import withdrawAsaasWalletService from '../services/WithdrawAsaasWalletService.js';

class WithdrawAsaasWalletController {
  async handle(req: Request, res: Response) {
    try {
      const restaurantId = req.user?.restaurantId;
      const requestedByUserId = req.user?.id;
      const { value, pixKey, description } = req.body;

      const result = await withdrawAsaasWalletService.execute({
        restaurantId,
        requestedByUserId,
        value: Number(value),
        pixKey,
        description,
      });

      return res.status(200).json({
        withdrawalRequestId: result.withdrawalRequestId,
        transferId: result.transferId,
        status: result.status,
        value: result.value,
        operationType: result.operationType,
        dateCreated: result.dateCreated,
      });
    } catch (error: unknown) {
      const sensitivePixKey = String(req.body?.pixKey || '').trim();
      const errorMessage =
        error instanceof Error ? error.message : 'Erro ao solicitar saque da carteira Asaas.';
      const safeErrorMessage = sensitivePixKey
        ? errorMessage.split(sensitivePixKey).join('[DADO REDIGIDO]')
        : errorMessage;

      return res.status(400).json({
        error: safeErrorMessage,
      });
    }
  }
}

export default new WithdrawAsaasWalletController();
