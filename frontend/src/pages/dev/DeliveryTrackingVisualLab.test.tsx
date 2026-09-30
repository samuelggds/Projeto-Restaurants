import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DeliveryTrackingVisualLab from './DeliveryTrackingVisualLab';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe('DeliveryTrackingVisualLab', () => {
  let container: HTMLDivElement;
  let root: Root | undefined;
  let now: number;
  let nextFrameId: number;
  let reducedMotion: boolean;
  let frames: Map<number, FrameRequestCallback>;

  beforeEach(() => {
    now = 1_000;
    nextFrameId = 0;
    reducedMotion = false;
    frames = new Map();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      const id = ++nextFrameId;
      frames.set(id, callback);
      return id;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
      frames.delete(id);
    });
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation(() => ({ matches: reducedMotion })),
    );
  });

  afterEach(() => {
    if (root) act(() => root?.unmount());
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  function render() {
    act(() => root?.render(<DeliveryTrackingVisualLab />));
  }

  function loadImage(testId: string) {
    const image = container.querySelector('img[data-testid="' + testId + '"]');
    expect(image, 'imagem ' + testId + ' disponível para carregar').not.toBeNull();
    act(() => image?.dispatchEvent(new Event('load')));
  }

  function loadImages() {
    loadImage('visual-map-image');
    loadImage('visual-courier-sheet');
  }

  function advanceTo(timestamp: number) {
    now = timestamp;
    const currentFrames = [...frames.values()];
    frames.clear();
    act(() => currentFrames.forEach((callback) => callback(now)));
  }

  function progress() {
    return Number(
      container
        .querySelector('[data-testid="visual-fictitious-map"]')
        ?.getAttribute('data-courier-progress'),
    );
  }

  function clickButton(label: string) {
    const button = Array.from(container.querySelectorAll('button')).find(
      (candidate) =>
        candidate.getAttribute('aria-label') === label || candidate.textContent === label,
    );
    expect(button, 'botão ' + label + ' disponível').toBeDefined();
    expect(button?.disabled).toBe(false);
    act(() => button?.click());
  }

  it('renderiza o mapa local, a rota e o motoqueiro sem interface de compra', () => {
    render();

    const lab = container.querySelector('[data-testid="delivery-tracking-visual-lab"]');
    expect(lab?.getAttribute('data-map-source')).toBe('fictitious-google-screenshot');
    expect(lab?.getAttribute('data-animation-duration-ms')).toBe('60000');
    expect(container.querySelector('[data-testid="visual-google-map-screenshot"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="visual-route-line"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="visual-courier-marker"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="visual-courier-sprite"]')).not.toBeNull();
    expect(container.textContent).toContain('Acompanhar pedido');
    expect(container.textContent).toContain('Eduardo Silva');
    expect(container.textContent).toContain('(00) 00000-0000');
    expect(container.textContent).not.toContain('Olá, Entrar');
    expect(container.textContent).not.toContain('Meu Carrinho');
  });

  it('conta os sessenta segundos apenas depois que mapa e motoqueiro carregam', () => {
    render();
    expect(frames.size).toBe(0);
    loadImage('visual-map-image');
    advanceTo(61_000);
    expect(progress()).toBe(0);
    expect(frames.size).toBe(0);

    loadImage('visual-courier-sheet');
    expect(frames.size).toBe(1);
    advanceTo(91_000);
    expect(progress()).toBe(0.5);
    expect(container.textContent).not.toContain('Chegou ao endereço');
    advanceTo(121_000);
    expect(progress()).toBe(1);
    expect(container.textContent).toContain('Chegou ao endereço');
  });

  it('anima até o destino aos 60 segundos e permite reiniciar a rota', () => {
    render();
    loadImages();
    const marker = container.querySelector('[data-testid="visual-courier-marker"]');
    const initialStyle = marker?.getAttribute('style');
    advanceTo(31_000);
    expect(progress()).toBe(0.5);
    expect(marker?.getAttribute('style')).not.toBe(initialStyle);
    expect(container.textContent).not.toContain('Chegou ao endereço');
    advanceTo(60_000);
    expect(progress()).toBeLessThan(1);
    advanceTo(61_000);
    expect(progress()).toBe(1);
    expect(container.textContent).toContain('Chegou ao endereço');
    expect(frames.size).toBe(0);

    clickButton('Reiniciar rota');
    expect(progress()).toBe(0);
    expect(marker?.getAttribute('style')).toBe(initialStyle);
    expect(container.textContent).not.toContain('Chegou ao endereço');
    expect(frames.size).toBe(1);
    advanceTo(91_000);
    expect(progress()).toBe(0.5);
  });

  it('pausa sem consumir o tempo restante e continua do mesmo ponto', () => {
    render();
    loadImages();
    advanceTo(31_000);
    clickButton('Pausar simulação');
    expect(frames.size).toBe(0);
    advanceTo(81_000);
    expect(progress()).toBe(0.5);

    clickButton('Continuar simulação');
    advanceTo(96_000);
    expect(progress()).toBe(0.75);
    advanceTo(111_000);
    expect(progress()).toBe(1);
    expect(container.textContent).toContain('Chegou ao endereço');
  });

  it('respeita movimento reduzido e permite iniciar a simulação manualmente', () => {
    reducedMotion = true;
    render();
    loadImages();
    advanceTo(61_000);
    expect(progress()).toBe(0);
    expect(frames.size).toBe(0);

    clickButton('Iniciar simulação');
    advanceTo(91_000);
    expect(progress()).toBe(0.5);
    advanceTo(121_000);
    expect(progress()).toBe(1);
  });

  it('cancela a animação ao sair da tela', () => {
    render();
    loadImages();
    expect(frames.size).toBe(1);
    act(() => root?.unmount());
    root = undefined;
    expect(frames.size).toBe(0);
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });
});
