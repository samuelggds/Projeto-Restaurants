import { describe, expect, it } from 'vitest';
import { buildOrderSummary, buildProfileData, mapOrderStatus } from './profileDataAdapter';

describe('profileDataAdapter', () => {
  it('traduz os status operacionais', () => {
    expect(mapOrderStatus('PREPARANDO')).toBe('preparing');
    expect(mapOrderStatus('SAIU_PARA_ENTREGA')).toBe('onTheWay');
    expect(mapOrderStatus('ENTREGUE')).toBe('delivered');
    expect(mapOrderStatus('CANCELADO')).toBe('cancelled');
  });
  it('resume pedidos com vários itens', () => {
    expect(buildOrderSummary({ items: [{ product: { name: 'Pizza' } }, { name: 'Suco' }] })).toBe(
      'Pizza + 1 item',
    );
  });
  it('preserva a foto real do produto no histórico', () => {
    const data = buildProfileData({
      user: { name: 'Samuel', email: 'cliente@demo.com' },
      settings: null,
      favorites: [],
      addresses: [],
      avatarUrl: '',
      orders: [
        {
          id: 48,
          status: 'ENTREGUE',
          items: [{ product: { name: 'Pizza', image: 'https://cdn.test/pizza.png' } }],
        },
      ],
    });
    expect(data.recentOrders[0]).toMatchObject({
      id: '#0048',
      image: 'https://cdn.test/pizza.png',
    });
  });

  it('mantém Pix pendente recuperável em Meus pedidos', () => {
    const data = buildProfileData({
      user: { name: 'Samuel', email: 'cliente@demo.com' },
      settings: null,
      favorites: [],
      addresses: [],
      avatarUrl: '',
      orders: [
        {
          id: 91,
          publicId: 'order-public-91',
          status: 'PENDENTE',
          type: 'DELIVERY',
          paymentMethod: 'PIX',
          paid: false,
          pixPaymentId: 'pix-provider-91',
          total: 49.9,
          items: [{ product: { name: 'Pizza' } }],
        },
      ],
    });

    expect(data.activeOrder).toMatchObject({
      id: '#0091',
      publicId: 'order-public-91',
      paymentPending: true,
      total: 49.9,
    });
  });

  it('mantém cartão pendente recuperável em Meus pedidos', () => {
    const data = buildProfileData({
      user: { name: 'Samuel', email: 'cliente@demo.com' },
      settings: null,
      favorites: [],
      addresses: [],
      avatarUrl: '',
      orders: [
        {
          id: 92,
          publicId: 'order-public-92',
          status: 'PENDENTE',
          type: 'DELIVERY',
          paymentMethod: 'CARTAO',
          paid: false,
          total: 79.9,
          items: [{ product: { name: 'Combo' } }],
        },
      ],
    });

    expect(data.activeOrder).toMatchObject({
      id: '#0092',
      publicId: 'order-public-92',
      paymentPending: true,
      total: 79.9,
    });
  });

  it('não inventa endereço do restaurante nem do cliente quando os dados estão ausentes', () => {
    const data = buildProfileData({
      user: { name: 'Samuel', email: 'cliente@demo.com' },
      settings: null,
      favorites: [],
      addresses: [],
      avatarUrl: '',
      orders: [],
    });

    expect(data.brand.address).toBe('');
    expect(data.user.mainAddress).toBe('Nenhum endereço cadastrado');
  });
});
