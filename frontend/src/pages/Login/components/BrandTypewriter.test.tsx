import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BrandTypewriter } from './BrandTypewriter';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe('brand typewriter', () => {
  let host: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
    }));
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
  });
  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
  const letters = (selector: string) =>
    [...host.querySelectorAll(`${selector} tspan`)].map((letter) => letter.getAttribute('opacity'));

  it('writes Gastro forwards and Nexa backwards without leaving hidden letters', () => {
    act(() =>
      root.render(
        <svg>
          <text id="gastro">
            <BrandTypewriter text="Gastro" start={0.45} interval={0.12} animate />
          </text>
          <text id="nexa">
            <BrandTypewriter text="Nexa" start={0.45} interval={0.12} reverse animate />
          </text>
          <text id="tagline">
            <BrandTypewriter
              text="Tecnologia para Restaurantes"
              start={1.15}
              interval={0.045}
              animate
            />
          </text>
          <text id="motto">
            <BrandTypewriter text="TECNOLOGIA QUE MOVE SABORES" start={1.4} animate />
          </text>
        </svg>,
      ),
    );
    act(() => vi.advanceTimersByTime(650));
    expect(letters('#gastro')).toEqual(['1', '1', '0', '0', '0', '0']);
    expect(letters('#nexa')).toEqual(['0', '0', '1', '1']);
    act(() => vi.advanceTimersByTime(4000));
    expect(
      [...host.querySelectorAll('tspan')].every((letter) => letter.getAttribute('opacity') === '1'),
    ).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    act(() => vi.advanceTimersByTime(20000));
    expect(letters('#gastro')).toEqual(Array(6).fill('1'));
  });

  it('shows complete text immediately when the intro has already played', () => {
    act(() =>
      root.render(
        <svg>
          <text id="gastro">
            <BrandTypewriter text="Gastro" animate={false} />
          </text>
        </svg>,
      ),
    );
    expect(letters('#gastro')).toEqual(Array(6).fill('1'));
    expect(vi.getTimerCount()).toBe(0);
  });

  it('shows complete text for reduced motion', () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener() {},
      removeEventListener() {},
    }));
    act(() =>
      root.render(
        <svg>
          <text id="gastro">
            <BrandTypewriter text="Gastro" animate />
          </text>
        </svg>,
      ),
    );
    expect(letters('#gastro')).toEqual(Array(6).fill('1'));
  });

  it('keeps the access usable when media queries are unavailable', () => {
    vi.stubGlobal('matchMedia', undefined);
    act(() =>
      root.render(
        <svg>
          <text id="gastro">
            <BrandTypewriter text="Gastro" animate />
          </text>
        </svg>,
      ),
    );
    expect(letters('#gastro')).toEqual(Array(6).fill('1'));
    expect(vi.getTimerCount()).toBe(0);
  });
});
