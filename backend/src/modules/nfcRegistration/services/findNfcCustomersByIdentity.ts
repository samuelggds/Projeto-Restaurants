import { withTenantDbContext } from '../../../database/tenantDbContext.js';
import { decryptNfcPii, nfcCpfFingerprints } from '../security/nfcCustomerPii.js';
import { NfcRegistrationError } from '../domain/nfcRegistrationRules.js';
import { customerSelect, serializeNfcCustomer } from './nfcCustomerReadModel.js';

/** Tenant-scoped identity search: archived CPF returns state only, never PII. */
export async function findNfcCustomersByIdentity(restaurantId: number, query: string) {
  const digits = query.replace(/\D/g, '');
  if (digits.length !== 10 && digits.length !== 11) {
    throw new NfcRegistrationError(422, 'Informe CPF completo ou telefone com DDD.');
  }
  const result = await withTenantDbContext(restaurantId, async tx => {
    if (digits.length === 11) {
      const exactCpf = await tx.nfcCustomer.findFirst({
        where: { restaurantId, cpfFingerprint: { in: nfcCpfFingerprints(restaurantId, digits) } },
        select: { id: true, archivedAt: true },
      });
      if (exactCpf?.archivedAt) return { customers: [], archivedMatch: true };
      if (exactCpf) {
        const customer = await tx.nfcCustomer.findFirst({
          where: { restaurantId, id: exactCpf.id, archivedAt: null },
          select: customerSelect,
        });
        if (customer) return { customers: [customer], archivedMatch: false };
      }
    }
    // Bounded scan is limited to active customers belonging to the tenant.
    const maxCandidates = 1000;
    const candidates = await tx.nfcCustomer.findMany({
      where: { restaurantId, archivedAt: null }, select: customerSelect, take: maxCandidates + 1,
    });
    if (candidates.length > maxCandidates) {
      throw new NfcRegistrationError(409, 'Pesquisa por telefone indisponível para este volume de cadastros. Consulte pelo CPF.');
    }
    const customers = candidates.filter(customer => {
      const number = decryptNfcPii(restaurantId, customer.id, 'phone', customer.phoneEncrypted).replace(/\D/g, '');
      return number === digits || (number.length === digits.length + 2 && number.startsWith('55') && number.slice(2) === digits);
    }).slice(0, 10);
    return { customers, archivedMatch: false };
  });
  return {
    customers: result.customers.map(customer => serializeNfcCustomer(restaurantId, customer)),
    archivedMatch: result.archivedMatch,
  };
}
