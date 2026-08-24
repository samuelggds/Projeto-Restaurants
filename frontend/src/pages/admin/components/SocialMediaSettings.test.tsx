import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { adminMockSettings } from '../data';
import { SocialMediaSettings } from './SocialMediaSettings';

describe('SocialMediaSettings', () => {
  it('renderiza Instagram, Facebook, TikTok e YouTube a partir do estado', () => {
    const settings = {
      ...adminMockSettings,
      instagram: '@restaurante',
      facebook: 'https://facebook.com/restaurante',
      tiktok: '@restaurantevideos',
      youtube: 'https://youtube.com/@restaurante',
    };
    const markup = renderToStaticMarkup(
      <SocialMediaSettings settings={settings} update={() => undefined} />,
    );

    expect(markup).toContain('name="instagram"');
    expect(markup).toContain('value="@restaurante"');
    expect(markup).toContain('name="facebook"');
    expect(markup).toContain('value="https://facebook.com/restaurante"');
    expect(markup).toContain('name="tiktok"');
    expect(markup).toContain('value="@restaurantevideos"');
    expect(markup).toContain('name="youtube"');
    expect(markup).toContain('value="https://youtube.com/@restaurante"');
    expect(markup.match(/data-connected="true"/g)).toHaveLength(4);
    expect(markup).toContain('href="https://instagram.com/restaurante"');
    expect(markup).toContain('href="https://tiktok.com/@restaurantevideos"');
  });

  it('apresenta erro local e não cria link para perfil inválido', () => {
    const markup = renderToStaticMarkup(
      <SocialMediaSettings
        settings={{ ...adminMockSettings, instagram: 'perfil com espaços' }}
        update={() => undefined}
      />,
    );

    expect(markup).toContain('Remova os espaços do endereço ou nome de usuário.');
    expect(markup).toContain('aria-invalid="true"');
    expect(markup).toContain('Instagram não conectado');
  });

  it('deixa perfis vazios opcionais e sem links externos', () => {
    const markup = renderToStaticMarkup(
      <SocialMediaSettings settings={adminMockSettings} update={() => undefined} />,
    );

    expect(markup).not.toContain('aria-invalid="true"');
    expect(markup.match(/data-connected="false"/g)).toHaveLength(4);
  });
});
