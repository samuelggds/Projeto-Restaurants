import { ChevronUp, Gift, ShoppingBag, X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import * as S from './CustomerActionHub.styles';

function hasOpenDialog() {
  return [...document.querySelectorAll<HTMLElement>('[role="dialog"]')].some(
    (dialog) =>
      !dialog.closest('[aria-hidden="true"], [hidden], [inert]') &&
      dialog.getClientRects().length > 0,
  );
}

export function CustomerActionHub({
  children,
  activeOrder = false,
  hasWhatsapp,
  aboveNudge,
  primary,
}: {
  children: ReactNode;
  activeOrder?: boolean;
  hasWhatsapp: boolean;
  aboveNudge: boolean;
  primary: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => panel.current?.focus());
    const outside = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || root.current?.contains(event.target)) return;
      // Pedido, cupons e ajuda abrem diálogos em portais, fora desta central.
      if (hasOpenDialog()) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('pointerdown', outside);
    };
  }, [open]);

  return (
    <S.Dock
      ref={root}
      $primary={primary}
      $hasWhatsapp={hasWhatsapp}
      $aboveNudge={aboveNudge}
      data-testid="floating-actions-layer"
    >
      {open ? (
        <S.Panel
          ref={panel}
          id={id}
          tabIndex={-1}
          aria-labelledby={`${id}-title`}
          onKeyDown={(event) => {
            if (
              event.key === 'Escape' &&
              !hasOpenDialog() &&
              event.currentTarget.contains(event.target as Node)
            ) {
              event.stopPropagation();
              close();
            }
          }}
        >
          <header>
            <div>
              <span>PERTINHO DE VOCÊ</span>
              <h2 id={`${id}-title`}>
                {activeOrder ? 'Seu pedido e benefícios' : 'Cupons e ajuda'}
              </h2>
              <p>
                {activeOrder
                  ? 'Acompanhe seu pedido com facilidade.'
                  : 'Aproveite os benefícios do restaurante.'}
              </p>
            </div>
            <button type="button" aria-label="Fechar central do cliente" onClick={close}>
              <X size={18} aria-hidden="true" />
            </button>
          </header>
          <div className="hub-content">{children}</div>
          <footer>Continue escolhendo. Estamos aqui quando precisar.</footer>
        </S.Panel>
      ) : null}
      <S.Launcher
        ref={trigger}
        type="button"
        data-testid="floating-actions-control-customer"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="launcher-icon">
          {activeOrder ? (
            <ShoppingBag size={20} aria-hidden="true" />
          ) : (
            <Gift size={20} aria-hidden="true" />
          )}
          {activeOrder ? <i aria-hidden="true" /> : null}
        </span>
        <span>{activeOrder ? 'Meu pedido' : 'Cupons e ajuda'}</span>
        <ChevronUp size={16} aria-hidden="true" className={open ? 'chevron open' : 'chevron'} />
      </S.Launcher>
    </S.Dock>
  );
}
