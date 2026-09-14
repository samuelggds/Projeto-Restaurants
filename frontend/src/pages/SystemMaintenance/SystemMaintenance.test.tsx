import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { setPlatformMaintenanceState } from '../../Services/platformMaintenance';
import SystemMaintenancePage from './SystemMaintenance';

describe('tela de manutenção', () => {
  beforeEach(() => localStorage.clear());

  it('mantém a manutenção global genérica e o acesso técnico, sem prometer um prazo', () => {
    setPlatformMaintenanceState({ message: 'Atualização programada dos pagamentos.' });
    const markup = renderToStaticMarkup(<SystemMaintenancePage mode="platform" />);

    expect(markup).toContain('Sistema em manutenção');
    expect(markup).toContain('Disponibilidade da plataforma');
    expect(markup).toContain('Tentar novamente');
    expect(markup).toContain('href="/super_admin/login"');
    expect(markup).not.toContain('Atualização programada dos pagamentos');
    expect(markup).not.toContain('instantes');
    expect(markup).not.toContain('Retorno automático');
    expect(markup).not.toContain('role="progressbar"');
  });

  it('orienta o cliente sobre pedidos existentes sem revelar o motivo interno do bloqueio', () => {
    const markup = renderToStaticMarkup(
      <SystemMaintenancePage mode="tenant" audience="customer" message="Mensalidade em atraso." />,
    );

    expect(markup).toContain('Uma pausa no acesso ao restaurante.');
    expect(markup).toContain('Temporariamente indisponível');
    expect(markup).toContain('Já fez um pedido?');
    expect(markup).toContain('entre em contato diretamente com o restaurante');
    expect(markup).not.toMatch(/inadimpl|mensalidade|pagamento|atraso/i);
    expect(markup).not.toContain('Acesso técnico');
  });

  it('orienta a equipe a falar com o responsável, sem expor informações financeiras', () => {
    const markup = renderToStaticMarkup(
      <SystemMaintenancePage
        mode="tenant"
        audience="staff"
        message="Bloqueado por inadimplência"
      />,
    );

    expect(markup).toContain('O painel está indisponível no momento.');
    expect(markup).toContain('Fale com o responsável pelo restaurante');
    expect(markup).not.toContain('Já fez um pedido?');
    expect(markup).not.toMatch(/inadimpl|mensalidade|pagamento|atraso/i);
    expect(markup).not.toContain('Acesso técnico');
  });

  it('usa a marca vetorial e mantém uma única área principal com título', () => {
    const markup = renderToStaticMarkup(<SystemMaintenancePage mode="tenant" audience="admin" />);
    const document = new DOMParser().parseFromString(markup, 'text/html');

    expect(document.querySelectorAll('main')).toHaveLength(1);
    expect(document.querySelectorAll('h1')).toHaveLength(1);
    expect(document.querySelector('svg path')?.getAttribute('d')).toBeTruthy();
    expect(document.querySelector('img, image, [role="progressbar"]')).toBeNull();
    expect(document.querySelector('button')?.getAttribute('type')).toBe('button');
    expect(markup).toContain('A página será atualizada para verificar o acesso.');
    expect(markup).not.toContain('Acesso técnico');
  });
});
