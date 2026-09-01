import fakePaymentProvider from '../providers/FakePaymentProvider.js';
import type { PaymentProvider } from '../providers/PaymentProvider.js';
import tablePaymentRepository from '../repositories/TablePaymentRepository.js';
import processTablePaymentWebhookService, {
  type ProcessTablePaymentWebhookService,
} from './ProcessTablePaymentWebhookService.js';
import { serializeTablePaymentIntent, TablePaymentError } from './tablePaymentSupport.js';

type ProviderReader = Pick<PaymentProvider, 'code' | 'getPayment'>;
type CanonicalProcessor = Pick<ProcessTablePaymentWebhookService, 'executeValidated'>;

export class ReconcileTablePaymentService {
  constructor(
    private readonly provider: ProviderReader = fakePaymentProvider,
    private readonly processor: CanonicalProcessor = processTablePaymentWebhookService,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(input: {
    publicId: string;
    tableSessionId: number;
    sessionPublicId: string;
    restaurantId: number;
    participantId: number;
  }) {
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
    if (intent.provider !== this.provider.code || !intent.providerExternalId) {
      throw new TablePaymentError(
        'Este pagamento não possui verificação online.',
        409,
        'TABLE_PAYMENT_NOT_RECONCILABLE',
      );
    }

    const providerPayment = await this.provider.getPayment(intent.providerExternalId);
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
    await this.processor.executeValidated({
      eventId: `reconcile:${this.provider.code}:${providerPayment.externalId}:${providerPayment.status}`,
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
