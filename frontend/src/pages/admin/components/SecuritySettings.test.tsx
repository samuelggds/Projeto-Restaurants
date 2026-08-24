import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { SecuritySettings } from './SecuritySettings';

describe('SecuritySettings', () => {
  it('explica as proteções reais sem exibir controles ou sessões fictícias', () => {
    const markup = renderToStaticMarkup(<SecuritySettings openEmployees={vi.fn()} />);

    expect(markup).toContain('Proteção do acesso administrativo');
    expect(markup).toContain('obrigatória para administradores');
    expect(markup).toContain('Gerenciar funcionários');
    expect(markup).not.toContain('type="checkbox"');
    expect(markup).not.toContain('Chrome no Windows');
    expect(markup).not.toContain('Encerrar outras sessões');
  });
});
