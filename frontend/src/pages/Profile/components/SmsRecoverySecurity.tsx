import { useState } from 'react';
import { Smartphone } from 'lucide-react';
import * as S from '../Profile.styles';
import type { ProfilePageProps } from '../types';

type Props = Pick<
  ProfilePageProps,
  | 'smsRecoveryAvailable'
  | 'smsRecoveryEnabled'
  | 'smsRecoveryDestination'
  | 'onRequestSmsRecoveryVerification'
  | 'onConfirmSmsRecoveryVerification'
> & {
  onError: (message: string) => void;
};

export function SmsRecoverySecurity({
  smsRecoveryAvailable = false,
  smsRecoveryEnabled = false,
  smsRecoveryDestination,
  onRequestSmsRecoveryVerification,
  onConfirmSmsRecoveryVerification,
  onError,
}: Props) {
  const [password, setPassword] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [destination, setDestination] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function requestVerification() {
    if (!smsRecoveryAvailable) {
      onError('A recuperação por SMS ainda não está disponível.');
      return;
    }
    if (!password) {
      onError('Confirme sua senha atual para verificar o telefone.');
      return;
    }

    setLoading(true);
    onError('');
    try {
      const result = await onRequestSmsRecoveryVerification?.(password);
      if (!result?.challengeId) throw new Error('Sessão de verificação não encontrada.');
      setChallengeId(result.challengeId);
      setDestination(result.destination || smsRecoveryDestination || '');
      setCode('');
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Não foi possível enviar o código por SMS.');
    } finally {
      setLoading(false);
    }
  }

  async function confirmVerification() {
    if (!challengeId || !/^\d{6}$/u.test(code)) {
      onError('Informe o código de 6 dígitos recebido por SMS.');
      return;
    }

    setLoading(true);
    onError('');
    try {
      await onConfirmSmsRecoveryVerification?.(challengeId, code);
      setChallengeId('');
      setCode('');
      setPassword('');
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Código inválido ou expirado.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="security-row">
        <i>
          <Smartphone />
        </i>
        <div>
          <b>Recuperação por SMS</b>
          <span>
            {smsRecoveryEnabled
              ? 'Ativa: este telefone pode receber códigos de recuperação'
              : smsRecoveryAvailable
                ? 'Opcional: confirme seu telefone uma vez para habilitar recuperação por SMS'
                : 'Ainda não configurada pela plataforma'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => void requestVerification()}
          disabled={smsRecoveryEnabled || !smsRecoveryAvailable || loading || !password}
        >
          {smsRecoveryEnabled ? 'Ativada' : loading ? 'Enviando...' : 'Verificar telefone'}
        </button>
      </div>

      {!smsRecoveryEnabled && smsRecoveryAvailable ? (
        <S.SettingsForm
          onSubmit={(event) => {
            event.preventDefault();
            void (challengeId ? confirmVerification() : requestVerification());
          }}
        >
          {!challengeId ? (
            <label>
              Senha atual para verificar o telefone cadastrado
              <input
                type="password"
                autoComplete="current-password"
                maxLength={128}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={loading}
                required
              />
            </label>
          ) : (
            <>
              <label>
                Código enviado para {destination || 'seu telefone'}
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/gu, '').slice(0, 6))}
                  disabled={loading}
                  required
                />
              </label>
              <footer>
                <button type="submit" disabled={loading || code.length !== 6}>
                  {loading ? 'Verificando...' : 'Confirmar telefone'}
                </button>
              </footer>
            </>
          )}
        </S.SettingsForm>
      ) : null}
    </>
  );
}
