import { useEffect, useId, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  Clock3,
  CreditCard,
  ReceiptText,
  RotateCcw,
  TimerOff,
  Utensils,
  WifiOff,
  X,
} from 'lucide-react';
import * as S from './PaymentResultView.styles';

export type PaymentResultStatus =
  'PAID' | 'FAILED' | 'CANCELED' | 'EXPIRED' | 'REFUNDED' | 'VERIFYING' | 'PENDING' | 'ERROR';

export interface PaymentResultAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export interface PaymentResultViewProps {
  status: PaymentResultStatus;
  method: string;
  restaurantName?: string;
  orderLabel?: string;
  amount?: string;
  description?: string;
  primaryAction?: PaymentResultAction;
  secondaryAction?: PaymentResultAction;
  onAutoReturn?: () => void;
  embedded?: boolean;
}

function AutoReturnNotice({ onReturn }: { onReturn: () => void }) {
  const [seconds, setSeconds] = useState(5);
  const onReturnRef = useRef(onReturn);

  useEffect(() => {
    onReturnRef.current = onReturn;
  }, [onReturn]);

  useEffect(() => {
    const deadline = Date.now() + 5_000;
    const interval = window.setInterval(() => {
      setSeconds(Math.max(1, Math.ceil((deadline - Date.now()) / 1_000)));
    }, 1_000);
    const timeout = window.setTimeout(() => {
      window.clearInterval(interval);
      onReturnRef.current();
    }, 5_000);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, []);

  return (
    <S.ReturnNotice aria-label="Retorno automático" aria-live="off">
      <span>
        Voltando ao cardápio em <b>{seconds}s</b>
      </span>
      <S.ReturnProgress aria-hidden="true">
        <span />
      </S.ReturnProgress>
    </S.ReturnNotice>
  );
}

function ResultMark({ success }: { success: boolean }) {
  return (
    <svg
      className={`result-mark lucide ${success ? 'lucide-check' : 'lucide-x'}`}
      width="56"
      height="56"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {success ? (
        <path d="M5 12l4 4L19 6" pathLength="1" />
      ) : (
        <>
          <path d="M6 6l12 12" pathLength="1" />
          <path d="M18 6L6 18" pathLength="1" />
        </>
      )}
    </svg>
  );
}

const content: Record<
  PaymentResultStatus,
  { title: string; badge: string; description: string; footnote: string; icon: typeof Check }
> = {
  PAID: {
    title: 'Pagamento confirmado!',
    badge: 'Tudo certo',
    description: 'Recebemos a confirmação do seu pagamento. Agora é só aproveitar!',
    footnote: 'Obrigado por escolher a gente. Bom apetite!',
    icon: Check,
  },
  FAILED: {
    title: 'Pagamento não concluído',
    badge: 'Pagamento falhou',
    description:
      'Não foi possível concluir este pagamento. Você pode tentar novamente ou escolher outra forma de pagar.',
    footnote: 'Se precisar de ajuda, fale com o restaurante.',
    icon: X,
  },
  CANCELED: {
    title: 'Pagamento não concluído',
    badge: 'Não concluído',
    description:
      'Este pagamento não foi concluído. Consulte seu pedido para ver os próximos passos.',
    footnote: 'Se precisar de ajuda, fale com o restaurante.',
    icon: X,
  },
  EXPIRED: {
    title: 'O prazo para pagar terminou',
    badge: 'Prazo encerrado',
    description:
      'O tempo disponível para este pagamento acabou. Volte ao pedido para escolher como deseja pagar.',
    footnote: 'Já pagou? Confira o status do pedido antes de tentar de novo.',
    icon: TimerOff,
  },
  REFUNDED: {
    title: 'Pagamento estornado',
    badge: 'Estorno registrado',
    description:
      'O estorno deste pagamento foi registrado. O prazo para o valor aparecer depende da sua instituição financeira.',
    footnote: 'Consulte sua conta ou fatura para acompanhar a devolução.',
    icon: RotateCcw,
  },
  VERIFYING: {
    title: 'Verificando pagamento',
    badge: 'Só um instante',
    description:
      'Estamos consultando seu pagamento. A confirmação aparecerá aqui assim que chegar.',
    footnote: 'Aguarde a confirmação antes de fazer outro pagamento.',
    icon: Clock3,
  },
  PENDING: {
    title: 'Aguardando confirmação',
    badge: 'Em andamento',
    description:
      'Seu pagamento ainda está sendo processado. Você pode verificar novamente em alguns instantes.',
    footnote: 'Já pagou? Aguarde a confirmação antes de tentar de novo.',
    icon: Clock3,
  },
  ERROR: {
    title: 'Não foi possível verificar',
    badge: 'Consulta indisponível',
    description:
      'Não conseguimos consultar seu pagamento agora. Isso não significa que ele foi recusado. Verifique novamente em instantes.',
    footnote: 'Confira o status antes de fazer outro pagamento.',
    icon: WifiOff,
  },
};

export function PaymentResultView({
  status,
  method,
  restaurantName,
  orderLabel,
  amount,
  description,
  primaryAction,
  secondaryAction,
  onAutoReturn,
  embedded = false,
}: PaymentResultViewProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const headingId = useId();
  const current = content[status];
  const StatusIcon = current.icon;
  const isCard = /cart[aã]o|card/i.test(method);
  const title =
    status === 'PAID' && /^pix$/i.test(method.trim()) ? 'Pix confirmado!' : current.title;
  const hasAnimatedResult = status === 'PAID' || status === 'FAILED' || status === 'CANCELED';

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [status]);

  return (
    <S.Page as={embedded ? 'div' : 'main'} $embedded={embedded} data-status={status}>
      <S.Panel $embedded={embedded} aria-labelledby={headingId}>
        <S.Header>
          <span aria-hidden="true">
            <Utensils size={19} />
          </span>
          <div>
            <small>Seu pagamento</small>
            <strong>{restaurantName || 'Acompanhe seu pagamento'}</strong>
          </div>
        </S.Header>
        <S.Body>
          <S.Status role="status" aria-live="polite" aria-atomic="true">
            <S.StatusSymbol key={status} aria-hidden="true">
              {hasAnimatedResult ? (
                <>
                  <svg className="result-ring" viewBox="0 0 112 112" fill="none">
                    <circle cx="56" cy="56" r="49" pathLength="1" />
                  </svg>
                  <ResultMark success={status === 'PAID'} />
                </>
              ) : (
                <StatusIcon size={56} strokeWidth={2.6} />
              )}
            </S.StatusSymbol>
            <S.Badge>{current.badge}</S.Badge>
            <S.Heading as={embedded ? 'h3' : 'h1'} id={headingId} ref={headingRef} tabIndex={-1}>
              {title}
            </S.Heading>
            <S.Description>{description || current.description}</S.Description>
          </S.Status>

          <S.Receipt aria-label="Detalhes do pagamento">
            {orderLabel && (
              <div>
                <dt>Referência</dt>
                <dd>{orderLabel}</dd>
              </div>
            )}
            <div>
              <dt>Forma de pagamento</dt>
              <dd className="method">
                {isCard ? (
                  <CreditCard size={16} aria-hidden="true" />
                ) : (
                  <ReceiptText size={16} aria-hidden="true" />
                )}
                {method}
              </dd>
            </div>
            {amount && (
              <div className="amount">
                <dt>
                  {status === 'PAID'
                    ? 'Valor pago'
                    : status === 'REFUNDED'
                      ? 'Valor estornado'
                      : 'Valor do pagamento'}
                </dt>
                <dd>{amount}</dd>
              </div>
            )}
          </S.Receipt>

          {(primaryAction || secondaryAction) && (
            <S.Actions>
              {primaryAction && (
                <S.Action
                  $primary
                  $success={status === 'PAID'}
                  type="button"
                  onClick={primaryAction.onClick}
                  disabled={primaryAction.disabled}
                >
                  {primaryAction.label}
                  <ArrowRight size={17} aria-hidden="true" />
                </S.Action>
              )}
              {secondaryAction && (
                <S.Action
                  type="button"
                  onClick={secondaryAction.onClick}
                  disabled={secondaryAction.disabled}
                >
                  {secondaryAction.label}
                </S.Action>
              )}
            </S.Actions>
          )}
          <S.Footnote>{current.footnote}</S.Footnote>
          {hasAnimatedResult && onAutoReturn && (
            <AutoReturnNotice key={status} onReturn={onAutoReturn} />
          )}
        </S.Body>
      </S.Panel>
    </S.Page>
  );
}
