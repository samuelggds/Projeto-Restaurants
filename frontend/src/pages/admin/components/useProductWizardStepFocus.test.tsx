import { act, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProductWizardStep } from '../domain/productWizard';
import { useProductWizardStepFocus } from './useProductWizardStepFocus';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function Probe() {
  const [step, setStep] = useState<ProductWizardStep>('TYPE');
  const scrollRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useProductWizardStepFocus(step, scrollRef, headingRef);
  return (
    <div role="dialog" aria-label="Novo produto">
      <div ref={scrollRef}>
        <h3 tabIndex={-1} ref={headingRef}>{step}</h3>
        <button type="button" onClick={() => setStep('BASIC')}>Próxima etapa</button>
      </div>
    </div>
  );
}

describe('useProductWizardStepFocus', () => {
  let container: HTMLDivElement;
  let root: Root;
  let frames: FrameRequestCallback[];
  let canceled: Set<number>;

  const runFrame = () => {
    const pending = frames.splice(0);
    pending.forEach((callback, index) => {
      if (!canceled.has(index + 1)) callback(0);
    });
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    frames = [];
    canceled = new Set();
    let sequence = 0;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.push(callback);
      return ++sequence;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => canceled.add(id));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  it('restaura o foco se Safari devolve o foco ao acionador após o primeiro frame', () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    act(() => root.render(<Probe />));
    const heading = container.querySelector('h3')!;
    const next = container.querySelector('button')!;
    act(runFrame);
    expect(document.activeElement).toBe(heading);
    opener.focus();
    act(runFrame);
    expect(document.activeElement).toBe(heading);

    act(() => next.click());
    act(runFrame);
    expect(heading.textContent).toBe('BASIC');
    expect(document.activeElement).toBe(heading);
    opener.remove();
  });

  it('não rouba o foco de um controle já acionado dentro do modal', () => {
    act(() => root.render(<Probe />));
    const next = container.querySelector('button')!;
    act(runFrame);
    next.focus();
    act(runFrame);
    expect(document.activeElement).toBe(next);
  });
});
