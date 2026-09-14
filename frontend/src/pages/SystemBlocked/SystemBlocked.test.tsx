import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SystemBlockedPage from './SystemBlocked';
import { clearSystemBlockState, setSystemBlockState } from '../../Services/systemBlock';
const state = vi.hoisted(() => ({ role: 'ADMIN' }));
vi.mock('../../contexts/authContext', () => ({ useAuth: () => ({ user: { role: state.role } }) }));
vi.mock('../admin/restricted/BillingRestrictedAdmin', () => ({
  default: () => <div>Financeiro privado</div>,
}));
vi.mock('../SystemMaintenance/SystemMaintenance', () => ({
  default: ({ audience }: { audience: string }) => <div>Pausa {audience}</div>,
}));
const render = () =>
  renderToStaticMarkup(
    <MemoryRouter>
      <SystemBlockedPage />
    </MemoryRouter>,
  );
describe('rota legada de bloqueio', () => {
  beforeEach(() => {
    clearSystemBlockState();
    setSystemBlockState({ reason: 'BILLING' });
    state.role = 'ADMIN';
  });
  it('encaminha somente ADMIN com cobrança para a recuperação financeira', () => {
    expect(render()).toContain('Financeiro privado');
    state.role = 'CLIENTE';
    expect(render()).toContain('Pausa customer');
    state.role = 'GARCOM';
    expect(render()).toContain('Pausa staff');
  });
  it('preserva bloqueio manual sem oferecer pagamento', () => {
    setSystemBlockState({ reason: 'MANUAL' });
    expect(render()).toContain('Pausa admin');
    expect(render()).not.toContain('Financeiro privado');
  });
  it('não exibe cobrança para SUPER_ADMIN ou uma conta sem bloqueio', () => {
    state.role = 'SUPER_ADMIN';
    expect(render()).not.toContain('Financeiro privado');
    state.role = 'ADMIN';
    clearSystemBlockState();
    expect(render()).not.toContain('Financeiro privado');
  });
});
