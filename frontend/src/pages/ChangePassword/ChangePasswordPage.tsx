import { type FormEvent, useState } from 'react';
import { KeyRound, LogOut } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../Services/api';
import { useAuth } from '../../contexts/authContext';
import {
  evaluatePassword,
  PasswordRequirements,
  PRIVILEGED_PASSWORD_POLICY,
} from '../../features/password-policy';
import * as S from './styles';
import { buildAuthEntryUrl } from '../../shared/navigation/authNavigation';

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const loginPath = buildAuthEntryUrl('/login', searchParams);
  const { logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const passwordEvaluation = evaluatePassword(
    newPassword,
    confirmation,
    PRIVILEGED_PASSWORD_POLICY,
  );

  const leaveSession = () => {
    logout();
    navigate(loginPath, { replace: true });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHasAttemptedSubmit(true);
    setErrorMessage('');

    if (!currentPassword) {
      setErrorMessage('Informe a senha temporária atual.');
      return;
    }
    if (!passwordEvaluation.isValid) {
      setErrorMessage(passwordEvaluation.errors.join(' '));
      return;
    }

    try {
      setIsSubmitting(true);
      await api.put('/auth/password', {
        oldPassword: currentPassword,
        newPassword,
      });
      logout();
      toast.success('Senha alterada. Entre novamente com a nova senha.');
      navigate(loginPath, { replace: true });
    } catch (error) {
      const message =
        error?.response?.data?.error || 'Não foi possível alterar a senha. Tente novamente.';
      setErrorMessage(String(message));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <S.Page>
      <S.Card>
        <S.Icon aria-hidden="true">
          <KeyRound size={30} />
        </S.Icon>
        <S.Title>Crie sua senha definitiva</S.Title>
        <S.Description>
          Antes de acessar a plataforma, substitua a senha temporária do primeiro deploy. Sua sessão
          será encerrada ao concluir.
        </S.Description>

        <S.Form onSubmit={handleSubmit} noValidate aria-busy={isSubmitting}>
          <S.Field>
            Senha temporária atual
            <S.Input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              aria-invalid={hasAttemptedSubmit && !currentPassword}
              aria-describedby={
                hasAttemptedSubmit && !currentPassword ? 'change-password-error' : undefined
              }
              disabled={isSubmitting}
              required
            />
          </S.Field>

          <S.Field>
            Nova senha
            <S.Input
              type="password"
              autoComplete="new-password"
              minLength={PRIVILEGED_PASSWORD_POLICY.minLength}
              maxLength={PRIVILEGED_PASSWORD_POLICY.maxLength}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              aria-describedby="change-password-requirements"
              aria-invalid={
                (newPassword.length > 0 || hasAttemptedSubmit) &&
                passwordEvaluation.requirements.some(
                  (requirement) => requirement.id !== 'confirmation' && !requirement.met,
                )
              }
              disabled={isSubmitting}
              required
            />
          </S.Field>

          <S.Field>
            Confirmar nova senha
            <S.Input
              type="password"
              autoComplete="new-password"
              minLength={PRIVILEGED_PASSWORD_POLICY.minLength}
              maxLength={PRIVILEGED_PASSWORD_POLICY.maxLength}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              aria-describedby="change-password-requirements"
              aria-invalid={
                (confirmation.length > 0 || hasAttemptedSubmit) &&
                passwordEvaluation.requirements.some(
                  (requirement) => requirement.id === 'confirmation' && !requirement.met,
                )
              }
              disabled={isSubmitting}
              required
            />
          </S.Field>

          <PasswordRequirements
            id="change-password-requirements"
            password={newPassword}
            confirmation={confirmation}
            policy={PRIVILEGED_PASSWORD_POLICY}
          />

          {errorMessage ? (
            <S.ErrorMessage id="change-password-error" role="alert" aria-live="polite">
              {errorMessage}
            </S.ErrorMessage>
          ) : null}

          <S.Actions>
            <S.PrimaryButton type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
              {isSubmitting ? 'Alterando…' : 'Alterar senha e continuar'}
            </S.PrimaryButton>
            <S.SecondaryButton type="button" onClick={leaveSession} disabled={isSubmitting}>
              <LogOut size={17} aria-hidden="true" /> Sair
            </S.SecondaryButton>
          </S.Actions>
        </S.Form>
      </S.Card>
    </S.Page>
  );
}
