import type { ProfileData } from './types';

const pizza =
  'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=500&q=88';
const burger =
  'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=88';

export const profileMockData: ProfileData = {
  brand: {
    name: 'Sabor & Casa',
    monogram: 'S&C',
    address: 'Rua das Flores, 123',
    primaryColor: '#d64d08',
  },
  user: {
    firstName: 'Ana',
    fullName: 'Ana Silva',
    email: 'ana@email.com',
    avatarUrl:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=85',
    mainAddress: 'Rua das Flores, 123',
    paymentLastDigits: '4821',
    favoriteCount: 8,
  },
  activeOrder: {
    id: '#SC-2048',
    status: 'onTheWay',
    estimatedArrival: '20:35',
    summary: 'Pizza Margherita',
    image: pizza,
    total: 54.9,
  },
  recentOrders: [
    {
      id: '#SC-2046',
      summary: 'Pizza Margherita + 2 itens',
      date: '12/05/2026',
      total: 69.9,
      image: pizza,
      status: 'delivered',
    },
    {
      id: '#SC-2039',
      summary: 'Burger da Casa + 1 item',
      date: '08/05/2026',
      total: 54.9,
      image: burger,
      status: 'delivered',
    },
  ],
  favorites: [
    {
      id: '1',
      name: 'Pizza Margherita',
      description: 'Muçarela de búfala, tomate e manjericão.',
      price: 54.9,
      image: pizza,
      rating: 4.8,
    },
    {
      id: '2',
      name: 'Burger da Casa',
      description: 'Blend Angus, cheddar, bacon e molho especial.',
      price: 42.9,
      image: burger,
      rating: 4.7,
    },
  ],
  addresses: [
    {
      id: '1',
      label: 'Casa',
      address: 'Rua das Flores, 123',
      complement: 'Apartamento 402',
      isDefault: true,
    },
    {
      id: '2',
      label: 'Trabalho',
      address: 'Av. Central, 850',
      complement: 'Sala 12',
      isDefault: false,
    },
  ],
};
