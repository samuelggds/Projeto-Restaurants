import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GoogleBrandIcon } from './GoogleBrandIcon';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe('GoogleBrandIcon', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('usa a marca multicolorida oficial do Google', async () => {
    await act(async () => {
      root.render(<GoogleBrandIcon />);
    });

    const svg = container.querySelector('[data-testid="google-brand-icon"]');
    expect(svg).not.toBeNull();
    expect(
      Array.from(svg!.querySelectorAll('path')).map((path) => path.getAttribute('fill')),
    ).toEqual(['#4285F4', '#34A853', '#FBBC05', '#EA4335']);
  });
});
