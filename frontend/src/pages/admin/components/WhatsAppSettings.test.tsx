import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { adminMockSettings } from '../data';
import { WhatsAppSettings } from './WhatsAppSettings';

describe('WhatsAppSettings', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem(
      'user',
      JSON.stringify({ restaurantId: 42, restaurantCategory: 'PIZZARIA' }),
    );
  });

  it('organiza somente o conteúdo do WhatsApp em três passos e prévia didática', () => {
    const markup = renderToStaticMarkup(
      <WhatsAppSettings
        settings={{
          ...adminMockSettings,
          restaurantName: 'North Pizza',
          whatsapp: '+55 (11) 99999-0000',
          whatsappDisplayName: 'North Pizza',
          whatsappDefaultMessage: 'Olá! Bem-vindo à North Pizza.',
          whatsappEnabled: true,
          receiveStatusNotifications: true,
        }}
        update={() => undefined}
      />,
    );

    expect(markup).toContain('Configurar WhatsApp');
    expect(markup).toContain('Foto e nome do perfil');
    expect(markup).toContain('Seu número do WhatsApp');
    expect(markup).toContain('Mensagens automáticas');
    expect(markup).toContain('Exemplo de mensagens');
    expect(markup).toContain('/orders/107/tracking');
    expect(markup).toContain('Pedido confirmado / em preparo');
    expect(markup).toContain('Saiu para entrega');
    expect(markup).toContain('Confirmar entrega');
    expect(markup.match(/role="switch"/g)).toHaveLength(2);
    expect(markup).not.toContain('EM PREPARAÇÃO');
  });

  it('usa a logo monocromática da categoria quando não existe foto personalizada', () => {
    const markup = renderToStaticMarkup(
      <WhatsAppSettings
        settings={{ ...adminMockSettings, restaurantName: 'North Pizza' }}
        update={() => undefined}
      />,
    );

    expect(markup).toContain('data:image/svg+xml');
    expect(decodeURIComponent(markup)).toContain('stroke="#111111"');
    expect(markup).toContain('Por padrão usamos a logo preto e branco da categoria, sem fundo.');
  });

  it('mantém a ativação de status bloqueada enquanto o canal estiver desligado', () => {
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
  });

  it('valida o número comercial quando o canal estiver ativo', () => {
    const markup = renderToStaticMarkup(
      <WhatsAppSettings
        settings={{ ...adminMockSettings, whatsappEnabled: true, whatsapp: '123' }}
        update={() => undefined}
      />,
    );

    expect(markup).toContain('Use DDI, DDD e número, com 10 a 13 dígitos.');
    expect(markup).toContain('aria-invalid="true"');
  });

  it('encaminha alterações persistidas de canal, número e mensagens para o estado do admin', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const update = vi.fn();

    act(() => {
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
      );
    });

    const statusSwitch = container.querySelector('[name="receiveStatusNotifications"]') as HTMLInputElement;
    act(() => statusSwitch.click());
    expect(update).toHaveBeenCalledWith('receiveStatusNotifications', true);

    act(() => root.unmount());
  });
});
