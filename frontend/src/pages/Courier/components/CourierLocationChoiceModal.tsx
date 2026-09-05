import { useEffect } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  LocateFixed,
  MapPinOff,
  Navigation,
  ShieldCheck,
  X,
} from 'lucide-react';
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
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
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
        role="dialog"
        aria-modal="true"
        aria-labelledby={`courier-location-title-${orderId}`}
        aria-describedby={`courier-location-description-${orderId}`}
      >
        <CloseButton
          type="button"
          aria-label="Fechar escolha de localização"
          onClick={onClose}
          disabled={loading}
        >
          <X aria-hidden="true" />
        </CloseButton>

        <HeroIcon aria-hidden="true">
          <LocateFixed />
        </HeroIcon>
        <Eyebrow>Pedido #{orderId}</Eyebrow>
        <Title id={`courier-location-title-${orderId}`}>
          Compartilhar localização durante a entrega?
        </Title>
        <Description id={`courier-location-description-${orderId}`}>
          Com a localização ativa, o cliente consegue acompanhar o trajeto do pedido em tempo real.
          Isso é recomendado, mas não é obrigatório para retirar e entregar o pedido.
        </Description>

        <Benefits aria-label="Benefícios do rastreamento">
          <Benefit>
            <CheckCircle2 aria-hidden="true" />
            <span>
              <strong>Melhor experiência para o cliente</strong>
              <small>Ele acompanha o deslocamento sem precisar ligar para o restaurante.</small>
            </span>
          </Benefit>
          <Benefit>
            <ShieldCheck aria-hidden="true" />
            <span>
              <strong>Você continua no controle</strong>
              <small>Se não puder usar o GPS agora, a entrega segue normalmente.</small>
            </span>
          </Benefit>
        </Benefits>

        {error ? (
          <ErrorBox role="alert">
            <AlertCircle aria-hidden="true" />
            <span>
              <strong>Não foi possível ativar a localização agora.</strong>
              <small>{error}</small>
            </span>
          </ErrorBox>
        ) : null}

        <Actions>
          <PrimaryButton type="button" onClick={onUseLocation} disabled={loading}>
            <Navigation aria-hidden="true" />
            <span>
              <strong>
                {loading && activeChoice === 'location'
                  ? 'Ativando localização...'
                  : 'Ativar localização'}
              </strong>
              <small>Recomendado · acompanhamento em tempo real</small>
            </span>
            <Recommended>Recomendado</Recommended>
          </PrimaryButton>

          <SecondaryButton
            type="button"
            onClick={onContinueWithoutLocation}
            disabled={loading}
          >
            <MapPinOff aria-hidden="true" />
            <span>
              <strong>
                {loading && activeChoice === 'without-location'
                  ? 'Retirando pedido...'
                  : 'Continuar sem localização'}
              </strong>
              <small>Você poderá ativar o GPS depois, durante a entrega.</small>
            </span>
          </SecondaryButton>
        </Actions>

        <Footnote>
          A falta de GPS não bloqueia a operação. Para atualizar o pedido no restaurante, o aparelho
          ainda precisa conseguir se comunicar com o servidor.
        </Footnote>
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
  padding: 20px;
  background: rgba(20, 18, 16, 0.58);
  backdrop-filter: blur(6px);
`;

const Dialog = styled.div`
  position: relative;
  width: min(100%, 470px);
  max-height: min(92vh, 760px);
  overflow-y: auto;
  border: 1px solid #eadfd7;
  border-radius: 26px;
  background: #fffdfa;
  padding: 30px;
  color: #25211e;
  box-shadow: 0 28px 80px rgba(52, 34, 24, 0.28);

  @media (max-width: 520px) {
    padding: 24px 18px 20px;
    border-radius: 22px;
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border: 1px solid #e8e1dc;
  border-radius: 12px;
  background: #fff;
  color: #665d57;
  cursor: pointer;

  svg {
    width: 18px;
    height: 18px;
  }

  &:hover:not(:disabled) {
    background: #f8f4f1;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const HeroIcon = styled.div`
  width: 58px;
  height: 58px;
  display: grid;
  place-items: center;
  margin-bottom: 16px;
  border-radius: 18px;
  background: linear-gradient(145deg, #fff0e8, #ffe0d2);
  color: #c94d22;
  box-shadow: inset 0 0 0 1px #f4c8b5;

  svg {
    width: 28px;
    height: 28px;
  }
`;

const Eyebrow = styled.small`
  display: block;
  margin-bottom: 7px;
  color: #aa4a27;
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const Title = styled.h2`
  margin: 0;
  padding-right: 28px;
  color: #1f1c1a;
  font-size: clamp(1.35rem, 4vw, 1.75rem);
  line-height: 1.15;
`;

const Description = styled.p`
  margin: 12px 0 0;
  color: #625a55;
  font-size: 0.95rem;
  line-height: 1.55;
`;

const Benefits = styled.div`
  display: grid;
  gap: 10px;
  margin: 22px 0 16px;
`;

const Benefit = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 11px;
  align-items: start;
  padding: 13px 14px;
  border: 1px solid #ece4de;
  border-radius: 15px;
  background: #fff;

  > svg {
    width: 19px;
    height: 19px;
    margin-top: 1px;
    color: #25834a;
  }

  span {
    display: grid;
    gap: 3px;
  }

  strong {
    font-size: 0.88rem;
  }

  small {
    color: #766d67;
    font-size: 0.78rem;
    line-height: 1.35;
  }
`;

const ErrorBox = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px;
  margin: 14px 0 16px;
  padding: 13px 14px;
  border: 1px solid #efbdb5;
  border-radius: 14px;
  background: #fff3f1;
  color: #9d3428;

  > svg {
    width: 19px;
    height: 19px;
    margin-top: 1px;
  }

  span {
    display: grid;
    gap: 3px;
  }

  strong {
    font-size: 0.86rem;
  }

  small {
    font-size: 0.78rem;
    line-height: 1.4;
  }
`;

const Actions = styled.div`
  display: grid;
  gap: 10px;
  margin-top: 18px;
`;

const ActionButton = styled.button`
  width: 100%;
  min-height: 68px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 12px 14px;
  border-radius: 16px;
  text-align: left;
  cursor: pointer;
  transition:
    transform 0.16s ease,
    box-shadow 0.16s ease,
    border-color 0.16s ease;

  > svg {
    width: 21px;
    height: 21px;
  }

  > span {
    display: grid;
    gap: 3px;
  }

  strong {
    font-size: 0.92rem;
  }

  small {
    font-size: 0.75rem;
    line-height: 1.3;
  }

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.65;
    cursor: wait;
  }

  @media (max-width: 430px) {
    grid-template-columns: auto 1fr;
  }
`;

const PrimaryButton = styled(ActionButton)`
  border: 1px solid #c94d22;
  background: linear-gradient(135deg, #df5d32, #ca4b21);
  color: #fff;
  box-shadow: 0 10px 24px rgba(202, 75, 33, 0.2);

  small {
    color: #fff2ed;
  }

  &:hover:not(:disabled) {
    box-shadow: 0 13px 28px rgba(202, 75, 33, 0.28);
  }
`;

const SecondaryButton = styled(ActionButton)`
  grid-template-columns: auto 1fr;
  border: 1px solid #ded7d1;
  background: #fff;
  color: #3d3733;

  > svg {
    color: #7a7069;
  }

  small {
    color: #786f69;
  }

  &:hover:not(:disabled) {
    border-color: #c8bbb2;
    box-shadow: 0 8px 20px rgba(61, 45, 36, 0.08);
  }
`;

const Recommended = styled.em`
  padding: 5px 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  font-size: 0.66rem;
  font-style: normal;
  font-weight: 800;
  letter-spacing: 0.02em;

  @media (max-width: 430px) {
    display: none;
  }
`;

const Footnote = styled.p`
  margin: 16px 3px 0;
  color: #81766f;
  font-size: 0.72rem;
  line-height: 1.45;
`;
