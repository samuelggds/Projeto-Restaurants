import { renderToStaticMarkup } from 'react-dom/server';
import { ServerStyleSheet } from 'styled-components';
import { describe, expect, it, vi } from 'vitest';
import { HomeFeedback } from './HomeFeedback';

describe('HomeFeedback', () => {
  it('apresenta avisos acima do checkout com severidade e fechamento acessível', () => {
    const sheet = new ServerStyleSheet();
    const markup = renderToStaticMarkup(
      sheet.collectStyles(
        <HomeFeedback
          notifications={[
            {
              id: 1,
              type: 'success',
              title: 'Endereço selecionado',
              msg: 'Usaremos este endereço na sacola.',
              visible: true,
            },
            {
              id: 2,
              type: 'error',
              title: 'Pagamento não concluído',
              visible: true,
            },
          ]}
          onDismissNotification={vi.fn()}
        />,
      ),
    );
    const styles = sheet.getStyleTags();
    sheet.seal();

    expect(markup).toContain('Avisos recentes');
    expect(markup).toContain('Tudo certo');
    expect(markup).toContain('Não foi possível concluir');
    expect(markup).toContain('role="status"');
    expect(markup).toContain('role="alert"');
    expect(markup.match(/aria-label="Fechar notificação"/g)).toHaveLength(2);
    expect(styles).toContain('z-index:1400');
    expect(markup).not.toContain('>✓<');
  });
});
