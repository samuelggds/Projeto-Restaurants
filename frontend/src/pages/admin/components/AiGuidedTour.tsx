import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { ArrowLeft, ArrowRight, Sparkles, X } from 'lucide-react';
import type { AiTourGuide } from '../../../Services/aiGuideService';

type Props = {
  guide: AiTourGuide | null;
  onClose: () => void;
  onNavigate: (destination?: string | null) => void;
};

type Rect = { top: number; left: number; width: number; height: number };

function readTargetRect(target: string): Rect | null {
  const element = document.querySelector<HTMLElement>(`[data-tour="${CSS.escape(target)}"]`);
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
}

export function AiGuidedTour({ guide, onClose, onNavigate }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const step = guide?.steps[stepIndex];

  useEffect(() => {
    if (!step) return undefined;
    onNavigate(step.navigateTo);
    let canceled = false;
    const sync = () => {
      if (canceled) return;
      const rect = readTargetRect(step.target);
      setTargetRect(rect);
      if (rect) {
        const element = document.querySelector<HTMLElement>(
          `[data-tour="${CSS.escape(step.target)}"]`,
        );
        element?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      }
    };
    const initial = window.setTimeout(sync, 260);
    const second = window.setTimeout(sync, 620);
    window.addEventListener('resize', sync);
    window.addEventListener('scroll', sync, true);
    return () => {
      canceled = true;
      window.clearTimeout(initial);
      window.clearTimeout(second);
      window.removeEventListener('resize', sync);
      window.removeEventListener('scroll', sync, true);
    };
  }, [onNavigate, step]);

  useEffect(() => {
    if (!guide) return undefined;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight')
        setStepIndex((current) => Math.min(guide.steps.length - 1, current + 1));
      if (event.key === 'ArrowLeft') setStepIndex((current) => Math.max(0, current - 1));
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [guide, onClose]);

  const bubblePosition = useMemo(() => {
    if (!targetRect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    const bubbleWidth = Math.min(390, Math.max(300, window.innerWidth - 32));
    const spaceRight = window.innerWidth - (targetRect.left + targetRect.width);
    const spaceLeft = targetRect.left;
    const below = targetRect.top + targetRect.height + 18;
    const above = targetRect.top - 18;

    if (spaceRight >= bubbleWidth + 28) {
      return {
        top: `${Math.max(18, targetRect.top - 8)}px`,
        left: `${targetRect.left + targetRect.width + 18}px`,
        transform: 'none',
      };
    }
    if (spaceLeft >= bubbleWidth + 28) {
      return {
        top: `${Math.max(18, targetRect.top - 8)}px`,
        left: `${Math.max(18, targetRect.left - bubbleWidth - 18)}px`,
        transform: 'none',
      };
    }
    if (below + 260 < window.innerHeight) {
      return {
        top: `${below}px`,
        left: `${Math.max(16, Math.min(targetRect.left, window.innerWidth - bubbleWidth - 16))}px`,
        transform: 'none',
      };
    }
    return {
      top: `${Math.max(16, above - 250)}px`,
      left: `${Math.max(16, Math.min(targetRect.left, window.innerWidth - bubbleWidth - 16))}px`,
      transform: 'none',
    };
  }, [targetRect]);

  if (!guide || !step) return null;
  const progress = ((stepIndex + 1) / guide.steps.length) * 100;

  return (
    <Layer aria-label="Guia interativo com IA" role="dialog" aria-modal="true">
      <Dimmer onClick={onClose} />
      {targetRect && (
        <Spotlight
          aria-hidden="true"
          style={{
            top: targetRect.top - 7,
            left: targetRect.left - 7,
            width: targetRect.width + 14,
            height: targetRect.height + 14,
          }}
        />
      )}
      <Bubble style={bubblePosition}>
        <header>
          <span className="ai-badge">
            <Sparkles /> Guia com IA
          </span>
          <button type="button" aria-label="Fechar guia" onClick={onClose}>
            <X />
          </button>
        </header>
        <div className="progress-track" aria-hidden="true">
          <i style={{ width: `${progress}%` }} />
        </div>
        <small className="step-count">
          Passo {stepIndex + 1} de {guide.steps.length}
        </small>
        <h2>{step.title}</h2>
        <p>{step.body}</p>
        <footer>
          <button
            type="button"
            className="ghost"
            disabled={stepIndex === 0}
            onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
          >
            <ArrowLeft /> Voltar
          </button>
          {stepIndex < guide.steps.length - 1 ? (
            <button
              type="button"
              className="next"
              onClick={() =>
                setStepIndex((current) => Math.min(guide.steps.length - 1, current + 1))
              }
            >
              Próximo <ArrowRight />
            </button>
          ) : (
            <button type="button" className="next" onClick={onClose}>
              Concluir
            </button>
          )}
        </footer>
      </Bubble>
    </Layer>
  );
}

const Layer = styled.div`
  position: fixed;
  inset: 0;
  z-index: 2400;
  pointer-events: none;
`;

const Dimmer = styled.button`
  position: absolute;
  inset: 0;
  width: 100%;
  border: 0;
  padding: 0;
  pointer-events: auto;
  background: rgba(8, 10, 12, 0.58);
  backdrop-filter: blur(1.5px);
`;

const Spotlight = styled.div`
  position: fixed;
  z-index: 2;
  border: 2px solid rgba(255, 255, 255, 0.96);
  border-radius: 14px;
  pointer-events: none;
  box-shadow:
    0 0 0 5px rgba(255, 255, 255, 0.12),
    0 0 0 9999px rgba(8, 10, 12, 0.14),
    0 18px 46px rgba(0, 0, 0, 0.28);
  transition: all 220ms ease;
`;

const Bubble = styled.section`
  position: fixed;
  z-index: 3;
  width: min(390px, calc(100vw - 32px));
  padding: 18px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 18px;
  pointer-events: auto;
  color: #fff;
  background:
    radial-gradient(circle at 85% 0%, rgba(255, 255, 255, 0.11), transparent 34%),
    linear-gradient(155deg, #16191d 0%, #0d0f12 100%);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.42);
  animation: tour-pop 180ms ease-out;

  @keyframes tour-pop {
    from {
      opacity: 0;
      transform: translateY(7px) scale(0.985);
    }
    to {
      opacity: 1;
    }
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  header > button {
    width: 34px;
    height: 34px;
    border: 1px solid rgba(255, 255, 255, 0.11);
    border-radius: 10px;
    display: grid;
    place-items: center;
    color: #d9dde2;
    background: rgba(255, 255, 255, 0.06);
  }
  header > button:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.11);
  }
  header svg {
    width: 16px;
  }
  .ai-badge {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: #f1f4f6;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
  .ai-badge svg {
    width: 15px;
  }
  .progress-track {
    height: 4px;
    margin: 15px 0 12px;
    overflow: hidden;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.1);
  }
  .progress-track i {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: #fff;
    transition: width 220ms ease;
  }
  .step-count {
    color: #929aa4;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  h2 {
    margin: 7px 0 8px;
    color: #fff;
    font-size: 19px;
    line-height: 1.25;
  }
  p {
    margin: 0;
    color: #c9ced4;
    font-size: 13px;
    line-height: 1.6;
  }
  footer {
    margin-top: 18px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
  footer button {
    min-height: 40px;
    padding: 0 13px;
    border-radius: 11px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    font-size: 12px;
    font-weight: 800;
  }
  footer button svg {
    width: 15px;
  }
  footer .ghost {
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #cbd0d5;
    background: transparent;
  }
  footer .ghost:disabled {
    opacity: 0.35;
  }
  footer .next {
    border: 0;
    color: #111317;
    background: #fff;
    box-shadow: 0 8px 24px rgba(255, 255, 255, 0.12);
  }

  @media (max-width: 700px) {
    inset: auto 12px 12px !important;
    width: auto;
    transform: none !important;
    border-radius: 20px;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;
