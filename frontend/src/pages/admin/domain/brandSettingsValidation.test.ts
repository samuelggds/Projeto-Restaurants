import { describe, expect, it } from 'vitest';
import { adminMockSettings } from '../data';
import { validateBrandSettings } from './brandSettingsValidation';

describe('brand settings validation', () => {
  it('aceita identidade e imagens persistíveis', () => {
    expect(
      validateBrandSettings({
        ...adminMockSettings,
        restaurantName: 'Restaurante do Bairro',
        primaryColor: '#c95d3d',
        description: 'Comida preparada todos os dias.',
        logoUrl: 'https://cdn.example.com/logo.webp',
        coverImageUrl: 'data:image/webp;base64,UklGRg==',
      }),
    ).toEqual({});
  });

  it('rejeita nome, cor, descrição e imagem temporária inválidos', () => {
    const errors = validateBrandSettings({
      ...adminMockSettings,
      restaurantName: 'A',
      primaryColor: 'vermelho',
      description: 'x'.repeat(501),
      logoUrl: 'blob:http://localhost/logo',
    });

    expect(errors).toMatchObject({
      restaurantName: expect.any(String),
      primaryColor: expect.any(String),
      description: expect.any(String),
      logoUrl: expect.any(String),
    });
  });
});
