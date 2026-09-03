import type { PaymentProvider } from '../providers/PaymentProvider.js';
import { createConfiguredTablePaymentProviderForExisting } from '../providers/ConfiguredTablePaymentProvider.js';
import tablePaymentRepository from '../repositories/TablePaymentRepository.js';
import processTablePaymentWebhookService, {
  ProcessTablePaymentWebhookService,
  type ProcessTablePaymentWebhookService as ProcessTablePaymentWebhookServiceType,
} from './ProcessTablePaymentWebhookService.js';
import { serializeTablePaymentIntent, TablePaymentError } from './tablePaymentSupport.js';

type ProviderReader = Pick<PaymentProvider, 'code' | 'getPayment'>;
type CanonicalProcessor = Pick<ProcessTablePaymentWebhookServiceType, 'executeValidated'>;

type ReconcileInput = {
  publicId: string;
  tableSessionId: number;
  sessionPublicId: string;
  restaurantId: number;
  participantId: number;
  participantUserId?: number | null;
  participantName?: string | null;
  participantPhone?: string | null;
};

export class ReconcileTablePaymentService {
  constructor(
    private readonly provider: ProviderReader | null = null,
    private readonly processor: CanonicalProcessor | null = null,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(input: ReconcileInput) {
    const intent = await tablePaymentRepository.findOwnedByPublicId(
      input.publicId,
      input.restaurantId,
      input.tableSessionId,
      input.participantId,
    );
    if (!intent) {
      throw new TablePaymentError(
        'Pagamento não encontrado nesta participação.',
        404,
        'TABLE_PAYMENT_NOT_FOUND',
      );
    }
    if (!intent.provider || !intent.providerExternalId) {
      throw new TablePaymentError(
        'Este pagamento não possui verificação online.',
        409,
        'TABLE_PAYMENT_NOT_RECONCILABLE',
      );
    }

    const provider =
      this.provider ||
      createConfiguredTablePaymentProviderForExisting(
        {
          restaurantId: input.restaurantId,
          participantId: input.participantId,
          participantUserId: input.participantUserId || null,
          participantName: input.participantName || null,
          participantPhone: input.participantPhone || null,
          intentId: intent.id,
          intentPublicId: intent.publicId,
          method: intent.method as 'PIX' | 'CARD',
        },
        intent.provider,
      );

    if (intent.provider !== provider.code) {
      throw new TablePaymentError(
        'O provedor do pagamento não corresponde à configuração esperada.',
        409,
        'TABLE_PAYMENT_PROVIDER_MISMATCH',
      );
    }

    const providerPayment = await provider.getPayment(intent.providerExternalId);
    if (providerPayment.externalId !== intent.providerExternalId) {
      throw new TablePaymentError(
        'A cobrança retornada pelo provedor não corresponde ao pagamento.',
        409,
        'PROVIDER_PAYMENT_MISMATCH',
      );
    }
    if (providerPayment.amountCents !== Number(intent.totalCents)) {
      throw new TablePaymentError(
        'O valor retornado pelo provedor não corresponde ao pagamento.',
        409,
        'PROVIDER_AMOUNT_MISMATCH',
      );
    }

    const occurredAt = this.now();
    const processor =
      this.processor ||
      (this.provider ? processTablePaymentWebhookService : new ProcessTablePaymentWebhookService(provider));
    await processor.executeValidated({
      eventId: `reconcile:${provider.code}:${providerPayment.externalId}:${providerPayment.status}`,
      externalId: providerPayment.externalId,
      status: providerPayment.status,
      amountCents: providerPayment.amountCents,
      occurredAt,
    });

    const reconciled = await tablePaymentRepository.findOwnedByPublicId(
      input.publicId,
      input.restaurantId,
      input.tableSessionId,
      input.participantId,
    );
    if (!reconciled) {
      throw new TablePaymentError(
        'Pagamento não encontrado nesta participação.',
        404,
        'TABLE_PAYMENT_NOT_FOUND',
      );
    }

    return { payment: serializeTablePaymentIntent(reconciled, input.sessionPublicId) };
  }
}

export default new ReconcileTablePaymentService();
