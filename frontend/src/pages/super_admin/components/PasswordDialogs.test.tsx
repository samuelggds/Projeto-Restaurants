import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { RestaurantTenant, SuperAdminActions } from '../types';
import { CreateAdministratorDialog } from './ActionDialogs';
import { CreateRestaurantDialog } from './CreateRestaurantDialog';

const restaurant: RestaurantTenant = {
  id: 1,
  name: 'Restaurante teste',
  slug: 'restaurante-teste',
  email: 'contato@restaurante.test',
  phone: null,
  active: true,
  accessBlockReason: 'NONE',
  status: 'ACTIVE',
  createdAt: '2026-08-28T00:00:00.000Z',
  lastAccessAt: null,
  nextBillingAt: null,
  monthlyFee: 0,
  monthlyOrderRevenue: 0,
  primaryAdmin: null,
  subscription: null,
};

const actions: SuperAdminActions = {
  refresh: vi.fn(async () => undefined),
  updateSettings: vi.fn(async () => undefined),
  updatePlan: vi.fn(async () => undefined),
  updateRestaurantAccess: vi.fn(async () => undefined),
  updateSubscription: vi.fn(async () => undefined),
  createAdministrator: vi.fn(async () => undefined),
  updateAdministratorAccess: vi.fn(async () => undefined),
  getSupportMessages: vi.fn(async () => []),
  sendSupportMessage: vi.fn(async () => undefined),
};

function expectInitialPrivilegedPasswordState(markup: string, requirementsId: string) {
  expect(markup.match(/minLength="8"/g)).toHaveLength(2);
  expect(markup.match(/maxLength="128"/g)).toHaveLength(2);
  expect(markup.match(new RegExp(`aria-describedby="${requirementsId}"`, 'g'))).toHaveLength(2);
  expect(markup).not.toContain('aria-label="Requisitos da senha"');
  expect(markup).not.toContain('A senha temporária precisa ter:');
}

describe('senhas temporárias do SUPER_ADMIN', () => {
  it('mantém a política privilegiada no cadastro de restaurante', () => {
    const markup = renderToStaticMarkup(
      <CreateRestaurantDialog plans={[]} onClose={vi.fn()} onCreated={vi.fn()} />,
    );

    expectInitialPrivilegedPasswordState(markup, 'restaurant-admin-password-requirements');
    expect(markup).toMatch(/<button[^>]*class="submit"[^>]*disabled=""/);
  });

  it('mantém a política privilegiada no cadastro de administrador', () => {
    const markup = renderToStaticMarkup(
      <CreateAdministratorDialog
        restaurants={[restaurant]}
        actions={actions}
        onClose={vi.fn()}
        notify={vi.fn()}
      />,
    );

    expectInitialPrivilegedPasswordState(markup, 'administrator-password-requirements');
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>Criar administrador<\/button>/);
  });
});
