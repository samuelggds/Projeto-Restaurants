import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, LoaderCircle, ShieldCheck, X } from 'lucide-react';
import * as S from './MfaVerificationModal.styles';

type VerificationState = 'idle' | 'error' | 'success';

type Props<T> = {
  open: boolean;
  onVerify: (code: string) => Promise<T>;
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

export function MfaVerificationModal<T>({ open, onVerify, onSuccess, onCancel }: Props<T>) {
  const [code, setCode] = useState('');
  const [state, setState] = useState<VerificationState>('idle');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setCode('');
    setState('idle');
    setMessage('');
    setSubmitting(false);
    const timeout = window.setTimeout(() => inputRef.current?.focus(), 40);
    return () => window.clearTimeout(timeout);
  }, [open]);

  const normalizedCode = useMemo(() => code.replace(/\D/gu, '').slice(0, 6), [code]);

  if (!open) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    if (normalizedCode.length !== 6) {
      setState('error');
      setMessage('Digite os 6 números do código de verificação.');
      setShakeKey((current) => current + 1);
      inputRef.current?.focus();
      return;
    }

    setSubmitting(true);
    setState('idle');
    setMessage('');

    try {
      const result = await onVerify(normalizedCode);
      setState('success');
      setMessage('Código confirmado. Acesso liberado com segurança.');
      window.setTimeout(() => onSuccess(result), 520);
    } catch (error) {
      setState('error');
      setMessage(getErrorMessage(error));
      setShakeKey((current) => current + 1);
      setSubmitting(false);
      window.setTimeout(() => inputRef.current?.focus(), 40);
    }
  };

  return (
    <S.Backdrop role="presentation">
      <S.Dialog
        key={state === 'error' ? `mfa-error-${shakeKey}` : 'mfa-dialog'}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mfa-title"
        aria-describedby="mfa-description"
        $state={state}
        $shake={state === 'error'}
      >
        <S.Header>
          <S.Icon $state={state} aria-hidden="true">
            {state === 'success' ? <CheckCircle2 /> : state === 'error' ? <AlertCircle /> : <ShieldCheck />}
          </S.Icon>
          <S.HeaderText>
            <h2 id="mfa-title">Verificação em duas etapas</h2>
            <p id="mfa-description">
              Digite o código de 6 números enviado para o seu e-mail. Se errar, você pode tentar
              novamente aqui mesmo sem gerar outro código.
            </p>
          </S.HeaderText>
          <S.CloseButton
            type="button"
            onClick={onCancel}
            aria-label="Cancelar verificação em duas etapas"
            disabled={submitting || state === 'success'}
          >
            <X />
          </S.CloseButton>
        </S.Header>

        <form onSubmit={handleSubmit}>
          <S.CodeLabel htmlFor="mfa-code">Código de verificação</S.CodeLabel>
          <S.CodeInput
            ref={inputRef}
            id="mfa-code"
            name="mfa-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            value={normalizedCode}
            onChange={(event) => {
              setCode(event.target.value);
              if (state === 'error') {
                setState('idle');
                setMessage('');
              }
            }}
            placeholder="000000"
            aria-invalid={state === 'error'}
            aria-describedby={message ? 'mfa-feedback' : undefined}
            disabled={submitting || state === 'success'}
          />

          {message ? (
            <S.Feedback
              id="mfa-feedback"
              role={state === 'error' ? 'alert' : 'status'}
              aria-live={state === 'error' ? 'assertive' : 'polite'}
              $state={state}
            >
              {state === 'success' ? <CheckCircle2 /> : <AlertCircle />}
              <span>{message}</span>
            </S.Feedback>
          ) : (
            <S.Hint>O mesmo código continua válido enquanto estiver dentro do prazo.</S.Hint>
          )}

          <S.Actions>
            <S.CancelButton
              type="button"
              onClick={onCancel}
              disabled={submitting || state === 'success'}
            >
              Cancelar
            </S.CancelButton>
            <S.VerifyButton type="submit" disabled={submitting || state === 'success'}>
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
          </S.Actions>
        </form>
      </S.Dialog>
    </S.Backdrop>
  );
}
