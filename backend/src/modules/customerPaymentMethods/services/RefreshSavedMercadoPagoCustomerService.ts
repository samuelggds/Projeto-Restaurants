import { normalizeMercadoPagoPaymentMethodId } from '../domain/cardBrand.js';

type ProviderRecord = Record<string, unknown>;

type Input = {
  accessToken: string;
  customerId: string;
  cardId: string;
  expectedBrand: string;
  expectedLast4: string;
  // Identity is the payer identity stored with this saved card. Contact/address
  // context may come from the current order and is only used when the remote identity matches.
  verifiedPayer?: {
    name: string;
    email: string;
    cpf: string | null;
    phone?: string | null;
    address?: {
      zipCode?: string | null;
      streetName?: string | null;
      streetNumber?: string | null;
    } | null;
  } | null;
};

export class SavedMercadoPagoCustomerRefreshError extends Error {
  constructor(
    public readonly code: string,
    public readonly httpStatus = 502,
  ) {
    super(
      'Não foi possível atualizar os dados do cartão salvo. Tente novamente em alguns minutos.',
    );
    this.name = 'SavedMercadoPagoCustomerRefreshError';
  }
}

function record(value: unknown): ProviderRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as ProviderRecord)
    : {};
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function sameName(first: string, second: string) {
  const normalize = (name: string) =>
    name.normalize('NFD').replace(/\p{M}/gu, '').replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');
  return normalize(first) === normalize(second);
}

/** Complete only a customer owned by the verified account, using its current profile. */
function customerUpdate(customer: ProviderRecord, payer: Input['verifiedPayer']) {
  if (!payer || text(customer.email).toLowerCase() !== text(payer.email).toLowerCase()) return {};
  const payerName = text(payer.name);
  const customerName = [text(customer.first_name), text(customer.last_name)]
    .filter(Boolean)
    .join(' ');
  const update: ProviderRecord = {};

  const identification = record(customer.identification);
  const rawNumber = text(payer.cpf);
  const number = rawNumber.replace(/[.\-/\s]/g, '');
  const type = number.length === 14 ? 'CNPJ' : 'CPF';
  const validDocument =
    (type === 'CPF' && /^\d{11}$/.test(number)) || (type === 'CNPJ' && /^\d{14}$/.test(number));
  const compatibleType =
    !text(identification.type) || text(identification.type).toUpperCase() === type;
  const sameIdentity = payerName && (!customerName || sameName(customerName, payerName));
  const existingNumber = text(identification.number);
  const compatibleDocument =
    !existingNumber ||
    (validDocument && compatibleType && existingNumber.replace(/[.\-/\s]/g, '') === number);

  if (!customerName && payerName && compatibleDocument) update.first_name = payerName;

  // Preserve conflicting legacy identity instead of silently changing its owner.
  if (!existingNumber && compatibleType && validDocument && sameIdentity) {
    update.identification = { type, number };
  }

  if (sameIdentity) {
    const currentPhone = record(customer.phone);
    const rawPhone = text(payer.phone).replace(/\D/g, '');
    const nationalPhone =
      rawPhone.startsWith('55') && rawPhone.length >= 12 ? rawPhone.slice(2) : rawPhone;
    if (
      !text(currentPhone.area_code) &&
      !text(currentPhone.number) &&
      /^[1-9]\d{9,10}$/u.test(nationalPhone)
    ) {
      update.phone = {
        area_code: nationalPhone.slice(0, 2),
        number: nationalPhone.slice(2),
      };
    }

    const currentAddress = record(customer.address);
    const payerAddress = payer.address || {};
    const zipCode = text(payerAddress.zipCode).replace(/\D/g, '').slice(0, 8);
    const streetName = text(payerAddress.streetName).slice(0, 255);
    const streetNumber = text(payerAddress.streetNumber).slice(0, 32);
    const address: ProviderRecord = {};

    if (!text(currentAddress.zip_code) && zipCode.length === 8) address.zip_code = zipCode;
    if (!text(currentAddress.street_name) && streetName) address.street_name = streetName;
    if (!text(currentAddress.street_number) && streetNumber) address.street_number = streetNumber;

    if (Object.keys(address).length) {
      update.address = {
        ...(text(currentAddress.zip_code) ? { zip_code: text(currentAddress.zip_code) } : {}),
        ...(text(currentAddress.street_name)
          ? { street_name: text(currentAddress.street_name) }
          : {}),
        ...(text(currentAddress.street_number)
          ? { street_number: text(currentAddress.street_number) }
          : {}),
        ...address,
      };
    }
  }
  return update;
}

/** Called only after resolving an active saved method by userId + restaurantId. */
export async function refreshSavedMercadoPagoCustomer(input: Input) {
  if (!input.customerId || !input.cardId || !/^\d{4}$/.test(input.expectedLast4)) {
    throw new SavedMercadoPagoCustomerRefreshError('saved_card_reference_invalid', 422);
  }
  const customerPath = `https://api.mercadopago.com/v1/customers/${encodeURIComponent(input.customerId)}`;
  // One bounded budget for the entire preflight, separate from the charge timeout.
  const signal = AbortSignal.timeout(5_000);
  async function request(url: string, update?: ProviderRecord) {
    try {
      const response = await fetch(url, {
        method: update ? 'PUT' : 'GET',
        redirect: 'error',
        signal,
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
          Accept: 'application/json',
          ...(update ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(update ? { body: JSON.stringify(update) } : {}),
      });
      if (!response.ok) {
        throw new SavedMercadoPagoCustomerRefreshError(
          'saved_card_refresh_failed',
          response.status,
        );
      }
      return record(await response.json());
    } catch (error) {
      if (error instanceof SavedMercadoPagoCustomerRefreshError) throw error;
      // Provider bodies, URLs, documents and credentials never reach logs/client errors.
      throw new SavedMercadoPagoCustomerRefreshError('saved_card_refresh_unavailable');
    }
  }

  const [customer, card] = await Promise.all([
    request(customerPath),
    request(`${customerPath}/cards/${encodeURIComponent(input.cardId)}`),
  ]);
  const remoteBrand = normalizeMercadoPagoPaymentMethodId(record(card.payment_method).id);
  if (
    String(customer.id || '') !== input.customerId ||
    String(card.id || '') !== input.cardId ||
    String(card.customer_id || '') !== input.customerId ||
    text(card.last_four_digits) !== input.expectedLast4 ||
    remoteBrand !== normalizeMercadoPagoPaymentMethodId(input.expectedBrand)
  ) {
    throw new SavedMercadoPagoCustomerRefreshError('saved_card_reference_mismatch', 422);
  }

  const customerEmail = text(customer.email).toLowerCase();
  if (!input.verifiedPayer) {
    return {
      outcome: 'skipped_unverified_identity' as const,
      updatedFields: [],
      customerEmail,
    };
  }
  if (customerEmail !== text(input.verifiedPayer.email).toLowerCase()) {
    throw new SavedMercadoPagoCustomerRefreshError('saved_card_email_mismatch', 409);
  }
  const update = customerUpdate(customer, input.verifiedPayer);
  if (!Object.keys(update).length) {
    return { outcome: 'unchanged' as const, updatedFields: [], customerEmail };
  }
  const updated = await request(customerPath, update);
  if (String(updated.id || '') !== input.customerId) {
    throw new SavedMercadoPagoCustomerRefreshError('saved_card_refresh_invalid_response');
  }
  return {
    outcome: 'updated' as const,
    updatedFields: Object.keys(update),
    customerEmail: text(updated.email).toLowerCase() || customerEmail,
  };
}
