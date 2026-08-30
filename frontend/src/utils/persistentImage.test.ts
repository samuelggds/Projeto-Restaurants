import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPersistentImageDataUrl, isPersistentImageSource } from './persistentImage';

describe('persistent image validation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

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

  it('compacta a imagem de forma assíncrona sem bloquear com toDataURL', async () => {
    class LoadedImage {
      naturalWidth = 640;
      naturalHeight = 360;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;

      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }

    vi.stubGlobal('Image', LoadedImage);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
      imageSmoothingEnabled: false,
      imageSmoothingQuality: 'low',
      filter: '',
    } as unknown as CanvasRenderingContext2D);
    const toDataUrl = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL');
    const toBlob = vi
      .spyOn(HTMLCanvasElement.prototype, 'toBlob')
      .mockImplementation((callback) => callback(new Blob(['webp'], { type: 'image/webp' })));

    const result = await createPersistentImageDataUrl(
      new File(['source'], 'produto.png', { type: 'image/png' }),
    );

    expect(result).toMatch(/^data:image\/webp;base64,/);
    expect(toBlob).toHaveBeenCalledOnce();
    expect(toDataUrl).not.toHaveBeenCalled();
  });
});
