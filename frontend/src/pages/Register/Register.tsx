import { type FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ThemeProvider } from 'styled-components';
import { LoaderCircle, Moon, Sun, Utensils } from 'lucide-react';
import authService from '../../Services/authService';
import {
  evaluatePassword,
  PasswordRequirements,
  STANDARD_PASSWORD_POLICY,
} from '../../features/password-policy';
import * as S from './styles';
import { useRestaurantLoginBranding } from '../Login/hooks/useRestaurantLoginBranding';

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const branding = useRestaurantLoginBranding(searchParams);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const loginPath = `/login${searchParams.size ? `?${searchParams.toString()}` : ''}`;
  const passwordEvaluation = evaluatePassword(password, confirmPassword, STANDARD_PASSWORD_POLICY);
  const passwordHasError =
    password.length > 0 &&
    passwordEvaluation.requirements.some(
      (requirement) => requirement.id !== 'confirmation' && !requirement.met,
    );
  const confirmationHasError =
    confirmPassword.length > 0 &&
    passwordEvaluation.requirements.some(
      (requirement) => requirement.id === 'confirmation' && !requirement.met,
    );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    setErrorMessage('');

    if (!passwordEvaluation.isValid) {
      const message = passwordEvaluation.errors[0];
      setErrorMessage(message);
      toast.error(message);
      return;
    }

    try {
      setIsSubmitting(true);
      await authService.register({
        name: name.trim(),
        email: email.trim(),
        password,
        confirmPassword,
      });

      toast.success('Cadastro realizado com sucesso! Faça login para continuar.');
      navigate(loginPath);
    } catch (error) {
      const typed = error as {
        message?: string;
        response?: { data?: { error?: string; message?: string } };
      };
      const message =
        typed.response?.data?.error ||
        typed.response?.data?.message ||
        typed.message ||
        'Não foi possível concluir o cadastro. Tente novamente.';
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
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
      <S.Container>
        <S.TopBar>
          <S.ThemeToggleButton
            type="button"
            aria-label={isDarkMode ? 'Ativar tema claro' : 'Ativar tema escuro'}
            aria-pressed={isDarkMode}
            onClick={() => setIsDarkMode(!isDarkMode)}
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </S.ThemeToggleButton>
        </S.TopBar>

        <S.BannerSection
          $hasLogo={Boolean(branding.logoUrl)}
          data-has-cover={branding.logoUrl ? 'true' : 'false'}
        >
          <S.BrandTitle>
            {branding.logoUrl ? (
              <S.RestaurantLogo src={branding.logoUrl} alt={`Logo ${branding.name}`} />
            ) : (
              <Utensils size={32} strokeWidth={2.5} />
            )}
            <span>{branding.name}</span>
          </S.BrandTitle>
          <S.BrandSubtitle>
            Crie sua conta em poucos segundos e tenha acesso completo ao nosso cardápio, histórico
            de pedidos na mesa e benefícios exclusivos de fidelidade.
          </S.BrandSubtitle>
        </S.BannerSection>

        <S.FormSection>
          <S.FormWrapper>
            <S.WelcomeText>Criar Conta</S.WelcomeText>
            <S.FormSubtitle>
              Preencha os campos abaixo de maneira rápida para começar.
            </S.FormSubtitle>

            <S.Form onSubmit={handleSubmit} aria-busy={isSubmitting}>
              <S.InputGroup>
                <S.Label htmlFor="name">Nome Completo</S.Label>
                <S.Input
                  id="name"
                  type="text"
                  placeholder="Seu nome completo"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </S.InputGroup>

              <S.InputGroup>
                <S.Label htmlFor="email">E-mail</S.Label>
                <S.Input
                  id="email"
                  type="email"
                  placeholder="exemplo@email.com"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </S.InputGroup>

              <S.InputGroup>
                <S.Label htmlFor="password">Senha</S.Label>
                <S.Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  minLength={STANDARD_PASSWORD_POLICY.minLength}
                  maxLength={STANDARD_PASSWORD_POLICY.maxLength}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-invalid={passwordHasError}
                  aria-describedby="register-password-requirements"
                  disabled={isSubmitting}
                  required
                />
              </S.InputGroup>

              <S.InputGroup>
                <S.Label htmlFor="confirmPassword">Confirmar Senha</S.Label>
                <S.Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repita sua senha"
                  autoComplete="new-password"
                  minLength={STANDARD_PASSWORD_POLICY.minLength}
                  maxLength={STANDARD_PASSWORD_POLICY.maxLength}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  aria-invalid={confirmationHasError}
                  aria-describedby="register-password-requirements"
                  disabled={isSubmitting}
                  required
                />
              </S.InputGroup>

              <PasswordRequirements
                id="register-password-requirements"
                password={password}
                confirmation={confirmPassword}
                policy={STANDARD_PASSWORD_POLICY}
              />

              {errorMessage ? (
                <S.FormError role="alert" aria-live="polite">
                  {errorMessage}
                </S.FormError>
              ) : null}

              <S.Button
                type="submit"
                disabled={!passwordEvaluation.isValid || isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <LoaderCircle className="loading-icon" aria-hidden="true" /> Finalizando...
                  </>
                ) : (
                  'Finalizar Cadastro'
                )}
              </S.Button>
            </S.Form>

            <S.RegisterText>
              Já possui uma conta? <Link to={loginPath}>Fazer Login</Link>
            </S.RegisterText>
          </S.FormWrapper>
        </S.FormSection>
      </S.Container>
    </ThemeProvider>
  );
}
