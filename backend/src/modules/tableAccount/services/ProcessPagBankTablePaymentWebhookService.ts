import {
  getPagBankCheckoutPayment,
  pagBankTableReference,
} from '../../payments/providers/pagBankCheckout.js';
import tablePaymentRepository from '../repositories/TablePaymentRepository.js';
import { createConfiguredTablePaymentProviderForExisting } from '../providers/ConfiguredTablePaymentProvider.js';
import { ProcessTablePaymentWebhookService } from './ProcessTablePaymentWebhookService.js';

export class ProcessPagBankTablePaymentWebhookService {
  constructor(
    private readonly processor?: Pick<ProcessTablePaymentWebhookService, 'executeValidated'>,
  ) {}

  async execute(input: {
    intentId: number;
    restaurantId: number;
    reference: string;
    providerOrderId: string;
  }) {
    const intent = await tablePaymentRepository.findPagBankCheckout(
      input.intentId,
      input.restaurantId,
    );
    if (!intent) return { received: true, ignored: true };
    if (pagBankTableReference(intent) !== input.reference) {
      throw new Error('A referência PagBank não corresponde ao pagamento da mesa.');
    }
    const externalId = String(intent.providerExternalId || '');
    if (!externalId.startsWith('pagbank_checkout:')) {
      throw new Error('O checkout PagBank da mesa ainda não está disponível para confirmação.');
    }
    const amountCents = Number(intent.totalCents);
    if (!Number.isSafeInteger(amountCents) || amountCents <= 0)
      throw new Error('Valor da conta da mesa inválido.');
    const evidence = await getPagBankCheckoutPayment({
      restaurantId: input.restaurantId,
      checkoutId: externalId.slice('pagbank_checkout:'.length),
      reference: input.reference,
      amountCents,
      orderId: input.providerOrderId,
    });
    if (!evidence.chargeId || !['PAID', 'REFUNDED'].includes(evidence.status)) {
      return { received: true, pending: true };
    }
    if (intent.providerChargeId && intent.providerChargeId !== evidence.chargeId) {
      throw new Error('O pagamento da mesa já está vinculado a outra cobrança.');
    }
    const bound = await tablePaymentRepository.bindPagBankCharge({
      id: intent.id,
      restaurantId: intent.restaurantId,
      publicId: intent.publicId,
      checkoutReference: externalId,
      chargeId: evidence.chargeId,
    });
    if (!bound)
      throw new Error('O vínculo da cobrança da mesa foi alterado durante a confirmação.');
    const provider = createConfiguredTablePaymentProviderForExisting(
      {
        restaurantId: intent.restaurantId,
        intentId: intent.id,
        intentPublicId: intent.publicId,
        participantId: intent.payerParticipantId,
        participantUserId: null,
        participantName: null,
        participantPhone: null,
        method: 'CARD',
      },
      'PAGBANK',
    );
    const processor = this.processor || new ProcessTablePaymentWebhookService(provider);
    return processor.executeValidated({
      eventId: `pagbank:${evidence.chargeId}:${evidence.status}`,
      externalId,
      status: evidence.status,
      amountCents,
      occurredAt: new Date(),
    });
  }
}

export default new ProcessPagBankTablePaymentWebhookService();
