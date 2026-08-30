import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { clampFloatingPosition, useDraggableFloatingActions } from './useDraggableFloatingActions';

function DraggableHarness({ onRender }: { onRender?: () => void } = {}) {
  onRender?.();
  const draggable = useDraggableFloatingActions();

  return createElement(
    'div',
    {
      ref: draggable.elementRef,
      onPointerDown: draggable.onPointerDown,
      onPointerMove: draggable.onPointerMove,
      onPointerUp: draggable.onPointerUp,
      onPointerCancel: draggable.onPointerCancel,
      onClickCapture: draggable.onClickCapture,
    },
    createElement('button', { type: 'button', 'data-floating-drag-handle': 'true' }, 'Minimizar'),
  );
}

function pointerEvent(
  type: 'pointerdown' | 'pointermove',
  { x, y, pointerId = 7 }: { x: number; y: number; pointerId?: number },
) {
  const event = new MouseEvent(type, {
    bubbles: true,
    button: 0,
    clientX: x,
    clientY: y,
  });
  Object.defineProperties(event, {
    isPrimary: { value: true },
    pointerId: { value: pointerId },
  });
  return event;
}

describe('clampFloatingPosition', () => {
  it('mantém o painel dentro da área visível', () => {
    expect(
      clampFloatingPosition(
        { x: 900, y: 700 },
        { width: 320, height: 100 },
        { width: 1000, height: 760 },
      ),
    ).toEqual({ x: 680, y: 660 });
  });

  it('alcança as bordas esquerda e superior da tela visível', () => {
    expect(
      clampFloatingPosition(
        { x: -100, y: -40 },
        { width: 320, height: 100 },
        { width: 1000, height: 760 },
      ),
    ).toEqual({ x: 0, y: 0 });
  });

  it('alcança as bordas direita e inferior sem deixar o painel sair da tela', () => {
    expect(
      clampFloatingPosition(
        { x: 2000, y: 1400 },
        { width: 290, height: 48 },
        { width: 1000, height: 760 },
      ),
    ).toEqual({ x: 710, y: 712 });
  });

  it('mantém a captura no botão para não bloquear o clique do mouse no desktop', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => root.render(createElement(DraggableHarness)));

    const panel = container.firstElementChild as HTMLDivElement;
    const button = panel.querySelector('button') as HTMLButtonElement;
    const panelCapture = vi.fn();
    const buttonCapture = vi.fn();
    Object.defineProperty(panel, 'setPointerCapture', { value: panelCapture });
    Object.defineProperty(button, 'setPointerCapture', { value: buttonCapture });

    act(() => button.dispatchEvent(pointerEvent('pointerdown', { x: 100, y: 100 })));

    expect(buttonCapture).toHaveBeenCalledWith(7);
    expect(panelCapture).not.toHaveBeenCalled();

    act(() => root.unmount());
    container.remove();
  });

  it('move visualmente sem renderizar novamente a Home a cada quadro', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const onRender = vi.fn();

    act(() => root.render(createElement(DraggableHarness, { onRender })));

    const panel = container.firstElementChild as HTMLDivElement;
    const button = panel.querySelector('button') as HTMLButtonElement;
    Object.defineProperty(button, 'setPointerCapture', { value: vi.fn() });
    Object.defineProperty(panel, 'getBoundingClientRect', {
      value: () => ({
        x: 100,
        y: 100,
        left: 100,
        top: 100,
        right: 390,
        bottom: 148,
        width: 290,
        height: 48,
        toJSON: () => undefined,
      }),
    });

    act(() => button.dispatchEvent(pointerEvent('pointerdown', { x: 120, y: 120 })));
    const rendersAfterPointerDown = onRender.mock.calls.length;

    act(() => button.dispatchEvent(pointerEvent('pointermove', { x: 220, y: 200 })));

    await act(
      () =>
        new Promise<void>((resolve) => {
          window.requestAnimationFrame(() => resolve());
        }),
    );

    expect(onRender).toHaveBeenCalledTimes(rendersAfterPointerDown);
    expect(panel.style.transform).toBe('translate3d(200px, 180px, 0)');

    act(() => root.unmount());
    container.remove();
  });
});
