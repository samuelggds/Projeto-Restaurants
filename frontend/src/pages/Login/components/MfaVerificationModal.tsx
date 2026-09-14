import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { AlertCircle, CheckCircle2, LoaderCircle, ShieldCheck, X } from 'lucide-react';
import * as S from './MfaVerificationModal.styles';

type VerificationState = 'idle' | 'error' | 'success';

type ResendResult = {
  destination?: string;
  resendAfterSeconds?: number;
};

type Props<T> = {
  open: boolean;
  destination?: string;
  resendAfterSeconds?: number;
  onVerify: (code: string) => Promise<T>;
  onResend: () => Promise<ResendResult>;
  onSuccess: (result: T) => void;
  onCancel: () => void;
};

function getErrorMessage(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: { data?: { error?: unknown } } }).response?.data?.error === 'string'
  ) {
    return (error as { response: { data: { error: string } } }).response.data.error;
  }

  if (error instanceof Error && error.message) return error.message;
  return 'Código inválido. Confira o código recebido e tente novamente.';
}

function isMobileOtpCapable() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return (
    navigator.maxTouchPoints > 0 &&
    window.matchMedia('(max-width: 767px) and (pointer: coarse)').matches
  );
}

function formatCountdown(seconds: number) {
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  const remainingSeconds = Math.max(0, seconds) % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

export function MfaVerificationModal<T>({
  open,
  destination = 'seu e-mail cadastrado',
  resendAfterSeconds = 60,
  onVerify,
  onResend,
  onSuccess,
  onCancel,
}: Props<T>) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const [state, setState] = useState<VerificationState>('idle');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(Math.max(0, resendAfterSeconds));
  const [mobileOtpCapable] = useState(() => isMobileOtpCapable());
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const code = digits.join('');

  useEffect(() => {
    if (!open) return undefined;
    const timeout = window.setTimeout(() => {
      setDigits(Array(6).fill(''));
      setState('idle');
      setMessage('');
      setSubmitting(false);
      setResending(false);
      setSecondsRemaining(Math.max(0, resendAfterSeconds));
      inputRefs.current[0]?.focus();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [open, resendAfterSeconds]);

  useEffect(() => {
    if (!open || secondsRemaining <= 0) return undefined;
    const timer = window.setInterval(() => {
      setSecondsRemaining((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [open, secondsRemaining]);

  const verifyCode = useCallback(
    async (verificationCode: string) => {
      if (submitting || state === 'success') return;
      if (verificationCode.length !== 6) {
        setState('error');
        setMessage('Digite os 6 números do código de verificação.');
        setShakeKey((current) => current + 1);
        inputRefs.current[Math.min(verificationCode.length, 5)]?.focus();
        return;
      }

      setSubmitting(true);
      setState('idle');
      setMessage('');

      try {
        const result = await onVerify(verificationCode);
        setState('success');
        setMessage('Código confirmado. Acesso liberado com segurança.');
        window.setTimeout(() => onSuccess(result), 520);
      } catch (error) {
        setState('error');
        setMessage(getErrorMessage(error));
        setShakeKey((current) => current + 1);
        setSubmitting(false);
        window.setTimeout(() => inputRefs.current[0]?.focus(), 40);
      }
    },
    [onSuccess, onVerify, state, submitting],
  );

  useEffect(() => {
    if (!open || !mobileOtpCapable || code.length !== 6 || submitting || state === 'success') {
      return undefined;
    }
    const timeout = window.setTimeout(() => {
      void verifyCode(code);
    }, 120);
    return () => window.clearTimeout(timeout);
  }, [code, mobileOtpCapable, open, state, submitting, verifyCode]);

  if (!open) return null;

  const assignDigits = (startIndex: number, rawValue: string) => {
    const incoming = rawValue.replace(/\D/gu, '').slice(0, 6);
    if (!incoming) return;

    setDigits((current) => {
      const next = [...current];
      incoming.split('').forEach((digit, offset) => {
        const targetIndex = startIndex + offset;
        if (targetIndex < 6) next[targetIndex] = digit;
      });
      return next;
    });
    setState('idle');
    setMessage('');
    const nextIndex = Math.min(5, startIndex + incoming.length);
    window.setTimeout(() => inputRefs.current[nextIndex]?.focus(), 0);
  };

  const handleChange = (index: number, value: string) => {
    const numeric = value.replace(/\D/gu, '');
    if (!numeric) {
      setDigits((current) =>
        current.map((digit, digitIndex) => (digitIndex === index ? '' : digit)),
      );
      if (state === 'error') {
        setState('idle');
        setMessage('');
      }
      return;
    }
    assignDigits(index, numeric);
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      event.preventDefault();
      setDigits((current) =>
        current.map((digit, digitIndex) => (digitIndex === index - 1 ? '' : digit)),
      );
      inputRefs.current[index - 1]?.focus();
      return;
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      inputRefs.current[index - 1]?.focus();
    }
    if (event.key === 'ArrowRight' && index < 5) {
      event.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (index: number, event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData('text').replace(/\D/gu, '').slice(0, 6);
    if (!pasted) return;
    event.preventDefault();
    assignDigits(index, pasted);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void verifyCode(code);
  };

  const handleResend = async () => {
    if (secondsRemaining > 0 || resending || submitting || state === 'success') return;
    setResending(true);
    setState('idle');
    setMessage('');
    try {
      const result = await onResend();
      setDigits(Array(6).fill(''));
      setSecondsRemaining(Math.max(1, Number(result.resendAfterSeconds ?? 60)));
      setMessage(`Novo código enviado para ${result.destination || destination}.`);
      window.setTimeout(() => inputRefs.current[0]?.focus(), 40);
    } catch (error) {
      const response = (error as {
        response?: { data?: { error?: string; retryAfterSeconds?: number } };
      })?.response;
      const retryAfter = Number(response?.data?.retryAfterSeconds || 0);
      if (retryAfter > 0) setSecondsRemaining(retryAfter);
      setState('error');
      setMessage(response?.data?.error || getErrorMessage(error));
      setShakeKey((current) => current + 1);
    } finally {
      setResending(false);
    }
  };

  return (
    <S.Backdrop role="presentation">
      <S.Dialog
        key={state === 'error' ? `mfa-error-${shakeKey}` : 'mfa-dialog'}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mfa-title mfa-legacy-title"
        aria-describedby="mfa-description"
        $state={state}
        $shake={state === 'error'}
      >
        <span id="mfa-legacy-title" hidden>
          Verificação em duas etapas
        </span>
        <S.Header>
          <S.TitleMarker aria-hidden="true" />
          <S.HeaderText>
            <span className="eyebrow">Segurança da conta</span>
            <h2 id="mfa-title">Autenticação de dois fatores</h2>
            <p id="mfa-description">
              Enviamos um código de 6 números para <strong>{destination}</strong>. Digite o código
              abaixo para concluir o acesso.
            </p>
          </S.HeaderText>
          <S.CloseButton
            type="button"
            onClick={onCancel}
            aria-label="Cancelar autenticação de dois fatores"
            disabled={submitting || resending || state === 'success'}
          >
            <X />
          </S.CloseButton>
        </S.Header>

        <form onSubmit={handleSubmit}>
          <S.CodeLabel>O código recebido foi:</S.CodeLabel>
          <span id="mfa-code-legacy-label" hidden>
            Código de verificação, dígito 1 do código
          </span>
          <S.CodeGrid aria-label="Código de verificação de seis dígitos">
            {digits.map((digit, index) => (
              <S.CodeCell
                key={index}
                ref={(element) => {
                  inputRefs.current[index] = element;
                }}
                aria-label={`Dígito ${index + 1} do código`}
                aria-labelledby={index === 0 ? 'mfa-code-legacy-label' : undefined}
                aria-invalid={state === 'error'}
                $state={state}
                $filled={Boolean(digit)}
                type="text"
                inputMode="numeric"
                autoComplete={mobileOtpCapable && index === 0 ? 'one-time-code' : 'off'}
                pattern="[0-9]*"
                maxLength={index === 0 ? 6 : 1}
                value={digit}
                onChange={(event) => handleChange(index, event.target.value)}
                onKeyDown={(event) => handleKeyDown(index, event)}
                onPaste={(event) => handlePaste(index, event)}
                onFocus={(event) => event.currentTarget.select()}
                disabled={submitting || state === 'success'}
              />
            ))}
          </S.CodeGrid>

          {message ? (
            <S.Feedback
              id="mfa-feedback"
              role={state === 'error' ? 'alert' : 'status'}
              aria-live={state === 'error' ? 'assertive' : 'polite'}
              $state={state}
            >
              {state === 'success' ? (
                <CheckCircle2 />
              ) : state === 'error' ? (
                <AlertCircle />
              ) : (
                <ShieldCheck />
              )}
              <span>{message}</span>
            </S.Feedback>
          ) : (
            <S.Hint>
              {mobileOtpCapable
                ? 'No celular, o código pode ser sugerido pelo sistema e será verificado quando os 6 dígitos forem preenchidos.'
                : 'No computador, digite os 6 números e clique em Verificar código.'}
            </S.Hint>
          )}

          <S.VerifyButton
            type="submit"
            disabled={submitting || resending || state === 'success' || code.length !== 6}
          >
            {submitting ? (
              <>
                <LoaderCircle className="spinner" /> Verificando...
              </>
            ) : state === 'success' ? (
              <>
                <CheckCircle2 /> Código correto
              </>
            ) : (
              'Verificar código'
            )}
          </S.VerifyButton>

          <S.ResendRow>
            <span>Não recebeu o código?</span>
            <S.ResendButton
              type="button"
              onClick={() => void handleResend()}
              disabled={secondsRemaining > 0 || resending || submitting || state === 'success'}
            >
              {resending ? 'Reenviando...' : 'Reenviar código'}
            </S.ResendButton>
            {secondsRemaining > 0 && (
              <S.Countdown aria-live="polite">{formatCountdown(secondsRemaining)}</S.Countdown>
            )}
          </S.ResendRow>
        </form>
      </S.Dialog>
    </S.Backdrop>
  );
}
