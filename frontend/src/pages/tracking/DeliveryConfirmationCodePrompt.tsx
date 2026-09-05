import { useEffect, useRef, useState } from 'react';
import { BellRing, KeyRound, ShieldCheck, X } from 'lucide-react';
import styled from 'styled-components';
import { useDraggableFloatingActions } from '../Home/hooks/useDraggableFloatingActions';

type Props = {
  code: string;
  orderId: number;
  deliveryStartedAt?: string | null;
};

const DELIVERY_CODE_POSITION_KEY = '@PecaJaFood:deliveryCodePosition';

function playDeliveryTone() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 740;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.22);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.24);
    oscillator.addEventListener('ended', () => void context.close());
  } catch {
    // Alguns navegadores bloqueiam áudio sem interação prévia. O aviso visual continua disponível.
  }
}

export default function DeliveryConfirmationCodePrompt({ code, orderId, deliveryStartedAt }: Props) {
  const alertKey = `delivery-start-alert:${orderId}:${deliveryStartedAt || 'active'}`;
  const [open, setOpen] = useState(false);
  const [showArrivalNotice, setShowArrivalNotice] = useState(
    () => sessionStorage.getItem(alertKey) !== 'shown',
  );
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const {
    elementRef: floatingButtonRef,
    style: floatingButtonStyle,
    dragging,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onClickCapture,
  } = useDraggableFloatingActions(DELIVERY_CODE_POSITION_KEY);

  useEffect(() => {
    if (!showArrivalNotice) return;
    sessionStorage.setItem(alertKey, 'shown');
    const timeout = window.setTimeout(() => setShowArrivalNotice(false), 9000);

    try {
      navigator.vibrate?.([180, 90, 180]);
    } catch {
      // Vibração não é suportada por todos os dispositivos.
    }
    playDeliveryTone();

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('Seu pedido saiu para entrega', {
          body: 'O código de recebimento já está disponível. Informe-o ao motoqueiro somente ao receber o pedido.',
          tag: `delivery-start-${orderId}`,
        });
      } catch {
        // O aviso dentro da página continua sendo a fonte principal.
      }
    }

    return () => window.clearTimeout(timeout);
  }, [alertKey, orderId, showArrivalNotice]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const trigger = triggerRef.current;
    document.body.style.overflow = 'hidden';
    queueMicrotask(() => closeRef.current?.focus());

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      trigger?.focus();
    };
  }, [open]);

  const digits = String(code).padStart(4, '0').slice(0, 4).split('');

  return (
    <>
      {showArrivalNotice ? (
        <Notice role="status" aria-live="polite">
          <BellRing aria-hidden="true" />
          <span>
            <strong>Seu pedido saiu para entrega</strong>
            <small>
              O código de recebimento já está disponível. Guarde-o para informar ao motoqueiro.
            </small>
          </span>
        </Notice>
      ) : null}

      <FloatingButtonShell
        ref={floatingButtonRef}
        style={floatingButtonStyle}
        $dragging={dragging}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onClickCapture={onClickCapture}
      >
        <FloatingButton
          ref={triggerRef}
          type="button"
          data-floating-drag-handle="true"
          aria-label={`Ver código de entrega do pedido ${orderId}. Arraste para mover.`}
          title="Clique para ver o código ou arraste para mover"
          onClick={() => setOpen(true)}
        >
          <KeyRound aria-hidden="true" />
          <Badge aria-hidden="true">4</Badge>
        </FloatingButton>
      </FloatingButtonShell>

      {open ? (
        <Overlay
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <Dialog
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`delivery-code-title-${orderId}`}
          >
            <DialogHeader>
              <IconBox aria-hidden="true">
                <KeyRound />
              </IconBox>
              <span>
                <Eyebrow>Pedido #{orderId}</Eyebrow>
                <Title id={`delivery-code-title-${orderId}`}>Código de entrega</Title>
              </span>
              <CloseButton
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar código de entrega"
              >
                <X aria-hidden="true" />
              </CloseButton>
            </DialogHeader>

            <Description>
              Informe este código ao motoqueiro{' '}
              <strong>somente quando estiver recebendo o pedido</strong>.
            </Description>

            <Digits aria-label={`Código ${digits.join(' ')}`}>
              {digits.map((digit, index) => (
                <Digit key={`${digit}-${index}`}>{digit}</Digit>
              ))}
            </Digits>

            <SecurityNote>
              <ShieldCheck aria-hidden="true" />
              <span>
                O motoqueiro precisa deste código e do pagamento confirmado para concluir a entrega.
              </span>
            </SecurityNote>

            <DoneButton type="button" onClick={() => setOpen(false)}>
              Entendi
            </DoneButton>
          </Dialog>
        </Overlay>
      ) : null}
    </>
  );
}

const Notice = styled.div`
  position: fixed;
  top: 16px;
  left: 50%;
  z-index: 1250;
  width: min(420px, calc(100vw - 24px));
  transform: translateX(-50%);
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 11px;
  align-items: start;
  padding: 12px 14px;
  border: 1px solid #f0c2ad;
  border-radius: 10px;
  background: #fff7f2;
  color: #8d3d21;
  box-shadow: 0 12px 34px rgba(100, 55, 30, 0.16);
  > svg { width: 20px; height: 20px; margin-top: 1px; }
  span { display: grid; gap: 3px; }
  strong { font-size: 0.9rem; }
  small { color: #6e5d54; font-size: 0.78rem; line-height: 1.4; }
`;

const FloatingButtonShell = styled.div<{ $dragging: boolean }>`
  position: fixed;
  right: 18px;
  bottom: 22px;
  z-index: 1050;
  width: 58px;
  height: 58px;
  touch-action: none;
  user-select: none;
  cursor: ${({ $dragging }) => ($dragging ? 'grabbing' : 'grab')};
`;

const FloatingButton = styled.button`
  position: relative;
  width: 58px;
  height: 58px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: #d85329;
  color: #fff;
  cursor: inherit;
  touch-action: none;
  box-shadow: 0 12px 30px rgba(179, 64, 27, 0.3);
  transition: transform 0.16s ease, box-shadow 0.16s ease;
  > svg { width: 24px; height: 24px; }
  &:hover { transform: translateY(-2px); box-shadow: 0 15px 34px rgba(179, 64, 27, 0.36); }
  &:focus-visible { outline: 3px solid rgba(216, 83, 41, 0.28); outline-offset: 3px; }
`;

const Badge = styled.span`
  position: absolute;
  top: -3px;
  right: -2px;
  min-width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
  padding: 0 5px;
  border: 2px solid #fff;
  border-radius: 999px;
  background: #1f1b18;
  color: #fff;
  font-size: 0.68rem;
  font-weight: 800;
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1300;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(19, 17, 15, 0.52);
  backdrop-filter: blur(6px);
`;

const Dialog = styled.div`
  width: min(100%, 390px);
  border: 1px solid #eadfd8;
  border-radius: 10px;
  background: #fffdfa;
  padding: 20px;
  color: #211d1a;
  box-shadow: 0 28px 80px rgba(42, 29, 20, 0.28);
`;

const DialogHeader = styled.div`
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 11px;
  align-items: center;
`;

const IconBox = styled.span`
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: #fff0e8;
  border: 1px solid #f1c7b4;
  color: #c84d25;
  svg { width: 20px; height: 20px; }
`;

const Eyebrow = styled.small`
  display: block;
  margin-bottom: 2px;
  color: #a44a29;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 1.22rem;
  line-height: 1.15;
`;

const CloseButton = styled.button`
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 1px solid #e5ddd8;
  border-radius: 8px;
  background: #fff;
  color: #6c625c;
  cursor: pointer;
  svg { width: 17px; height: 17px; }
`;

const Description = styled.p`
  margin: 16px 0 14px;
  color: #655b55;
  font-size: 0.88rem;
  line-height: 1.48;
  strong { color: #342d29; }
`;

const Digits = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin: 8px 0 15px;
`;

const Digit = styled.span`
  height: 68px;
  display: grid;
  place-items: center;
  border: 1px solid #e2d6cf;
  border-radius: 8px;
  background: #fff;
  color: #201b18;
  font-size: 2rem;
  font-weight: 850;
  letter-spacing: 0.02em;
  box-shadow: inset 0 -2px 0 #f5ede8;
`;

const SecurityNote = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 9px;
  align-items: start;
  padding: 10px 11px;
  border-radius: 8px;
  background: #f4f8f5;
  color: #526058;
  font-size: 0.76rem;
  line-height: 1.4;
  svg { width: 17px; height: 17px; color: #268453; }
`;

const DoneButton = styled.button`
  width: 100%;
  min-height: 44px;
  margin-top: 14px;
  border: 1px solid #c94d24;
  border-radius: 8px;
  background: #d85329;
  color: #fff;
  font-weight: 800;
  cursor: pointer;
`;
