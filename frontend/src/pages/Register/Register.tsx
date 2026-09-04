import { type FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ThemeProvider } from 'styled-components';
import { LoaderCircle, Moon, Sun } from 'lucide-react';
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
import {
  getRestaurantCategoryLabel,
  getRestaurantLoginVisual,
} from '../../config/restaurantCategory';
import { getAccessibleBrandColor, getReadableTextColor } from '../Login/domain/loginBranding';

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const branding = useRestaurantLoginBranding(searchParams);
  const authExperience = resolveAuthExperience(searchParams);
  const loginPath = buildAuthEntryUrl('/login', searchParams);
  const isTableContext = authExperience.context === 'TABLE';
  const tableLabel = authExperience.tableNumber ? `Mesa ${authExperience.tableNumber}` : 'sua mesa';
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
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
  const categoryVisual = getRestaurantLoginVisual(branding.category);
  const categoryLabel = getRestaurantCategoryLabel(categoryVisual.category);
  const baseTheme = isDarkMode ? S.darkTheme : S.lightTheme;

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

      toast.success(
        isTableContext
          ? `Cadastro realizado! Entre para continuar na ${tableLabel}.`
          : 'Cadastro realizado com sucesso! Faça login para continuar.',
      );
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
        ...baseTheme,
        primary: branding.primaryColor,
        primaryHover: branding.primaryColor,
        primaryText: getReadableTextColor(branding.primaryColor),
        primaryReadable: getAccessibleBrandColor(branding.primaryColor, baseTheme.surface),
        categoryAccent: categoryVisual.accent,
        categoryAccentText: getReadableTextColor(categoryVisual.accent),
        categoryDeep: categoryVisual.deep,
      }}
    >
      <S.Container
        data-auth-context={authExperience.context}
        data-restaurant-category={categoryVisual.category}
      >
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

        <S.LoginBannerSection
          $hasLogo={Boolean(branding.logoUrl)}
          data-has-cover={branding.logoUrl ? 'true' : 'false'}
        >
          <TenantBrandHero
            branding={branding}
            mode="register"
            overrideText={
              isTableContext
                ? `Crie sua conta para continuar seu pedido na ${tableLabel}. A conta será a mesma usada no cardápio online.`
                : null
            }
          />
        </S.LoginBannerSection>

        <S.LoginFormSection>
          <S.LoginFormWrapper>
            <S.LoginAccessBadge>
              <span>{categoryLabel}</span>
            </S.LoginAccessBadge>
            <S.WelcomeText>
              {isTableContext ? `Criar conta para a ${tableLabel}` : 'Criar Conta'}
            </S.WelcomeText>
            <S.FormSubtitle>
              {isTableContext
                ? 'Depois do cadastro, entre com esta mesma conta para voltar exatamente à sua mesa.'
                : 'Preencha os campos abaixo para começar.'}
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
                ) : isTableContext ? (
                  `Criar conta e continuar na ${tableLabel}`
                ) : (
                  'Finalizar Cadastro'
                )}
              </S.Button>
            </S.Form>

            <S.RegisterText>
              Já possui uma conta? <Link to={loginPath}>Fazer Login</Link>
            </S.RegisterText>
          </S.LoginFormWrapper>
        </S.LoginFormSection>
      </S.Container>
    </ThemeProvider>
  );
}
