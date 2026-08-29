import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { setPlatformMaintenanceState } from '../../Services/platformMaintenance';
import SystemMaintenancePage from './SystemMaintenance';

describe('tela de manutenção', () => {
  beforeEach(() => localStorage.clear());

  it('mostra somente um aviso genérico e mantém o acesso técnico discreto', () => {
    setPlatformMaintenanceState({ message: 'Atualização programada dos pagamentos.' });
    const markup = renderToStaticMarkup(<SystemMaintenancePage mode="platform" />);

    expect(markup).toContain('Sistema em manutenção');
    expect(markup).toContain('Tente novamente em alguns instantes');
    expect(markup).toContain('Tentar novamente');
    expect(markup).not.toContain('Atualização programada dos pagamentos');
    expect(markup).not.toContain('Equipe técnica');
    expect(markup).not.toContain('Seus dados continuam protegidos');
    expect(markup).toContain('href="/super_admin/login"');
  });

  it('não revela inadimplência para clientes e funcionários', () => {
    const markup = renderToStaticMarkup(
      <SystemMaintenancePage mode="tenant" message="Restaurante temporariamente indisponível." />,
    );
    expect(markup).toContain('Sistema em manutenção');
    expect(markup).not.toContain('inadimpl');
    expect(markup).not.toContain('Restaurante temporariamente indisponível');
    expect(markup).not.toContain('Acesso técnico');
  });
});
