import { useEffect, useRef } from 'react';
import { LocateFixed, MapPinOff, Navigation, ShieldCheck, X } from 'lucide-react';
import styled from 'styled-components';

type ClaimMode = 'location' | 'without-location' | null;

type CourierLocationChoiceModalProps = {
  open: boolean;
  orderId: number;
  loading: boolean;
  activeChoice: ClaimMode;
  error?: string;
  onClose: () => void;
  onUseLocation: () => void;
  onContinueWithoutLocation: () => void;
};

export default function CourierLocationChoiceModal({
  open,
  orderId,
  loading,
  activeChoice,
  error,
  onClose,
  onUseLocation,
  onContinueWithoutLocation,
}: CourierLocationChoiceModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = 'hidden';
    queueMicrotask(() => firstButtonRef.current?.focus());

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) {
        onClose();
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
      previousFocus?.focus();
    };
  }, [loading, onClose, open]);

  if (!open) return null;

  return (
    <Overlay
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onClose();
      }}
    >
      <Dialog
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`courier-location-title-${orderId}`}
        aria-describedby={`courier-location-description-${orderId}`}
      >
        <TopRow>
          <Icon aria-hidden="true"><LocateFixed /></Icon>
          <OrderLabel>Pedido #{orderId}</OrderLabel>
          <CloseButton
            ref={firstButtonRef}
            type="button"
            aria-label="Fechar escolha de localização"
            onClick={onClose}
            disabled={loading}
          >
            <X aria-hidden="true" />
          </CloseButton>
        </TopRow>

        <Title id={`courier-location-title-${orderId}`}>Compartilhar localização?</Title>
        <Description id={`courier-location-description-${orderId}`}>
          O cliente acompanha o trajeto em tempo real. É recomendado, mas a retirada funciona normalmente sem GPS.
        </Description>

        <PrivacyNote>
          <ShieldCheck aria-hidden="true" />
          <span>Você pode ativar ou desativar o compartilhamento durante a entrega.</span>
        </PrivacyNote>

        {error ? <InlineNotice role="status">O GPS não ficou disponível agora. Você ainda pode retirar sem localização.</InlineNotice> : null}

        <Actions>
          <PrimaryButton type="button" onClick={onUseLocation} disabled={loading}>
            <Navigation aria-hidden="true" />
            <span>
              <strong>{loading && activeChoice === 'location' ? 'Ativando...' : 'Ativar localização'}</strong>
              <small>Recomendado · rastreamento em tempo real</small>
            </span>
          </PrimaryButton>
          <SecondaryButton type="button" onClick={onContinueWithoutLocation} disabled={loading}>
            <MapPinOff aria-hidden="true" />
            <span>
              <strong>{loading && activeChoice === 'without-location' ? 'Retirando...' : 'Continuar sem localização'}</strong>
              <small>O pedido segue normalmente</small>
            </span>
          </SecondaryButton>
        </Actions>
      </Dialog>
    </Overlay>
  );
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(17, 17, 17, 0.48);
  backdrop-filter: blur(5px);
`;

const Dialog = styled.div`
  width: min(100%, 420px);
  border: 1px solid #e8ded7;
  border-radius: 10px;
  background: #fffdfa;
  padding: 20px;
  color: #211d1a;
  box-shadow: 0 24px 70px rgba(45, 30, 21, 0.24);
`;

const TopRow = styled.div`
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 10px;
  align-items: center;
  margin-bottom: 14px;
`;

const Icon = styled.span`
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: #fff0e8;
  color: #c84d25;
  border: 1px solid #f2c8b6;
  svg { width: 19px; height: 19px; }
`;

const OrderLabel = styled.span`
  color: #9f4728;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
`;

const CloseButton = styled.button`
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 1px solid #e4ddd8;
  border-radius: 8px;
  background: #fff;
  color: #6d645e;
  cursor: pointer;
  svg { width: 17px; height: 17px; }
  &:hover:not(:disabled) { background: #f8f5f2; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const Title = styled.h2`
  margin: 0;
  font-size: clamp(1.25rem, 5vw, 1.55rem);
  line-height: 1.12;
`;

const Description = styled.p`
  margin: 8px 0 0;
  color: #655d58;
  font-size: 0.88rem;
  line-height: 1.48;
`;

const PrivacyNote = styled.div`
  display: flex;
  gap: 9px;
  align-items: center;
  margin-top: 14px;
  padding: 10px 11px;
  border-radius: 8px;
  background: #f7f6f3;
  color: #5f5a55;
  font-size: 0.78rem;
  line-height: 1.35;
  svg { width: 17px; height: 17px; flex: 0 0 auto; color: #2d8b57; }
`;

const InlineNotice = styled.div`
  margin-top: 10px;
  padding: 9px 11px;
  border-radius: 8px;
  border: 1px solid #f0c5b9;
  background: #fff5f1;
  color: #9d4029;
  font-size: 0.76rem;
  line-height: 1.4;
`;

const Actions = styled.div`
  display: grid;
  gap: 8px;
  margin-top: 14px;
`;

const ActionButton = styled.button`
  width: 100%;
  min-height: 58px;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px;
  align-items: center;
  padding: 10px 12px;
  border-radius: 8px;
  text-align: left;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  > svg { width: 19px; height: 19px; }
  > span { display: grid; gap: 2px; }
  strong { font-size: 0.88rem; }
  small { font-size: 0.72rem; line-height: 1.25; }
  &:hover:not(:disabled) { transform: translateY(-1px); }
  &:disabled { opacity: 0.62; cursor: wait; }
`;

const PrimaryButton = styled(ActionButton)`
  border: 1px solid #c84d25;
  background: #d85329;
  color: #fff;
  box-shadow: 0 8px 20px rgba(200, 77, 37, 0.2);
  small { color: #fff0ea; }
`;

const SecondaryButton = styled(ActionButton)`
  border: 1px solid #ddd6d1;
  background: #fff;
  color: #342f2c;
  > svg { color: #746c66; }
  small { color: #7b736d; }
  &:hover:not(:disabled) { box-shadow: 0 6px 16px rgba(55, 42, 33, 0.08); }
`;
