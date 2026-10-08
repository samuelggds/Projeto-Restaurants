import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './api';
import productsService from './productsService';
import { clearAuthSession, persistAuthSession } from '../modules/auth/session/authSession';

vi.mock('./api', () => ({ default: { get: vi.fn() } }));

describe('productsService restaurant context', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    clearAuthSession();
    vi.mocked(api.get).mockResolvedValue({ data: [] });
  });

  it('prioriza o restaurante autenticado sobre menu e mesa anteriores', async () => {
    persistAuthSession({ id: 7, role: 'ADMIN', restaurantId: 11 }, 'memory-token');
    localStorage.setItem('menuRestaurantId', '22');
    localStorage.setItem('tableSession', JSON.stringify({ restaurantId: 33 }));
    localStorage.setItem('user', JSON.stringify({ restaurantId: 44 }));

    await productsService.listProducts();

    expect(api.get).toHaveBeenCalledWith('/products', { params: { restaurantId: 11 } });
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('preserva o restaurante autenticado mesmo com mesa antiga corrompida', async () => {
    persistAuthSession({ id: 7, restaurant: { id: 11 } }, 'memory-token');
    localStorage.setItem('tableSession', '{invalid');

    await productsService.listProducts();

    expect(api.get).toHaveBeenCalledWith('/products', { params: { restaurantId: 11 } });
  });

  it('respeita o contexto explícito do cardápio público', async () => {
    persistAuthSession({ id: 7, restaurantId: 11 }, 'memory-token');

    await productsService.listProducts(22);

    expect(api.get).toHaveBeenCalledWith('/products', { params: { restaurantId: 22 } });
  });

  it('mantém o menu selecionado para visitantes sem sessão', async () => {
    localStorage.setItem('menuRestaurantId', '22');

    await productsService.listProducts();

    expect(api.get).toHaveBeenCalledWith('/products', { params: { restaurantId: 22 } });
  });
});
