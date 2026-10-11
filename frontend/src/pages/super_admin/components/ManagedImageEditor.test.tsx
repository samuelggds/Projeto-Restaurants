import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ enhance: vi.fn(), optimize: vi.fn(), upload: vi.fn() }));
vi.mock('../../../Services/managedImageEnhancementService', () => ({ enhanceManagedRestaurantImage: mocks.enhance }));
vi.mock('../../../utils/persistentImage', () => ({ optimizePersistentImageDataUrl: mocks.optimize, createPersistentImageDataUrl: mocks.upload }));
import { ManagedImageEditor } from './ManagedImageEditor';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const original = 'data:image/png;base64,b3JpZ2luYWw=';
const improved = 'data:image/png;base64,aW1wcm92ZWQ=';

describe('ManagedImageEditor', () => {
  let container: HTMLDivElement;
  let root: Root;
  let onChange: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    vi.resetAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    onChange = vi.fn();
    mocks.enhance.mockResolvedValue(improved);
    mocks.optimize.mockResolvedValue(improved);
  });
  afterEach(() => { act(() => root.unmount()); container.remove(); });
  const render = async (value = original, restaurantId = 12) => {
    await act(async () => root.render(<ManagedImageEditor restaurantId={restaurantId} purpose="PRODUCT" label="Produto" value={value} onChange={onChange} />));
  };
  function button(text: string) {
    const result = Array.from(container.querySelectorAll('button')).find((item) => item.textContent === text);
    if (!result) throw new Error(`Button missing: ${text}`);
    return result;
  }

  it('previews the result without changing the original and applies only on approval', async () => {
    await render();
    expect(container.textContent).toContain('Não desconta créditos de IA do restaurante');
    await act(async () => button('Melhorar com IA').click());
    expect(onChange).not.toHaveBeenCalled();
    expect(container.querySelectorAll('img').length).toBe(2);
    expect(mocks.enhance).toHaveBeenCalledWith(expect.objectContaining({ restaurantId: 12, purpose: 'PRODUCT', imageDataUrl: original }));
    await act(async () => button('Usar imagem melhorada').click());
    expect(onChange).toHaveBeenCalledExactlyOnceWith(improved);
    expect(container.textContent).toContain('Salve para publicar');
  });

  it('keeps the original when the operator rejects the preview', async () => {
    await render();
    await act(async () => button('Melhorar com IA').click());
    await act(async () => button('Manter original').click());
    expect(onChange).not.toHaveBeenCalled();
    expect(container.querySelectorAll('img').length).toBe(1);
  });

  it('preserves the original on failure and does not retry automatically', async () => {
    mocks.enhance.mockRejectedValue(new Error('Falha controlada'));
    await render();
    await act(async () => button('Melhorar com IA').click());
    expect(onChange).not.toHaveBeenCalled();
    expect(mocks.enhance).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Falha controlada');
    expect(container.querySelector('img')?.getAttribute('src')).toBe(original);
  });

  it('blocks enhancement without local image bytes', async () => {
    await render('');
    expect(button('Melhorar com IA').disabled).toBe(true);
    await render('https://example.test/pizza.png');
    expect(button('Melhorar com IA').disabled).toBe(true);
    expect(mocks.enhance).not.toHaveBeenCalled();
  });

  it('blocks duplicate clicks and discards a late response after tenant change', async () => {
    let resolve!: (value: string) => void;
    mocks.enhance.mockReturnValue(new Promise<string>((done) => { resolve = done; }));
    await render();
    const enhanceButton = button('Melhorar com IA');
    await act(async () => { enhanceButton.click(); enhanceButton.click(); });
    expect(mocks.enhance).toHaveBeenCalledTimes(1);
    await render(original, 99);
    await act(async () => resolve(improved));
    expect(onChange).not.toHaveBeenCalled();
    expect(container.querySelectorAll('img').length).toBe(1);
  });
});
