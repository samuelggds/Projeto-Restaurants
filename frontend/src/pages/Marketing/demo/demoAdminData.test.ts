import { describe, expect, it } from 'vitest';
import { createDemoAdminData, discardDemoCredentials } from './demoAdminData';
import { validateBrandSettings } from '../../admin/domain/brandSettingsValidation';

describe('configuração inicial do administrador demonstrativo', () => {
  it('pode ser salva com a mesma validação do restaurante real e mídias locais', () => {
    const { settings, products } = createDemoAdminData();
    expect(validateBrandSettings(settings)).toEqual({});
    for (const source of [
      settings.coverImageUrl!,
      ...settings.promotionalBanners.map((banner) => banner.image),
      ...products.map((product) => product.image),
    ]) {
      expect(new URL(source).origin).toBe(location.origin);
    }
  });
  it('descarta credenciais digitadas no formulário demonstrativo antes de persistir', () => {
    const result = discardDemoCredentials({
      ...createDemoAdminData().settings,
      stripeSecretKey: 'valor-exemplo',
      mercadoPagoAccessToken: 'valor-exemplo',
      pagbankToken: 'valor-exemplo',
    });
    expect(result.stripeSecretKey).toBe('');
    expect(result.mercadoPagoAccessToken).toBe('');
    expect(result.pagbankToken).toBe('');
    expect(result.restaurantName).toBe('GastroNexa Burger');
  });
});
