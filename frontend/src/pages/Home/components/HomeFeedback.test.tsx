import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { HomeFeedback } from './HomeFeedback';

describe('HomeFeedback', () => {
  it('apresenta avisos com severidade, ícone e fechamento acessível', () => {
    const markup = renderToStaticMarkup(
      <HomeFeedback
        showLoginNudge={false}
        notifications={[
          {
            id: 1,
            type: 'success',
            title: 'Endereço selecionado',
            msg: 'Usaremos este endereço na sacola.',
            visible: true,
            action: 'open-cart',
          },
          {
            id: 2,
            type: 'error',
            title: 'Pagamento não concluído',
            visible: true,
          },
        ]}
        onLogin={vi.fn()}
        onDismissNudge={vi.fn()}
        onDismissNotification={vi.fn()}
      />,
    );

    expect(markup).toContain('Avisos recentes');
    expect(markup).toContain('Tudo certo');
    expect(markup).toContain('Não foi possível concluir');
    expect(markup).toContain('role="status"');
    expect(markup).toContain('role="alert"');
    expect(markup).toContain('Ver sacola');
    expect(markup.match(/aria-label="Fechar notificação"/g)).toHaveLength(2);
    expect(markup).not.toContain('>✓<');
  });
});
