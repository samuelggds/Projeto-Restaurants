import { describe, expect, it } from 'vitest';
import { createPersistentImageDataUrl, isPersistentImageSource } from './persistentImage';

describe('persistent image validation', () => {
  it('reconhece apenas fontes persistíveis suportadas', () => {
    expect(isPersistentImageSource('https://cdn.example.com/logo.webp')).toBe(true);
    expect(isPersistentImageSource('data:image/png;base64,iVBORw0KGgo=')).toBe(true);
    expect(isPersistentImageSource('blob:http://localhost/logo')).toBe(false);
  });

  it('rejeita formato não suportado antes de ler o arquivo', async () => {
    const file = new File(['gif'], 'logo.gif', { type: 'image/gif' });
    await expect(createPersistentImageDataUrl(file)).rejects.toThrow(/JPG, PNG ou WebP/);
  });

  it('rejeita arquivo maior que 5 MB antes do processamento', async () => {
    const file = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'capa.png', {
      type: 'image/png',
    });
    await expect(createPersistentImageDataUrl(file)).rejects.toThrow(/no máximo 5 MB/);
  });
});
