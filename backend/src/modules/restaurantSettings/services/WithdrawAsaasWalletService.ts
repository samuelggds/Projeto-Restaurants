import crypto from 'node:crypto';
import prisma from '../../../config/prisma.js';
import restaurantSettingsRepository from '../repositories/RestaurantSettingsRepository.js';
import { buildWithdrawalReference } from './asaasWithdrawalValidation.js';

type WithdrawAsaasWalletPayload = {
  restaurantId: number | string;
  requestedByUserId: number | string;
  value: number;
  pixKey?: string;
  description?: string;
};

type AsaasErrorItem = {
  description?: string;
};

type AsaasTransferResponse = {
  id?: string;
  value?: number;
  status?: string;
  operationType?: string;
  dateCreated?: string;
  errors?: AsaasErrorItem[];
};

class WithdrawAsaasWalletService {
  private getAsaasBaseUrl() {
    return String(process.env.ASAAS_API_BASE_URL || 'https://api.asaas.com')
      .trim()
      .replace(/\/+$/, '');
  }

  private extractProviderError(payload: AsaasTransferResponse) {
    if (!Array.isArray(payload?.errors) || payload.errors.length === 0) {
      return 'Falha ao solicitar saque no Asaas.';
    }

    const firstError = String(payload.errors[0]?.description || '').trim();
    return firstError || 'Falha ao solicitar saque no Asaas.';
  }

  async execute({
    restaurantId,
    requestedByUserId,
    value,
    pixKey,
    description,
  }: WithdrawAsaasWalletPayload) {
    const normalizedRestaurantId = Number(restaurantId);
    if (!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new Error('Restaurante invalido para saque Asaas.');
    }

    const normalizedUserId = Number(requestedByUserId);
    if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0) {
      throw new Error('Administrador invalido para saque Asaas.');
    }

    const normalizedValue = Number(value);
    if (!Number.isFinite(normalizedValue) || normalizedValue <= 0) {
      throw new Error('Valor de saque invalido.');
    }

    const settings = await restaurantSettingsRepository.findByRestaurantId(normalizedRestaurantId);

    const asaasToken = String(settings?.asaasAccessToken || '').trim();
    if (!asaasToken) {
      throw new Error('Conta Asaas ainda nao vinculada. Finalize o onboarding para sacar.');
    }

    const targetPixKey = String(pixKey || settings?.pixKey || '').trim();
    if (!targetPixKey) {
      throw new Error('Chave PIX obrigatoria para saque.');
    }

    const baseDescription = String(description || 'Saque carteira Asaas')
      .trim()
      .slice(0, 90);

    const withdrawalRequest = await prisma.asaasWithdrawalRequest.create({
      data: {
        restaurantId: normalizedRestaurantId,
        requestedByUserId: normalizedUserId,
        value: normalizedValue.toFixed(2),
        pixKeyHash: crypto.createHash('sha256').update(targetPixKey).digest('hex'),
        pixKeyLastFour: targetPixKey.slice(-4) || null,
        description: baseDescription,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
      select: { id: true, publicId: true },
    });
    const transferDescription = `${baseDescription} ${buildWithdrawalReference(withdrawalRequest.publicId)}`;

    const asaasBaseUrl = this.getAsaasBaseUrl();
    let responseBody: AsaasTransferResponse;
    try {
      const response = await fetch(`${asaasBaseUrl}/v3/transfers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          access_token: asaasToken,
        },
        body: JSON.stringify({
          value: Number(normalizedValue.toFixed(2)),
          operationType: 'PIX',
          pixAddressKey: targetPixKey,
          description: transferDescription,
        }),
      });

      responseBody = (await response.json()) as AsaasTransferResponse;
      if (!response.ok) {
        throw new Error(this.extractProviderError(responseBody));
      }
    } catch (error) {
      await prisma.asaasWithdrawalRequest.updateMany({
        where: { id: withdrawalRequest.id, status: 'REQUESTED' },
        data: { status: 'FAILED' },
      });
      throw error;
    }

    await prisma.asaasWithdrawalRequest.updateMany({
      where: { id: withdrawalRequest.id, status: 'REQUESTED' },
      data: {
        providerTransferId: String(responseBody?.id || '').trim() || null,
        providerStatus: String(responseBody?.status || 'PENDING'),
      },
    });

    return {
      transferId: String(responseBody?.id || ''),
      status: String(responseBody?.status || 'PENDING'),
      value: Number(responseBody?.value || normalizedValue),
      operationType: String(responseBody?.operationType || 'PIX'),
      dateCreated: String(responseBody?.dateCreated || ''),
      pixKey: targetPixKey,
    };
  }
}

export default new WithdrawAsaasWalletService();
