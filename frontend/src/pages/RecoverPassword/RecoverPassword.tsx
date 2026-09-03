import { useState } from 'react';
import { toast } from 'react-toastify';
import { ThemeProvider } from 'styled-components';
import { Moon, Sun } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import authService from '../../Services/authService';
import {
  evaluatePassword,
  PasswordRequirements,
  STANDARD_PASSWORD_POLICY,
} from '../../features/password-policy';
import * as S from './styles';
import { useRestaurantLoginBranding } from '../Login/hooks/useRestaurantLoginBranding';
import { TenantBrandHero } from '../Login/components/TenantBrandHero';
import {
  buildAuthEntryUrl,
  resolveAuthExperience,
} from '../../shared/navigation/authNavigation';

type ContactMethod = 'email' | 'phone';

export default function RecoverPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const branding = useRestaurantLoginBranding(searchParams);
  const authExperience = resolveAuthExperience(searchParams);
  const loginPath = buildAuthEntryUrl('/login', searchParams);
  const registerPath = buildAuthEntryUrl('/register', searchParams);
  const isTableContext = authExperience.context === 'TABLE';
  const tableLabel = authExperience.tableNumber ? `Mesa ${authExperience.tableNumber}` : 'sua mesa';
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [contactMethod, setContactMethod] = useState<ContactMethod>('phone');
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const passwordEvaluation = evaluatePassword(
    newPassword,
    confirmPassword,
    STANDARD_PASSWORD_POLICY,
  );
  const passwordHasError =
    newPassword.length > 0 &&
    passwordEvaluation.requirements.some(
      (requirement) => requirement.id !== 'confirmation' && !requirement.met,
    );
  const confirmationHasError =
    confirmPassword.length > 0 &&
    passwordEvaluation.requirements.some(
      (requirement) => requirement.id === 'confirmation' && !requirement.met,
    );

  const selectContactMethod = (method: ContactMethod) => {
    if (method === contactMethod) return;
    setContactMethod(method);
    setIdentifier('');
  };

  const changeContact = () => {
    setStep('request');
    setCode('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const buildIdentifierPayload = () => {
    const value = String(identifier || '').trim();

    if (contactMethod === 'phone') {
      return { phone: value };
    }

    return { email: value };
  };

  const handleRequestCode = async (event) => {
    event.preventDefault();

    if (!String(identifier || '').trim()) {
      toast.error('Informe o e-mail ou telefone.');
      return;
    }

    try {
      setIsLoading(true);
      const response = await authService.forgotPassword(buildIdentifierPayload());

      toast.success(
        response?.message ||
          'Se os dados informados existirem, enviamos um codigo para redefinir a senha.',
      );
      setStep('reset');
    } catch (error) {
      toast.error(
        error?.response?.data?.error || 'Nao foi possivel solicitar recuperacao de senha.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();

    if (!passwordEvaluation.isValid) {
      toast.error(passwordEvaluation.errors[0]);
      return;
    }

    try {
      setIsLoading(true);
      const response = await authService.resetPassword({
        ...buildIdentifierPayload(),
        code,
        newPassword,
        confirmPassword,
      });

      toast.success(
        response?.message ||
          (isTableContext
            ? `Senha redefinida. Entre para continuar na ${tableLabel}.`
            : 'Senha redefinida com sucesso. Faça login para continuar.'),
      );
      navigate(loginPath, { replace: true });
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Nao foi possivel redefinir a senha.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemeProvider
      theme={{
        ...(isDarkMode ? S.darkTheme : S.lightTheme),
        primary: branding.primaryColor,
        primaryHover: branding.primaryColor,
      }}
    >
      <S.Container data-auth-context={authExperience.context}>
        <S.TopBar>
          <S.ThemeToggleButton
            type="button"
            aria-label={isDarkMode ? 'Ativar tema claro' : 'Ativar tema escuro'}
            aria-pressed={isDarkMode}
            onClick={() => setIsDarkMode((prev) => !prev)}
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </S.ThemeToggleButton>
        </S.TopBar>

        <S.BannerSection
          $hasLogo={Boolean(branding.logoUrl)}
          data-has-cover={branding.logoUrl ? 'true' : 'false'}
        >
          <TenantBrandHero
            branding={branding}
            mode="recover"
            overrideText={
              isTableContext
                ? `Recupere seu acesso para voltar à ${tableLabel} sem perder o contexto do QR Code.`
                : null
            }
          />
        </S.BannerSection>

        <S.FormSection>
          <S.FormWrapper>
            <S.WelcomeText>
              {isTableContext ? `Recuperar acesso da ${tableLabel}` : 'Recuperar senha'}
            </S.WelcomeText>
            <S.FormSubtitle>
              {step === 'request'
                ? isTableContext
                  ? `Escolha e-mail ou telefone. Depois da redefinição você voltará ao login da ${tableLabel}.`
                  : 'Escolha e-mail ou telefone e receba um código para redefinir sua senha.'
                : 'Digite o código recebido e informe sua nova senha.'}
            </S.FormSubtitle>

            <S.Form onSubmit={step === 'request' ? handleRequestCode : handleResetPassword}>
              <S.SwitchRow role="group" aria-label="Método de recuperação">
                <S.SwitchButton
                  type="button"
                  $active={contactMethod === 'email'}
                  aria-pressed={contactMethod === 'email'}
                  disabled={step === 'reset'}
                  onClick={() => selectContactMethod('email')}
                >
                  E-mail
                </S.SwitchButton>
                <S.SwitchButton
                  type="button"
                  $active={contactMethod === 'phone'}
                  aria-pressed={contactMethod === 'phone'}
                  disabled={step === 'reset'}
                  onClick={() => selectContactMethod('phone')}
                >
                  Telefone
                </S.SwitchButton>
              </S.SwitchRow>

              <S.InputGroup>
                <S.Label htmlFor="identifier">
                  {contactMethod === 'email' ? 'E-mail' : 'Telefone'}
                </S.Label>
                <S.Input
                  id="identifier"
                  type={contactMethod === 'email' ? 'email' : 'text'}
                  inputMode={contactMethod === 'phone' ? 'tel' : undefined}
                  placeholder={contactMethod === 'email' ? 'exemplo@email.com' : '(11) 99999-9999'}
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  readOnly={step === 'reset'}
                  autoComplete={contactMethod === 'email' ? 'email' : 'tel'}
                  required
                />
              </S.InputGroup>

              {step === 'reset' && (
                <>
                  <S.AvailabilityNote role="status">
                    Código solicitado para {identifier}.
                  </S.AvailabilityNote>
                  <S.InputGroup>
                    <S.Label htmlFor="reset-code">Código</S.Label>
                    <S.Input
                      id="reset-code"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="Código de 6 dígitos"
                      value={code}
                      onChange={(event) =>
                        setCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                      }
                      required
                    />
                  </S.InputGroup>

                  <S.InputGroup>
                    <S.Label htmlFor="new-password">Nova senha</S.Label>
                    <S.Input
                      id="new-password"
                      type="password"
                      placeholder="Mínimo 8 caracteres"
                      autoComplete="new-password"
                      minLength={STANDARD_PASSWORD_POLICY.minLength}
                      maxLength={STANDARD_PASSWORD_POLICY.maxLength}
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      aria-invalid={passwordHasError}
                      aria-describedby="recover-password-requirements"
                      required
                    />
                  </S.InputGroup>

                  <S.InputGroup>
                    <S.Label htmlFor="confirm-password">Confirmar nova senha</S.Label>
                    <S.Input
                      id="confirm-password"
                      type="password"
                      placeholder="••••••••"
                      autoComplete="new-password"
                      minLength={STANDARD_PASSWORD_POLICY.minLength}
                      maxLength={STANDARD_PASSWORD_POLICY.maxLength}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      aria-invalid={confirmationHasError}
                      aria-describedby="recover-password-requirements"
                      required
                    />
                  </S.InputGroup>

                  <PasswordRequirements
                    id="recover-password-requirements"
                    password={newPassword}
                    confirmation={confirmPassword}
                    policy={STANDARD_PASSWORD_POLICY}
                  />
                </>
              )}

              <S.Button
                type="submit"
                disabled={
                  isLoading ||
                  (step === 'reset' && (code.length !== 6 || !passwordEvaluation.isValid))
                }
              >
                {isLoading
                  ? 'Processando...'
                  : step === 'request'
                    ? 'Enviar código'
                    : isTableContext
                      ? `Redefinir e voltar ao login da ${tableLabel}`
                      : 'Redefinir senha'}
              </S.Button>

              {step === 'reset' && (
                <S.ActionRow>
                  <S.SecondaryButton type="button" onClick={changeContact} disabled={isLoading}>
                    Alterar contato
                  </S.SecondaryButton>
                  <S.SecondaryButton type="button" onClick={handleRequestCode} disabled={isLoading}>
                    Reenviar código
                  </S.SecondaryButton>
                </S.ActionRow>
              )}
            </S.Form>

            <S.FooterRow>
              <S.BackLink to={loginPath}>Voltar para login</S.BackLink>
              <span>|</span>
              <S.BackLink to={registerPath}>Criar conta</S.BackLink>
            </S.FooterRow>
          </S.FormWrapper>
        </S.FormSection>
      </S.Container>
    </ThemeProvider>
  );
}
