import prisma from '../../../config/prisma.js';
import { createConfiguredTablePaymentProviderForExisting } from '../providers/ConfiguredTablePaymentProvider.js';
import { ProcessTablePaymentWebhookService } from './ProcessTablePaymentWebhookService.js';

export class ReconcileTableCardOrderWebhookService {
  async execute(providerOrderId: string) {
    const normalizedOrderId = String(providerOrderId || '').trim();
    if (!normalizedOrderId) return false;

    const externalId = `mp_order:${normalizedOrderId}`;
    const intent = await prisma.tablePaymentIntent.findFirst({
      where: {
        method: 'CARD',
        provider: 'MERCADO_PAGO',
        providerExternalId: externalId,
      },
      select: {
        id: true,
        publicId: true,
        restaurantId: true,
        tableSessionId: true,
        payerParticipantId: true,
        method: true,
        provider: true,
      },
    });
    if (!intent?.provider) return false;

    const provider = createConfiguredTablePaymentProviderForExisting(
      {
        restaurantId: intent.restaurantId,
        participantId: intent.payerParticipantId,
        participantUserId: null,
        participantName: null,
        participantPhone: null,
        intentId: intent.id,
        intentPublicId: intent.publicId,
        method: 'CARD',
      },
      intent.provider,
    );

    const payment = await provider.getPayment(externalId);
    const processor = new ProcessTablePaymentWebhookService(provider);
    await processor.executeValidated({
      eventId: `mercado-pago-order:${normalizedOrderId}:${payment.status}`,
      externalId,
      status: payment.status,
      amountCents: payment.amountCents,
      occurredAt: new Date(),
    });

    return true;
  }
}

export default new ReconcileTableCardOrderWebhookService();
