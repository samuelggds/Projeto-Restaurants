import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearLegacyRememberedAccountEmail,
  clearRememberedAccountEmail,
  getRememberedAccountStorageKey,
  readRememberedAccountEmail,
  writeRememberedAccountEmail,
} from './rememberedAccount';

describe('rememberedAccount', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('isola o e-mail por restaurante e portal de acesso', () => {
    const customerNorth = { portal: 'CUSTOMER', restaurantSlug: 'north-pizza' };
    const customerSouth = { portal: 'CUSTOMER', restaurantSlug: 'south-pizza' };
    const staffNorth = { portal: 'STAFF', restaurantSlug: 'north-pizza' };

    writeRememberedAccountEmail(customerNorth, 'cliente@north.com');
    writeRememberedAccountEmail(customerSouth, 'cliente@south.com');
    writeRememberedAccountEmail(staffNorth, 'funcionario@north.com');

    expect(readRememberedAccountEmail(customerNorth)).toBe('cliente@north.com');
    expect(readRememberedAccountEmail(customerSouth)).toBe('cliente@south.com');
    expect(readRememberedAccountEmail(staffNorth)).toBe('funcionario@north.com');
  });

  it('persiste somente o e-mail e nunca cria campos de senha ou token', () => {
    const scope = { portal: 'ADMIN', restaurantSlug: 'north-pizza' };
    writeRememberedAccountEmail(scope, 'ADMIN@EXAMPLE.COM');

    expect(window.localStorage.getItem(getRememberedAccountStorageKey(scope))).toBe(
      'admin@example.com',
    );
    expect(Object.keys(window.localStorage).some((key) => /password|senha|token/iu.test(key))).toBe(
      false,
    );
  });

  it('remove o e-mail do escopo sem afetar outro restaurante', () => {
    const north = { portal: 'CUSTOMER', restaurantSlug: 'north-pizza' };
    const south = { portal: 'CUSTOMER', restaurantSlug: 'south-pizza' };
    writeRememberedAccountEmail(north, 'north@example.com');
    writeRememberedAccountEmail(south, 'south@example.com');

    clearRememberedAccountEmail(north);

    expect(readRememberedAccountEmail(north)).toBe('');
    expect(readRememberedAccountEmail(south)).toBe('south@example.com');
  });

  it('remove a chave legada global para evitar vazamento entre usuários', () => {
    window.localStorage.setItem('rememberedEmail', 'legado@example.com');

    clearLegacyRememberedAccountEmail();

    expect(window.localStorage.getItem('rememberedEmail')).toBeNull();
  });
});
