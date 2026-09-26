import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
import { Bell, CheckCircle2, LoaderCircle, X } from 'lucide-react';
import styled from 'styled-components';
import { useDraggableFloatingActions } from '../hooks/useDraggableFloatingActions';

type Props = {
  embedded?: boolean;
  tableNumber: string | number;
  waiterEnabled: boolean;
  billEnabled: boolean;
  accountEnabled: boolean;
  loading: 'WAITER' | 'BILL' | null;
  onCallWaiter: () => void;
  onRequestBill: () => void;
  onOpenAccount: () => void;
};

const FloatingWaiter = styled.div`
  position: fixed;
  z-index: 68;
  right: 24px;
  bottom: 24px;
  width: 60px;
  height: 60px;

  &[data-drag-positioned='true'] {
    right: auto;
    bottom: auto;
  }

  &[data-dragging='true'] {
    transition: none;
    will-change: transform;
  }

  @media (max-width: 700px) {
    right: 16px;
    bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  }
`;

const WaiterButton = styled.button`
  width: 60px;
  height: 60px;
  padding: 0;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: var(--home-primary, #d64d08);
  color: #fff;
  box-shadow: 0 14px 30px rgba(65, 38, 20, 0.26);
  cursor: grab;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  transition: transform 160ms ease, box-shadow 160ms ease, opacity 160ms ease;

  svg { width: 25px; height: 25px; }
  &:hover:not(:disabled) { transform: translateY(-2px) scale(1.04); }
  &:active:not(:disabled) { cursor: grabbing; transform: scale(0.97); }
  &:focus-visible { outline: 4px solid rgba(214, 77, 8, 0.2); outline-offset: 3px; }
  &:disabled { cursor: not-allowed; opacity: 0.5; }
`;

const ModalBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 150;
  padding: 20px;
  display: grid;
  place-items: center;
  background: rgba(18, 14, 11, 0.5);
  backdrop-filter: blur(6px);
`;

const Modal = styled.section`
  width: min(430px, 100%);
  overflow: hidden;
  border: 1px solid #eadfd6;
  border-radius: 24px;
  background: #fff;
  box-shadow: 0 28px 72px rgba(31, 22, 17, 0.26);

  header {
    padding: 20px 20px 14px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
  }

  header > div { display: grid; gap: 4px; }
  .eyebrow {
    color: var(--home-primary, #d64d08);
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  h2 { margin: 0; color: #241f1b; font-size: 21px; line-height: 1.2; }
  header p { margin: 0; color: #7d726a; font-size: 11px; line-height: 1.5; }
`;

const CloseButton = styled.button`
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  display: grid;
  place-items: center;
  border: 1px solid #eadfd6;
  border-radius: 12px;
  background: #fff;
  color: #655b54;
  cursor: pointer;
  svg { width: 17px; height: 17px; }
`;

const ModalBody = styled.div`
  margin: 2px 20px 0;
  padding: 24px 18px;
  display: grid;
  place-items: center;
  gap: 10px;
  border: 1px solid #eadfd6;
  border-radius: 18px;
  background: #fffaf6;
  text-align: center;

  .icon {
    width: 60px;
    height: 60px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: #fff1e9;
    color: var(--home-primary, #d64d08);
  }
  .icon svg { width: 26px; height: 26px; }
  strong { color: #302923; font-size: 13px; }
  small { max-width: 305px; color: #81766e; font-size: 10px; line-height: 1.55; }
`;

const ModalActions = styled.div`
  padding: 16px 20px 20px;
  display: grid;
  grid-template-columns: minmax(0, 0.65fr) minmax(0, 1.35fr);
  gap: 10px;

  button {
    min-height: 46px;
    border-radius: 14px;
    font: inherit;
    font-size: 11px;
    font-weight: 850;
    cursor: pointer;
  }
  .cancel { border: 1px solid #e6ddd5; background: #fff; color: #5f554e; }
  .confirm {
    border: 1px solid var(--home-primary, #d64d08);
    background: var(--home-primary, #d64d08);
    color: #fff;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .confirm svg { width: 17px; height: 17px; }
  button:disabled { cursor: not-allowed; opacity: 0.55; }
  @media (max-width: 380px) { grid-template-columns: 1fr; }
`;

export function TableServiceActions({
  tableNumber,
  waiterEnabled,
  loading,
  onCallWaiter,
}: Props) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const tableLabel = String(tableNumber);
  const {
    elementRef,
    style,
    dragging,
    positioned,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onClickCapture,
  } = useDraggableFloatingActions('@GastroNexa:waiterButtonPosition');

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && loading === null) setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [loading, open]);

  if (!waiterEnabled || typeof document === 'undefined') return null;

  return createPortal(
    <>
      <FloatingWaiter
        ref={elementRef}
        style={style}
        data-dragging={dragging ? 'true' : 'false'}
        data-drag-positioned={positioned ? 'true' : 'false'}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onClickCapture={onClickCapture}
      >
        <WaiterButton
          type="button"
          data-floating-drag-handle="true"
          data-testid="table-waiter-floating-button"
          disabled={loading !== null}
          aria-label={'Chamar garçom da mesa ' + tableLabel}
          title="Chamar garçom"
          onClick={() => setOpen(true)}
        >
          {loading === 'WAITER' ? <LoaderCircle aria-hidden="true" /> : <Bell aria-hidden="true" />}
        </WaiterButton>
      </FloatingWaiter>

      {open ? (
        <ModalBackdrop
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && loading === null) setOpen(false);
          }}
        >
          <Modal role="dialog" aria-modal="true" aria-labelledby="waiter-call-title">
            <header>
              <div>
                <span className="eyebrow">Mesa {tableLabel}</span>
                <h2 id="waiter-call-title">Chamar o garçom?</h2>
                <p>Envie uma solicitação diretamente para a equipe do salão.</p>
              </div>
              <CloseButton
                ref={closeRef}
                type="button"
                aria-label="Fechar chamada do garçom"
                disabled={loading !== null}
                onClick={() => setOpen(false)}
              >
                <X aria-hidden="true" />
              </CloseButton>
            </header>

            <ModalBody>
              <span className="icon" aria-hidden="true"><Bell /></span>
              <strong>O garçom receberá o chamado da Mesa {tableLabel}</strong>
              <small>
                Use quando precisar falar com a equipe. Você continua no cardápio enquanto o chamado
                é enviado ao salão.
              </small>
            </ModalBody>

            <ModalActions>
              <button className="cancel" type="button" disabled={loading !== null} onClick={() => setOpen(false)}>
                Agora não
              </button>
              <button
                className="confirm"
                type="button"
                disabled={loading !== null}
                onClick={() => {
                  onCallWaiter();
                  setOpen(false);
                }}
              >
                {loading === 'WAITER' ? (
                  <><LoaderCircle aria-hidden="true" /> Chamando...</>
                ) : (
                  <><CheckCircle2 aria-hidden="true" /> Chamar garçom</>
                )}
              </button>
            </ModalActions>
          </Modal>
        </ModalBackdrop>
      ) : null}
    </>,
    document.body,
  );
}
