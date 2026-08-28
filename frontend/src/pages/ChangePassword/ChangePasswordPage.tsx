import { type FormEvent, useState } from 'react';
import { KeyRound, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../Services/api';
import { useAuth } from '../../contexts/authContext';
import { validatePrivilegedPassword } from './domain/passwordChangePolicy';
import * as S from './styles';

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const leaveSession = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');

    if (!currentPassword) {
      setErrorMessage('Informe a senha temporária atual.');
      return;
    }
    if (newPassword !== confirmation) {
      setErrorMessage('A confirmação não corresponde à nova senha.');
      return;
    }

    const policyErrors = validatePrivilegedPassword(newPassword);
    if (policyErrors.length) {
      setErrorMessage(policyErrors.join(' '));
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
      navigate('/login', { replace: true });
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
          Antes de acessar a plataforma, substitua a senha temporária do primeiro deploy. Sua
          sessão será encerrada ao concluir.
        </S.Description>

        <S.Form onSubmit={handleSubmit} noValidate>
          <S.Field>
            Senha temporária atual
            <S.Input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              disabled={isSubmitting}
            />
          </S.Field>

          <S.Field>
            Nova senha
            <S.Input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              disabled={isSubmitting}
            />
          </S.Field>

          <S.Field>
            Confirmar nova senha
            <S.Input
              type="password"
              autoComplete="new-password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              disabled={isSubmitting}
            />
          </S.Field>

          <S.Policy>
            Use 16 ou mais caracteres, com maiúscula, minúscula, número e símbolo. O limite
            técnico é 72 bytes.
          </S.Policy>

          {errorMessage ? (
            <S.ErrorMessage role="alert" aria-live="polite">
              {errorMessage}
            </S.ErrorMessage>
          ) : null}

          <S.Actions>
            <S.PrimaryButton type="submit" disabled={isSubmitting}>
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
