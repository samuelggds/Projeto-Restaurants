import { describe, expect, it } from 'vitest';
import {
  formatEstablishmentAddress,
  formatEstablishmentCep,
  validateEstablishmentAddress,
} from './establishmentAddress';
import { adminMockSettings } from '../data';

const settings = {
  ...adminMockSettings,
  businessZipCode: '60100-000',
  businessAddress: 'Rua das Flores',
  businessAddressNumber: '123',
  businessAddressDistrict: 'Centro',
  businessCity: 'Fortaleza',
  businessState: 'CE',
};
describe('establishmentAddress', () => {
  it('formata CEP e endereço público', () => {
    expect(formatEstablishmentCep('60100000')).toBe('60100-000');
    expect(formatEstablishmentAddress(settings)).toBe(
      'Rua das Flores, 123 • Centro • Fortaleza - CE',
    );
  });
  it('valida os campos obrigatórios', () => {
    expect(
      validateEstablishmentAddress({ ...settings, businessZipCode: '123', businessState: 'C' }),
    ).toMatchObject({ businessZipCode: expect.any(String), businessState: expect.any(String) });
  });
});
