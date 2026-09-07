import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ThemeProvider } from 'styled-components';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ResendCodeButton } from './ResendCodeButton';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const theme = {
  surface: '#ffffff',
  border: '#dedee5',
  primaryReadable: '#5b3fc4',
};

describe('ResendCodeButton: contorno retangular', () => {
  let container: HTMLDivElement;
  let root: Root;
  const onClick = vi.fn();

  function render(milliseconds: number, isLoading = false) {
    act(() => {
      root.render(
        <ThemeProvider theme={theme}>
          <ResendCodeButton
            remainingMilliseconds={milliseconds}
            deadline={30_000}
            isLoading={isLoading}
            onClick={onClick}
          />
        </ThemeProvider>,
      );
    });
  }

  function button() {
    return container.querySelector('button') as HTMLButtonElement;
  }

  function outline() {
    return container.querySelector('[data-testid="resend-progress-outline"]') as SVGRectElement;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('usa um retangulo arredondado completo e nao um circulo em 30s', () => {
    render(30_000);
    expect(outline().getAttribute('rx')).toBe('9');
    expect(outline().getAttribute('pathLength')).toBe('100');
    expect(outline().style.strokeDashoffset).toBe('0');
    expect(container.querySelector('circle')).toBeNull();
    expect(button().textContent).toBe('Reenviar em 30s');
    expect(button().disabled).toBe(true);
  });

  it('esvazia metade do contorno em 15s e acompanha fracoes de segundo', () => {
    render(15_000);
    expect(outline().style.strokeDashoffset).toBe('50');
    expect(button().textContent).toBe('Reenviar em 15s');
    render(14_750);
    expect(Number(outline().style.strokeDashoffset)).toBeCloseTo(50.833333, 4);
  });

  it('mantem o reenvio bloqueado no ultimo milissegundo', () => {
    render(1);
    expect(button().disabled).toBe(true);
    expect(button().textContent).toBe('Reenviar em 1s');
    act(() => button().click());
    expect(onClick).not.toHaveBeenCalled();
  });

  it('remove o contorno animado e libera o clique ao terminar', () => {
    render(0);
    expect(outline()).toBeNull();
    expect(button().textContent).toBe('Reenviar código');
    expect(button().disabled).toBe(false);
    act(() => button().click());
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('nao libera uma requisicao que ainda esta em andamento', () => {
    render(0, true);
    expect(button().disabled).toBe(true);
    expect(button().getAttribute('aria-busy')).toBe('true');
    expect(button().textContent).toBe('Enviando...');
  });

  it('oferece rotulo acessivel sem anunciar cada segundo na regiao live', () => {
    render(30_000);
    const status = container.querySelector('[role="status"]');
    const waitingMessage = status?.textContent;
    expect(button().getAttribute('aria-label')).toBe('Reenviar código em 30 segundos');
    render(15_000);
    expect(status?.textContent).toBe(waitingMessage);
    render(0);
    expect(status?.textContent).toContain('disponível');
  });

  it('limita progresso invalido e recomeca cheio para o proximo envio', () => {
    render(-10);
    expect(button().disabled).toBe(false);
    render(50_000);
    expect(button().textContent).toBe('Reenviar em 30s');
    expect(outline().style.strokeDashoffset).toBe('0');
    render(Number.NaN);
    expect(button().disabled).toBe(true);
  });
});
