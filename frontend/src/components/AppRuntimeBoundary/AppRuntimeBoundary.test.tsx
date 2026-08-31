import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AppRuntimeBoundary from './AppRuntimeBoundary';

function BrokenView(): never {
  throw new Error('Falha comum de renderização');
}

describe('AppRuntimeBoundary', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('substitui uma árvore quebrada por uma recuperação visível', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <AppRuntimeBoundary>
          <BrokenView />
        </AppRuntimeBoundary>,
      );
    });

    expect(container.textContent).toContain('Não foi possível carregar a página');
    expect(container.textContent).toContain('Recarregar página');
    expect(consoleError).toHaveBeenCalled();

    await act(async () => root.unmount());
  });
});
