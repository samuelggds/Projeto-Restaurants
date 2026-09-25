import prisma from '../../../config/prisma.js';
import orderRepository from '../repositories/OrderRepository.js';
import restaurantSettingsRepository from '../../restaurantSettings/repositories/RestaurantSettingsRepository.js';
import {
  efiOpenFinanceConfigured,
  efiOpenFinanceIdempotencyKey,
  efiOpenFinanceOrderReference,
  efiOpenFinancePaymentId,
  efiOpenFinanceRequest,
  findEfiOpenFinancePayment,
  type EfiOpenFinancePayment,
} from '../../payments/providers/efiOpenFinance.js';
import { isValidCpf, normalizePixKey } from './pixPayload.js';

type StartPayload = {
  orderId: number | string;
  restaurantId: number | string;
  participantId: string;
  customerCpf: string;
};

type StartResponse = {
  identificadorPagamento?: string;
  redirectURI?: string;
  nome?: string;
  mensagem?: string;
};

const TERMINAL = new Set(['aceito', 'rejeitado', 'cancelado', 'expirado', 'erro']);

function requireHttpsRedirect(value: unknown) {
  const raw = String(value || '').trim();
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('A Efí não retornou um redirecionamento válido.');
  }
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new Error('A Efí não retornou um redirecionamento HTTPS válido.');
  }
  return url.toString();
}

class OpenFinanceEfiPaymentService {
  async start({ orderId, restaurantId, participantId, customerCpf }: StartPayload) {
    const normalizedRestaurantId = Number(restaurantId);
    const normalizedOrderId = Number(orderId);
    const normalizedParticipantId = String(participantId || '').trim();
    const cpf = String(customerCpf || '').replace(/\D/g, '');

    if (!Number.isSafeInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new Error('Restaurante inválido para Open Finance.');
    }
    if (!Number.isSafeInteger(normalizedOrderId) || normalizedOrderId <= 0) {
      throw new Error('Pedido inválido para Open Finance.');
    }
    if (!normalizedParticipantId || normalizedParticipantId.length > 120) {
      throw new Error('Escolha o banco para pagar via Open Finance.');
    }
    if (!isValidCpf(cpf)) {
      throw new Error('Informe um CPF válido para pagar via Open Finance.');
    }
    if (!efiOpenFinanceConfigured()) {
      throw new Error('Open Finance Efí ainda não está configurado pela plataforma.');
    }

    const settings = await restaurantSettingsRepository.findByRestaurantId(normalizedRestaurantId);
    if (!settings?.openFinancePixEnabled) {
      throw new Error('Open Finance está desativado neste restaurante.');
    }

    const beneficiaryPixKey = normalizePixKey(settings.pixKey);
    if (!beneficiaryPixKey) {
      throw new Error('Cadastre a chave Pix de recebimento do restaurante para usar Open Finance.');
    }

    const order = await orderRepository.findById(normalizedOrderId, normalizedRestaurantId);
    if (!order || String(order.paymentMethod || '').toUpperCase() !== 'PIX' || order.payOnDelivery) {
      throw new Error('Pedido inválido para pagamento via Open Finance.');
    }
    if (order.paid === true) {
      return {
        paymentId: String(order.pixPaymentId || ''),
        provider: 'EFI_OPEN_FINANCE',
        status: 'aceito',
        paid: true,
        orderId: order.id,
        orderPublicId: order.publicId,
        totalAmount: Number(order.total),
      };
    }
    if (String(order.status || '').toUpperCase() === 'CANCELADO') {
      throw new Error('Este pedido foi cancelado e não pode mais ser pago.');
    }

    const existingPaymentId = String(order.pixPaymentId || '').trim();
    if (existingPaymentId) {
      if (!existingPaymentId.toLowerCase().startsWith('efi_open_finance:')) {
        throw new Error('Este pedido já possui outra tentativa de pagamento Pix.');
      }
      const identifier = existingPaymentId.slice('efi_open_finance:'.length).trim();
      const reference = efiOpenFinanceOrderReference(normalizedRestaurantId, order.id);
      const remote = await findEfiOpenFinancePayment({
        identifier,
        reference,
        createdAt: order.createdAt,
      });
      const status = String(remote?.status || 'pendente').trim().toLowerCase();
      return {
        paymentId: existingPaymentId,
        provider: 'EFI_OPEN_FINANCE',
        status,
        paid: status === 'aceito',
        redirectUrl: null,
        orderId: order.id,
        orderPublicId: order.publicId,
        totalAmount: Number(order.total),
        requiresStatusCheck: !TERMINAL.has(status),
      };
    }

    const restaurant = await prisma.restaurant.findFirst({
      where: { id: normalizedRestaurantId, active: true },
      select: { name: true },
    });
    if (!restaurant) throw new Error('Restaurante indisponível para este pagamento.');

    const total = Number(order.total);
    if (!Number.isFinite(total) || total <= 0) throw new Error('Total do pedido inválido.');

    const reference = efiOpenFinanceOrderReference(normalizedRestaurantId, order.id);
    const result = await efiOpenFinanceRequest<StartResponse>('POST', '/v1/pagamentos/pix', {
      headers: {
        'x-idempotency-key': efiOpenFinanceIdempotencyKey(normalizedRestaurantId, order.id),
      },
      data: {
        pagador: {
          idParticipante: normalizedParticipantId,
          cpf,
        },
        favorecido: {
          chave: beneficiaryPixKey,
        },
        pagamento: {
          valor: total.toFixed(2),
          infoPagador: `Pedido #${order.id} - ${String(restaurant.name || 'GastroNexa').slice(0, 80)}`,
          idProprio: reference,
        },
      },
    });

    const identifier = String(result.data?.identificadorPagamento || '').trim();
    const redirectUri = String(result.data?.redirectURI || '').trim();
    if (result.status < 200 || result.status >= 300 || !identifier || !redirectUri) {
      const providerMessage = String(result.data?.mensagem || '').trim();
      throw new Error(
        providerMessage
          ? `A Efí não iniciou o Open Finance: ${providerMessage}`
          : 'A Efí não iniciou o pagamento Open Finance.',
      );
    }

    const paymentId = efiOpenFinancePaymentId(identifier);
    const localExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await orderRepository.claimPixPaymentId(
      order.id,
      normalizedRestaurantId,
      paymentId,
      undefined,
      localExpiresAt,
    );

    return {
      paymentId,
      provider: 'EFI_OPEN_FINANCE',
      status: 'pendente',
      paid: false,
      redirectUrl: requireHttpsRedirect(redirectUri),
      orderId: order.id,
      orderPublicId: order.publicId,
      totalAmount: total,
      expiresAt: localExpiresAt.toISOString(),
      requiresStatusCheck: true,
    };
  }

  async statusForOrder(order: {
    id: number;
    restaurantId: number;
    createdAt?: Date | string | null;
    pixPaymentId?: string | null;
  }): Promise<EfiOpenFinancePayment | null> {
    const paymentId = String(order.pixPaymentId || '').trim();
    if (!paymentId.toLowerCase().startsWith('efi_open_finance:')) return null;
    const identifier = paymentId.slice('efi_open_finance:'.length).trim();
    return findEfiOpenFinancePayment({
      identifier,
      reference: efiOpenFinanceOrderReference(order.restaurantId, order.id),
      createdAt: order.createdAt,
    });
  }
}

export default new OpenFinanceEfiPaymentService();
