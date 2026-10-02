import prisma from '../../../config/prisma.js';
import {
  createConfiguredTablePaymentProviderForExisting,
  type ConfiguredTablePaymentProviderContext,
} from '../providers/ConfiguredTablePaymentProvider.js';
import type { PaymentProvider } from '../providers/PaymentProvider.js';
import { ProcessTablePaymentWebhookService } from './ProcessTablePaymentWebhookService.js';

type TableOnlineIntent = {
  id: number;
  publicId: string;
  restaurantId: number;
  tableSessionId: number;
  payerParticipantId: number;
  method: string;
  provider: string | null;
};

type IntentLookup = (externalId: string) => Promise<TableOnlineIntent | null>;
type ProviderFactory = (
  context: ConfiguredTablePaymentProviderContext,
  provider: string,
) => PaymentProvider;
type Processor = Pick<ProcessTablePaymentWebhookService, 'executeValidated'>;
type ProcessorFactory = (provider: PaymentProvider) => Processor;

const defaultIntentLookup: IntentLookup = (externalId) =>
  prisma.tablePaymentIntent.findFirst({
    where: {
      method: { in: ['PIX', 'CARD'] },
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

export class ReconcileTableOrderWebhookService {
  constructor(
    private readonly findIntent: IntentLookup = defaultIntentLookup,
    private readonly providerFactory: ProviderFactory = createConfiguredTablePaymentProviderForExisting,
    private readonly processorFactory: ProcessorFactory = (provider) =>
      new ProcessTablePaymentWebhookService(provider),
  ) {}

  async execute(providerOrderId: string) {
    const normalizedOrderId = String(providerOrderId || '').trim();
    if (!normalizedOrderId) return false;

    const externalId = `mp_order:${normalizedOrderId}`;
    const intent = await this.findIntent(externalId);
    if (!intent?.provider || !['PIX', 'CARD'].includes(intent.method)) return false;

    const provider = this.providerFactory(
      {
        restaurantId: intent.restaurantId,
        participantId: intent.payerParticipantId,
        participantUserId: null,
        participantName: null,
        participantPhone: null,
        intentId: intent.id,
        intentPublicId: intent.publicId,
        method: intent.method as 'PIX' | 'CARD',
      },
      intent.provider,
    );

    const payment = await provider.getPayment(externalId);
    const processor = this.processorFactory(provider);
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

export default new ReconcileTableOrderWebhookService();
