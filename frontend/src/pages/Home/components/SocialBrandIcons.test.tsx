import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FacebookIcon, InstagramIcon, TikTokIcon, WhatsAppIcon } from './SocialBrandIcons';

describe('SocialBrandIcons', () => {
  it('renderiza os ícones sociais oficiais, incluindo TikTok, sem conteúdo acessível duplicado', () => {
    const markup = renderToStaticMarkup(
      <div>
        <WhatsAppIcon size={20} />
        <InstagramIcon size={20} />
        <FacebookIcon size={20} />
        <TikTokIcon size={20} />
      </div>,
    );

    expect((markup.match(/<svg/g) || []).length).toBe(4);
    expect((markup.match(/aria-hidden="true"/g) || []).length).toBe(4);
    expect(markup).toContain('width="20"');
    expect(markup).toContain('M14.4 2h3.05');
  });
});
