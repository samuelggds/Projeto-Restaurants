import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { adminMockSettings } from '../data';
import { WhatsAppSettings } from './WhatsAppSettings';

describe('WhatsAppSettings', () => {
  it('organiza o canal em etapas e expõe somente as automações realmente disponíveis', () => {
    const settings = {
      ...adminMockSettings,
      whatsapp: '+55 (11) 99999-0000',
      whatsappDisplayName: 'Atendimento da Casa',
      whatsappDefaultMessage: 'Olá, preciso de ajuda!',
      whatsappEnabled: true,
      receiveOrdersOnWhatsapp: true,
      receiveStatusNotifications: false,
    };
    const markup = renderToStaticMarkup(
      <WhatsAppSettings settings={settings} update={() => undefined} />,
    );

    expect(markup).toContain('value="+55 (11) 99999-0000"');
    expect(markup).toContain('value="Atendimento da Casa"');
    expect(markup).toContain('Olá, preciso de ajuda!');
    expect(markup.match(/role="switch"/g)).toHaveLength(2);
    expect(markup).toContain('Canal pronto e visível na Home');
    expect(markup).toContain('1 · Ativação do canal');
    expect(markup).toContain('Identificação e número');
    expect(markup).toContain('Mensagem inicial e prévia');
    expect(markup).toContain('Notificações e automações');
    expect(markup).not.toContain('name="receiveOrdersOnWhatsapp"');
    expect(markup).toContain('EM PREPARAÇÃO');
    expect(markup).toContain('Integração ainda não disponível');
    expect(markup).toContain(
      'href="https://wa.me/5511999990000?text=Ol%C3%A1%2C%20preciso%20de%20ajuda!"',
    );
  });

  it('mantém a prévia desabilitada e explica um número inválido', () => {
    const markup = renderToStaticMarkup(
      <WhatsAppSettings
        settings={{
          ...adminMockSettings,
          whatsapp: '123',
          whatsappEnabled: true,
        }}
        update={() => undefined}
      />,
    );

    expect(markup).toContain('Use DDI, DDD e número, com 10 a 13 dígitos.');
    expect(markup).toContain('aria-invalid="true"');
    expect(markup).toContain('aria-disabled="true"');
    expect(markup).not.toContain('href="https://wa.me/');
  });

  it('exige o número somente quando o contato público está ativado', () => {
    const disabledMarkup = renderToStaticMarkup(
      <WhatsAppSettings
        settings={{ ...adminMockSettings, whatsapp: '' }}
        update={() => undefined}
      />,
    );
    const enabledMarkup = renderToStaticMarkup(
      <WhatsAppSettings
        settings={{ ...adminMockSettings, whatsapp: '', whatsappEnabled: true }}
        update={() => undefined}
      />,
    );

    expect(disabledMarkup).not.toContain('Informe o número que será exibido aos clientes.');
    expect(enabledMarkup).toContain('Informe o número que será exibido aos clientes.');
  });

  it('pausa o controle de notificações enquanto o canal principal estiver desativado', () => {
    const markup = renderToStaticMarkup(
      <WhatsAppSettings
        settings={{
          ...adminMockSettings,
          whatsappEnabled: false,
          receiveStatusNotifications: true,
        }}
        update={() => undefined}
      />,
    );

    const statusSwitch = markup.match(/<input[^>]*name="receiveStatusNotifications"[^>]*>/)?.[0];
    expect(statusSwitch).toContain('disabled=""');
    expect(markup).toContain('Ative o canal acima para liberar os envios.');
    expect(markup).toContain('Canal pausado e oculto na Home');
  });

  it('encaminha a ativação das notificações funcionais para o estado persistido', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const update = vi.fn();

    act(() =>
      root.render(
        <WhatsAppSettings
          settings={{
            ...adminMockSettings,
            whatsapp: '5511999990000',
            whatsappEnabled: true,
            receiveStatusNotifications: false,
          }}
          update={update}
        />,
      ),
    );

    const statusSwitch = container.querySelector(
      '[name="receiveStatusNotifications"]',
    ) as HTMLInputElement;
    expect(statusSwitch.disabled).toBe(false);

    act(() => statusSwitch.click());
    expect(update).toHaveBeenCalledWith('receiveStatusNotifications', true);

    act(() => root.unmount());
  });
});
