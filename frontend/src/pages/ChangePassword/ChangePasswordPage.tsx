import { type FormEvent, useState } from 'react';
import { CheckCircle2, KeyRound, LockKeyhole, LogOut, ShieldCheck } from 'lucide-react';
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
  const { user, logout } = useAuth();
  const forcedChange = user?.mustChangePassword !== false;
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
      setErrorMessage(forcedChange ? 'Informe a senha temporária atual.' : 'Informe sua senha atual.');
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
      const requestError = error as { response?: { data?: { error?: string } } };
      const message =
        requestError?.response?.data?.error || 'Não foi possível alterar a senha. Tente novamente.';
      setErrorMessage(String(message));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <S.Page>
      <S.Shell>
        <S.Aside aria-label="Segurança GastroNexa">
          <S.Brand>
            <img src="/gastronexa-logo.svg" alt="" aria-hidden="true" />
            <span>Gastro<strong>Nexa</strong></span>
          </S.Brand>
          <div className="aside-copy">
            <span className="eyebrow">SEGURANÇA DA CONTA</span>
            <h2>Uma senha forte protege toda a sua operação.</h2>
            <p>
              Use uma senha exclusiva para o GastroNexa e evite repetir credenciais usadas em outros serviços.
            </p>
          </div>
          <div className="security-points">
            <span><ShieldCheck /> Política forte de senha</span>
            <span><LockKeyhole /> Sessão encerrada após a troca</span>
            <span><CheckCircle2 /> Alteração aplicada imediatamente</span>
          </div>
        </S.Aside>

        <S.Card>
          <S.Icon aria-hidden="true">
            <KeyRound size={27} />
          </S.Icon>
          <S.Eyebrow>{forcedChange ? 'PRIMEIRO ACESSO' : 'MINHA CONTA'}</S.Eyebrow>
          <S.Title>{forcedChange ? 'Crie sua senha definitiva' : 'Alterar senha de acesso'}</S.Title>
          <S.Description>
            {forcedChange
              ? 'Substitua a senha temporária por uma credencial pessoal antes de continuar. Sua sessão será encerrada ao concluir.'
              : 'Confirme sua senha atual e escolha uma nova credencial. Por segurança, você entrará novamente após a alteração.'}
          </S.Description>

          <S.Form onSubmit={handleSubmit} noValidate aria-busy={isSubmitting}>
            <S.Field>
              {forcedChange ? 'Senha temporária atual' : 'Senha atual'}
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

            <S.RequirementsCard>
              <PasswordRequirements
                id="change-password-requirements"
                password={newPassword}
                confirmation={confirmation}
                policy={PRIVILEGED_PASSWORD_POLICY}
              />
            </S.RequirementsCard>

            {errorMessage ? (
              <S.ErrorMessage id="change-password-error" role="alert" aria-live="polite">
                {errorMessage}
              </S.ErrorMessage>
            ) : null}

            <S.Actions>
              <S.PrimaryButton type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
                {isSubmitting ? 'Alterando…' : 'Salvar nova senha'}
              </S.PrimaryButton>
              <S.SecondaryButton type="button" onClick={leaveSession} disabled={isSubmitting}>
                <LogOut size={17} aria-hidden="true" /> Sair
              </S.SecondaryButton>
            </S.Actions>
          </S.Form>
        </S.Card>
      </S.Shell>
    </S.Page>
  );
}
