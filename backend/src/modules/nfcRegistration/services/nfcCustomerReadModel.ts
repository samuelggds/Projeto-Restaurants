import { decryptNfcPii, maskNfcCpf, maskNfcPhone } from '../security/nfcCustomerPii.js';

/** Shared customer projection for NFC routes; PII is never sent unmasked. */
export const customerSelect = {
  id: true, restaurantId: true, nameEncrypted: true, cpfEncrypted: true,
  phoneEncrypted: true, createdAt: true,
  cards: {
    select: { id: true, displayCode: true, status: true, createdAt: true },
    orderBy: { createdAt: 'desc' as const },
  },
};

export function serializeNfcCustomer(
  restaurantId: number,
  customer: {
    id: string;
    nameEncrypted: string;
    cpfEncrypted: string;
    phoneEncrypted: string;
    createdAt: Date;
    cards: Array<{ id: string; displayCode: string; status: string; createdAt: Date }>;
  },
) {
  const cpf = decryptNfcPii(restaurantId, customer.id, 'cpf', customer.cpfEncrypted);
  const phone = decryptNfcPii(restaurantId, customer.id, 'phone', customer.phoneEncrypted);
  return {
    id: customer.id,
    name: decryptNfcPii(restaurantId, customer.id, 'name', customer.nameEncrypted),
    cpfMasked: maskNfcCpf(cpf), phoneMasked: maskNfcPhone(phone),
    createdAt: customer.createdAt, cards: customer.cards,
  };
}
