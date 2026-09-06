import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
}));

vi.mock('../../../Services/api', () => ({
  default: { post: mocks.post },
}));

import {
  exchangeAdminPortalKey,
  getAdminPortalGrant,
  verifyAdminPortalGrant,
} from './adminPortalSession';

describe('adminPortalSession', () => {
  beforeEach(() => {
    mocks.post.mockReset();
    window.sessionStorage.clear();
  });

  it('reutiliza a mesma troca quando StrictMode dispara o mesmo link duas vezes', async () => {
    let resolveRequest!: (value: { data: { grant: string } }) => void;
    mocks.post.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );

    const first = exchangeAdminPortalKey('north-pizza', 'a'.repeat(43));
    const second = exchangeAdminPortalKey('north-pizza', 'a'.repeat(43));

    expect(mocks.post).toHaveBeenCalledTimes(1);
    resolveRequest({ data: { grant: 'grant-seguro' } });

    await expect(first).resolves.toBe('grant-seguro');
    await expect(second).resolves.toBe('grant-seguro');
    expect(getAdminPortalGrant('north-pizza')).toBe('grant-seguro');
  });

  it('reutiliza a mesma verificação concorrente do grant', async () => {
    window.sessionStorage.setItem('gastronexa:admin-portal:north-pizza', 'grant-seguro');
    let resolveRequest!: (value: {
      data: { valid: boolean; restaurantId: number; slug: string };
    }) => void;
    mocks.post.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );

    const first = verifyAdminPortalGrant('north-pizza');
    const second = verifyAdminPortalGrant('north-pizza');

    expect(mocks.post).toHaveBeenCalledTimes(1);
    resolveRequest({ data: { valid: true, restaurantId: 7, slug: 'north-pizza' } });

    await expect(first).resolves.toEqual({ valid: true, restaurantId: 7, slug: 'north-pizza' });
    await expect(second).resolves.toEqual({ valid: true, restaurantId: 7, slug: 'north-pizza' });
  });
});
