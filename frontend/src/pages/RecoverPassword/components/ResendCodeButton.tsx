import type { MouseEventHandler } from 'react';
import { Mail } from 'lucide-react';
import { RESEND_COOLDOWN_SECONDS } from '../hooks/useResendCooldown';
import * as S from './resendCodeButtonStyles';

type ResendCodeButtonProps = {
  remainingMilliseconds: number;
  deadline: number;
  isLoading: boolean;
  onClick: MouseEventHandler<HTMLButtonElement>;
};

export function ResendCodeButton({
  remainingMilliseconds,
  deadline,
  isLoading,
  onClick,
}: ResendCodeButtonProps) {
  const duration = RESEND_COOLDOWN_SECONDS * 1000;
  const remaining = Number.isFinite(remainingMilliseconds)
    ? Math.max(0, Math.min(duration, remainingMilliseconds))
    : duration;
  const seconds = Math.ceil(remaining / 1000);
  const coolingDown = remaining > 0;
  const offset = 100 * (1 - remaining / duration);

  return (
    <>
      <S.ResendButton
        type="button"
        onClick={onClick}
        disabled={isLoading || coolingDown}
        aria-busy={isLoading}
        aria-label={coolingDown ? `Reenviar em ${seconds} segundos` : 'Reenviar código'}
        data-cooling={coolingDown}
        data-testid="resend-code-button"
      >
        {coolingDown && (
          <S.Outline key={deadline} aria-hidden="true" focusable="false">
            <S.OutlineProgress
              x="1"
              y="1"
              rx="9"
              ry="9"
              pathLength="100"
              strokeDasharray="100"
              style={{ strokeDashoffset: String(offset) }}
              data-testid="resend-progress-outline"
            />
          </S.Outline>
        )}
        <S.ButtonContent aria-hidden="true">
          {coolingDown ? (
            <>
              <span>Reenviar em{' '}</span>
              <S.TimeBadge>{seconds}s</S.TimeBadge>
            </>
          ) : (
            <>
              <Mail size={16} aria-hidden="true" />
              <span>{isLoading ? 'Enviando...' : 'Reenviar código'}</span>
            </>
          )}
        </S.ButtonContent>
      </S.ResendButton>
      <S.ScreenReaderStatus role="status" aria-live="polite" aria-atomic="true">
        {coolingDown
          ? 'Aguarde o intervalo para reenviar o código.'
          : isLoading
            ? 'Solicitando novo código.'
            : 'O reenvio do código está disponível.'}
      </S.ScreenReaderStatus>
    </>
  );
}
