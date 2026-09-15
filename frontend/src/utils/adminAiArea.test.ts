import { afterEach, describe, expect, it } from 'vitest';
import { inferAdminAiArea } from './adminAiArea';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('inferAdminAiArea', () => {
  it('identifica a área operacional ativa', () => {
    document.body.innerHTML = `
      <div data-admin-root>
        <nav aria-label="Navegação principal do painel">
          <button>Visão geral</button>
          <button aria-current="page">Cardápio</button>
        </nav>
      </div>
    `;

    expect(inferAdminAiArea()).toBe('catalog');
  });

  it('identifica a seção ativa de configurações sem aceitar contexto externo', () => {
    document.body.innerHTML = `
      <div data-admin-root>
        <nav aria-label="Navegação principal do painel">
          <button class="active" aria-current="page">Configurações</button>
        </nav>
        <aside>
          <button>Dados do negócio</button>
          <button class="active">Horários</button>
        </aside>
      </div>
    `;

    expect(inferAdminAiArea()).toBe('settings:hours');
  });

  it('não inventa área quando não está dentro do painel ADMIN', () => {
    document.body.innerHTML = '<main>Loja pública</main>';
    expect(inferAdminAiArea()).toBeNull();
  });
});
