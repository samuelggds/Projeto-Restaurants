import { describe, expect, it } from 'vitest';
import { createDeliveryAddress, formatCep, validateDeliveryAddress, validateDeliveryAddressLocationForCheckout } from './deliveryAddress';

describe('deliveryAddress', () => {
  it('formata e limita o CEP a oito dígitos', () => {
    expect(formatCep('60336232')).toBe('60336-232');
    expect(formatCep('60.336-23299')).toBe('60336-232');
  });

  it('cria um endereço vazio sem usuário', () => {
    expect(createDeliveryAddress(null)).toEqual({
      address: '',
      number: '',
      district: '',
      city: '',
      state: '',
      zipCode: '',
      complement: '',
    });
  });

  it('normaliza os dados existentes do cliente', () => {
    expect(createDeliveryAddress({ address: 'Rua A', zipCode: '60336232' })).toMatchObject({
      address: 'Rua A',
      zipCode: '60336-232',
    });
  });

  it('valida todos os campos obrigatórios e limites', () => {
    expect(validateDeliveryAddress(createDeliveryAddress(null))).toMatchObject({
      zipCode: expect.any(String),
      address: expect.any(String),
      number: expect.any(String),
      district: expect.any(String),
      city: expect.any(String),
      state: expect.any(String),
    });
    expect(
      validateDeliveryAddress({
        address: 'Rua A',
        number: '123A',
        district: 'Centro',
        city: 'Fortaleza',
        state: 'CE',
        zipCode: '60336-232',
        complement: '',
      }),
    ).toEqual({});
  });
});


describe('validateDeliveryAddressLocationForCheckout', () => {
  const address = {
    address: 'Rua das Flores',
    number: '123',
    district: 'Centro',
    city: 'Fortaleza',
    state: 'ce',
    zipCode: '60000-000',
    complement: '',
  };

  it('valida a localização no tenant atual antes de liberar o pagamento', async () => {
    const calls: unknown[] = [];
    const result = await validateDeliveryAddressLocationForCheckout({
      restaurantId: 77,
      address,
      resolveLocation: async (payload) => {
        calls.push(payload);
        return { latitude: -3.7319, longitude: -38.5267 };
      },
    });

    expect(result).toEqual({ ok: true, verified: true });
    expect(calls).toEqual([
      expect.objectContaining({
        restaurantId: 77,
        type: 'DELIVERY',
        address: 'Rua das Flores',
        number: '123',
        state: 'CE',
      }),
    ]);
  });

  it('mostra mensagem amigável quando a validação está indisponível', async () => {
    const result = await validateDeliveryAddressLocationForCheckout({
      restaurantId: 77,
      address,
      resolveLocation: async () => {
        throw {
          response: {
            data: {
              code: 'ADDRESS_VALIDATION_UNAVAILABLE',
              error: 'detalhe interno que não deve aparecer',
            },
          },
        };
      },
    });

    expect(result).toEqual({
      ok: true,
      verified: false,
      title: 'Endereço não confirmado no mapa',
      message:
        'O serviço de localização está indisponível agora. Confira o endereço antes de continuar.',
    });
    expect(JSON.stringify(result)).not.toContain('detalhe interno');
  });

  it('diferencia endereço não localizado sem expor resposta interna', async () => {
    const result = await validateDeliveryAddressLocationForCheckout({
      restaurantId: 77,
      address,
      resolveLocation: async () => {
        throw {
          response: {
            data: {
              code: 'ADDRESS_NOT_GEOCODED',
              error: 'provider=secret-provider',
            },
          },
        };
      },
    });

    expect(result).toEqual({
      ok: true,
      verified: false,
      title: 'Endereço não confirmado no mapa',
      message:
        'Não conseguimos confirmar este endereço no mapa. Confira rua, número, bairro, cidade e estado antes de continuar.',
    });
    expect(JSON.stringify(result)).not.toContain('secret-provider');
  });

  it('não consulta localização sem restaurante identificado', async () => {
    let calls = 0;
    const result = await validateDeliveryAddressLocationForCheckout({
      restaurantId: null,
      address,
      resolveLocation: async () => {
        calls += 1;
        return { latitude: -3.7, longitude: -38.5 };
      },
    });

    expect(result.ok).toBe(false);
    expect(calls).toBe(0);
  });
});
