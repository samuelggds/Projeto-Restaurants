import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { setPlatformMaintenanceState } from '../../Services/platformMaintenance';
import SystemMaintenancePage from './SystemMaintenance';

describe('tela de manutenção', () => {
  beforeEach(() => localStorage.clear());

  it('explica a manutenção global e mantém o acesso técnico discreto', () => {
    setPlatformMaintenanceState({ message: 'Atualização programada dos pagamentos.' });
    const markup = renderToStaticMarkup(<SystemMaintenancePage mode="platform" />);

    expect(markup).toContain('Estamos preparando uma experiência ainda melhor');
    expect(markup).toContain('Atualização programada dos pagamentos');
    expect(markup).toContain('Seus dados continuam protegidos');
    expect(markup).toContain('href="/super_admin/login"');
  });

  it('não revela inadimplência para clientes e funcionários', () => {
    const markup = renderToStaticMarkup(
      <SystemMaintenancePage mode="tenant" message="Restaurante temporariamente indisponível." />,
    );
    expect(markup).toContain('Este restaurante estará de volta em breve');
    expect(markup).not.toContain('inadimpl');
    expect(markup).not.toContain('Acesso técnico');
  });
});
