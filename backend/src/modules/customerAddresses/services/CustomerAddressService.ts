import type { CustomerAddressInput } from '../domain/CustomerAddress.js';
import customerAddressRepository, {
  type CustomerAddressRepositoryPort,
} from '../repositories/CustomerAddressRepository.js';

export class CustomerAddressService {
  constructor(private readonly repository: CustomerAddressRepositoryPort = customerAddressRepository) {}

  list(userId: number) {
    return this.repository.listByUser(userId);
  }

  create(userId: number, input: CustomerAddressInput) {
    return this.repository.transaction(async (unit) => {
      const makeDefault = input.isDefault || (await unit.countByUser(userId)) === 0;
      if (makeDefault) await unit.clearDefaults(userId);
      return unit.create(userId, {
        label: input.label,
        address: input.address,
        number: input.number,
        district: input.district,
        city: input.city,
        state: input.state,
        zipCode: input.zipCode,
        complement: input.complement || null,
        isDefault: makeDefault,
      });
    });
  }

  setDefault(userId: number, addressId: number) {
    return this.repository.transaction(async (unit) => {
      if (!(await unit.findOwned(userId, addressId))) return null;
      await unit.clearDefaults(userId);
      // Ownership is enforced again on the update, preventing cross-user writes.
      return unit.setDefault(userId, addressId);
    });
  }
}

export default new CustomerAddressService();
