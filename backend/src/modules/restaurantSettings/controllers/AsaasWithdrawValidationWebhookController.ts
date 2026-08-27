import crypto from 'node:crypto';
import { Request, Response } from 'express';
import prisma from '../../../config/prisma.js';
import {
  extractWithdrawalReference,
  validateWithdrawalAgainstRequest,
} from '../services/asaasWithdrawalValidation.js';

type AsaasWithdrawValidationPayload = {
  type?: string;
  transfer?: {
    id?: string;
    operationType?: string;
    value?: number;
      description?: string | null;
  };
};

class AsaasWithdrawValidationWebhookController {
  async handle(req: Request, res: Response) {
    try {
      const tokenFromHeader = String(req.header('asaas-access-token') || '').trim();
      const expectedToken = String(
        process.env.ASAAS_WITHDRAW_WEBHOOK_TOKEN || process.env.ASAAS_WEBHOOK_TOKEN || '',
      ).trim();

      const expectedBuffer = Buffer.from(expectedToken);
      const receivedBuffer = Buffer.from(tokenFromHeader);
      const validToken =
        expectedBuffer.length > 0 &&
        expectedBuffer.length === receivedBuffer.length &&
        crypto.timingSafeEqual(expectedBuffer, receivedBuffer);

      if (!validToken) {
        return res.status(401).json({
          status: 'REFUSED',
          refuseReason: 'Token de webhook invalido.',
        });
      }

      const payload = req.body as AsaasWithdrawValidationPayload;
      const normalizedType = String(payload?.type || '')
        .trim()
        .toUpperCase();
      const transferId = String(payload?.transfer?.id || '').trim();
      const operationType = String(payload?.transfer?.operationType || '').trim();
      const value = Number(payload?.transfer?.value);
      const description = String(payload?.transfer?.description || '');
      const publicId = extractWithdrawalReference(description);

      if (!normalizedType || !publicId) {
        return res.status(200).json({
          status: 'REFUSED',
          refuseReason: 'Saque sem referencia interna valida.',
        });
      }

      const request = await prisma.asaasWithdrawalRequest.findUnique({
        where: { publicId },
        select: {
          id: true,
          publicId: true,
          status: true,
          value: true,
          expiresAt: true,
          providerTransferId: true,
        },
      });
      const decision = validateWithdrawalAgainstRequest(
        { transferId, operationType, value, description },
        request
          ? {
              ...request,
              value: Number(request.value),
            }
          : null,
      );

      if (!decision.approved) {
        return res.status(200).json({
          status: 'REFUSED',
          refuseReason: decision.reason,
        });
      }

      if (!decision.repeated && request) {
        const changed = await prisma.asaasWithdrawalRequest.updateMany({
          where: {
            id: request.id,
            status: 'REQUESTED',
            expiresAt: { gt: new Date() },
          },
          data: {
            status: 'VALIDATED',
            providerTransferId: transferId,
            providerStatus: normalizedType,
            validatedAt: new Date(),
          },
        });

        if (changed.count !== 1) {
          return res.status(200).json({
            status: 'REFUSED',
            refuseReason: 'Solicitacao de saque ja processada.',
          });
        }
      }

      return res.status(200).json({ status: 'APPROVED' });
    } catch (error: unknown) {
      console.error(
        '[ASAAS_WITHDRAW_VALIDATION_WEBHOOK_ERROR]',
        error instanceof Error ? error.message : String(error),
      );

      return res.status(200).json({
        status: 'REFUSED',
        refuseReason: 'Falha interna na validacao de saque.',
      });
    }
  }
}

export default new AsaasWithdrawValidationWebhookController();
