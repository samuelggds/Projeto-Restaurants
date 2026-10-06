import { describe, expect, it } from 'vitest';
import { migratePlatformStorage } from './platformStorageMigration';

describe('legacy saved card storage', () => {
  it('remove referências locais de cartões salvos', () => {
    localStorage.setItem('@GastroNexa:cardPaymentWallet', 'legacy-card-wallet');
    localStorage.setItem('selectedCustomerPaymentMethodId:7', 'saved-card-public-id');

    migratePlatformStorage(localStorage);

    expect(localStorage.getItem('@GastroNexa:cardPaymentWallet')).toBeNull();
    expect(localStorage.getItem('selectedCustomerPaymentMethodId:7')).toBeNull();
  });
});
