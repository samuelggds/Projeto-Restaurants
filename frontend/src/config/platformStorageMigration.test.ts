import { beforeEach, describe, expect, it } from 'vitest';
import { migratePlatformStorage, normalizePlatformName } from './platformStorageMigration';
import { getBrandIdentity } from './brandIdentity';
import { applyRestaurantBrowserBranding } from './browserBranding';

describe('identidade GastroNexa e preferências existentes', () => {
  beforeEach(() => localStorage.clear());
  it('migra preferências sem substituir as já gravadas na nova versão', () => {
    localStorage.setItem('@PecaJaFood:cardPaymentWallet', 'saved-card-references');
    localStorage.setItem('pecajaf:remembered-account:v2:admin:north-pizza', 'owner@example.test');
    localStorage.setItem('@PecaJaFood:floatingActionsPosition', 'old-position');
    localStorage.setItem('@GastroNexa:floatingActionsPosition', 'current-position');
    migratePlatformStorage(localStorage);
    migratePlatformStorage(localStorage);
    expect(localStorage.getItem('@GastroNexa:cardPaymentWallet')).toBe('saved-card-references');
    expect(localStorage.getItem('gastronexa:remembered-account:v2:admin:north-pizza')).toBe(
      'owner@example.test',
    );
    expect(localStorage.getItem('@GastroNexa:floatingActionsPosition')).toBe('current-position');
    expect(localStorage.getItem('@PecaJaFood:cardPaymentWallet')).toBeNull();
  });
  it('usa GastroNexa por padrão e mantém o restaurante personalizado', () => {
    expect(getBrandIdentity()).toEqual({ name: 'GastroNexa', logoUrl: '/gastronexa-logo.png' });
    localStorage.setItem(
      '@GastroNexa:brandIdentity',
      JSON.stringify({ name: 'North Pizza', logoUrl: '/north.png' }),
    );
    expect(getBrandIdentity()).toEqual({ name: 'North Pizza', logoUrl: '/north.png' });
    expect(normalizePlatformName('Peça Já Food')).toBe('GastroNexa');
    localStorage.setItem(
      '@GastroNexa:brandIdentity',
      JSON.stringify({ name: 'Peça Já Food', logoUrl: '/previous-logo.png' }),
    );
    expect(getBrandIdentity()).toEqual({ name: 'GastroNexa', logoUrl: '/gastronexa-logo.png' });
    applyRestaurantBrowserBranding(document, '', 'RESTAURANTE');
    expect(document.title).toBe('GastroNexa');
    expect(document.querySelector('link[rel="icon"]')?.getAttribute('href')).toBe(
      '/gastronexa-logo.png',
    );
  });
});
