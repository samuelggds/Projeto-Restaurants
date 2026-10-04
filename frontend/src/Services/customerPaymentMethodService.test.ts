import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './api';
import customerPaymentMethodService, {
  getPaymentMethodErrorMessage,
  selectSavedPaymentMethod,
  type CustomerPaymentMethod,
} from './customerPaymentMethodService';

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const cards: CustomerPaymentMethod[] = [
  {
    publicId: 'first',
    provider: 'MERCADO_PAGO',
    brand: 'visa',
    last4: '1111',
    expMonth: 1,
    expYear: 2030,
    isDefault: false,
  },
  {
    publicId: 'default',
    provider: 'MERCADO_PAGO',
    brand: 'mastercard',
    last4: '2222',
    expMonth: 2,
    expYear: 2031,
    isDefault: true,
  },
];

describe('selectSavedPaymentMethod', () => {
  it('uses the card explicitly selected by the customer', () =>
    expect(selectSavedPaymentMethod(cards, 'first')?.publicId).toBe('first'));
  it('falls back to the default card', () =>
    expect(selectSavedPaymentMethod(cards, 'missing')?.publicId).toBe('default'));
  it('returns null when no card is available', () =>
    expect(selectSavedPaymentMethod([], null)).toBeNull());
});

describe('getPaymentMethodErrorMessage', () => {
  it('prioritizes the useful message returned by the backend', () => {
    expect(
      getPaymentMethodErrorMessage(
        { response: { data: { error: 'Confira os dados do cartão.' } } },
        'Falha',
      ),
    ).toBe('Confira os dados do cartão.');
  });

  it('does not expose the generic Axios status message to the customer', () => {
    expect(
      getPaymentMethodErrorMessage(
        new Error('Request failed with status code 400'),
        'Pagamento indisponível.',
      ),
    ).toBe('Pagamento indisponível.');
  });

  it('hides internal provider configuration details from the customer', () => {
    expect(
      getPaymentMethodErrorMessage(
        {
          response: {
            data: { error: 'O Mercado Pago ainda não foi configurado para este restaurante.' },
          },
        },
        'Cadastro de cartões indisponível no momento.',
      ),
    ).toBe('Cadastro de cartões indisponível no momento.');
  });

  it('hides restaurant configuration details from employee and customer flows', () => {
    expect(
      getPaymentMethodErrorMessage(
        {
          response: {
            data: {
              error: 'As configurações do restaurante ainda não habilitaram o gateway do Mercado Pago.',
            },
          },
        },
        'Cadastro de cartões indisponível no momento.',
      ),
    ).toBe('Cadastro de cartões indisponível no momento.');
  });
});


describe('customerPaymentMethodService integration contract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('persiste o contrato HTTP completo de listar, configurar, criar, definir padrão e remover', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({
        data: {
          paymentMethods: cards.map((card, index) => ({
            ...card,
            createdAt: `2026-09-${15 + index}T12:00:00.000Z`,
          })),
        },
      })
      .mockResolvedValueOnce({ data: { provider: 'MERCADO_PAGO', publicKey: 'TEST-public-key' } });
    vi.mocked(api.post).mockResolvedValue({
      data: { paymentMethod: { ...cards[0], publicId: 'created' } },
    });
    vi.mocked(api.put).mockResolvedValue({
      data: { paymentMethod: { ...cards[1], isDefault: true } },
    });
    vi.mocked(api.delete).mockResolvedValue({ status: 204 });

    const listed = await customerPaymentMethodService.list(9);
    expect(listed).toHaveLength(cards.length);
    expect(listed[0]).toMatchObject(cards[0]);
    expect(listed[0].createdAt).toBe('2026-09-15T12:00:00.000Z'); // preserva createdAt do backend
    await expect(customerPaymentMethodService.getConfig(9)).resolves.toMatchObject({
      provider: 'MERCADO_PAGO',
      publicKey: 'TEST-public-key',
    });

    const payload = {
      restaurantId: 9,
      cardToken: 'tok_test_123456',
      holderName: 'CLIENTE TESTE',
      payerEmail: 'comprador@example.com',
      holderTaxId: '12345678901',
      brand: 'mastercard',
      last4: '4444',
      expMonth: 12,
      expYear: 2030,
    };
    await customerPaymentMethodService.create(payload);
    await customerPaymentMethodService.makeDefault('default', 9);
    await customerPaymentMethodService.remove('first', 9);

    expect(api.get).toHaveBeenNthCalledWith(1, '/customer-payment-methods', {
      params: { restaurantId: 9 },
    });
    expect(api.get).toHaveBeenNthCalledWith(2, '/settings/public/9/card-payment-config');
    expect(api.post).toHaveBeenCalledWith('/customer-payment-methods', payload);
    expect(api.put).toHaveBeenCalledWith(
      '/customer-payment-methods/default/default',
      undefined,
      { params: { restaurantId: 9 } },
    );
    expect(api.delete).toHaveBeenCalledWith('/customer-payment-methods/first', {
      params: { restaurantId: 9 },
    });
  });
});


describe('seleção de cartão salvo para uso', () => {
  it('seleciona o cartão escolhido pelo cliente antes do cartão principal', () => {
    const selected = selectSavedPaymentMethod(cards, 'first');
    expect(selected?.publicId).toBe('first');
  });

  it('cai no cartão principal quando nenhum cartão específico foi escolhido', () => {
    const selected = selectSavedPaymentMethod(cards, null);
    expect(selected?.publicId).toBe('default');
    expect(selected?.isDefault).toBe(true);
  });

  it('usa o primeiro cartão como último fallback quando não há principal', () => {
    const noDefault = cards.map((card) => ({ ...card, isDefault: false }));
    const selected = selectSavedPaymentMethod(noDefault, null);
    expect(selected?.publicId).toBe(noDefault[0].publicId);
  });
});
