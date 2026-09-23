import { type FormEvent, useLayoutEffect, useMemo, useState } from 'react';
import { PasswordVisibilityField } from '../../components/PasswordVisibilityField/PasswordVisibilityField';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ThemeProvider } from 'styled-components';
import { ArrowRight, CheckCircle2, LoaderCircle, LockKeyhole, Mail, Moon, Phone, Sun, User } from 'lucide-react';
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
  getRememberedAuthReturnPath,
  getSafeAuthSearchParams,
  resolveAuthExperience,
} from '../../shared/navigation/authNavigation';
import {
  getRestaurantCategoryLabel,
  getRestaurantLoginVisual,
} from '../../config/restaurantCategory';
import { getAccessibleBrandColor, getReadableTextColor } from '../Login/domain/loginBranding';
import { getRestaurantSlugFromAuthPath } from '../Login/domain/loginPortal';

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const pathSlug = getRestaurantSlugFromAuthPath(location.pathname);
  const searchReference = searchParams.toString();
  const contextualSearchParams = useMemo(() => {
    const params = new URLSearchParams(searchReference);
    if (pathSlug) {
      if (!params.has('slug') && !params.has('restaurantSlug')) params.set('slug', pathSlug);
      if (!params.has('next')) {
        params.set('next', getRememberedAuthReturnPath(pathSlug) || `/${pathSlug}`);
      }
    }
    return params;
  }, [pathSlug, searchReference]);
  const canonicalSearch = getSafeAuthSearchParams(contextualSearchParams).toString();

  useLayoutEffect(() => {
    if (!pathSlug || searchParams.has('next') || !canonicalSearch) return;
    navigate(`/${pathSlug}/register?${canonicalSearch}`, { replace: true });
  }, [canonicalSearch, navigate, pathSlug, searchParams]);

  const branding = useRestaurantLoginBranding(contextualSearchParams);
  const authExperience = resolveAuthExperience(contextualSearchParams);
  const loginPath = pathSlug
    ? `/${pathSlug}/login${canonicalSearch ? `?${canonicalSearch}` : ''}`
    : buildAuthEntryUrl('/login', contextualSearchParams);
  const isTableContext = authExperience.context === 'TABLE';
  const tableLabel = authExperience.tableNumber ? `Mesa ${authExperience.tableNumber}` : 'sua mesa';
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [verificationPending, setVerificationPending] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
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
        phone: phone.trim(),
        restaurantSlug: pathSlug || undefined,
        password,
        confirmPassword,
      });

      setVerificationPending(true);
      toast.success('Cadastro criado. Confira seu e-mail para confirmar a conta.');
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
                : pathSlug
                  ? `Crie sua conta de cliente para pedir e acompanhar seus pedidos no ${branding.name}.`
                  : null
            }
          />
        </S.LoginBannerSection>

        <S.LoginFormSection>
          <S.LoginFormWrapper>
            <S.LoginAccessBadge>
              <span>{pathSlug ? `${branding.name} • cliente` : categoryLabel}</span>
            </S.LoginAccessBadge>
            <S.WelcomeText>
              {isTableContext
                ? `Criar conta para a ${tableLabel}`
                : pathSlug
                  ? 'Criar conta de cliente'
                  : 'Criar Conta'}
            </S.WelcomeText>
            <S.FormSubtitle>
              {isTableContext
                ? 'Depois do cadastro, entre com esta mesma conta para voltar exatamente à sua mesa.'
                : pathSlug
                  ? `Seu cadastro continuará vinculado à experiência de ${branding.name}.`
                  : 'Preencha os campos abaixo para começar.'}
            </S.FormSubtitle>

            {verificationPending ? (
              <S.VerificationNotice role="status" aria-live="polite">
                <CheckCircle2 aria-hidden="true" />
                <strong>Confira seu e-mail</strong>
                <p>
                  Enviamos um link de confirmação para <b>{email.trim()}</b>. Clique nele para
                  validar o endereço e liberar o login.
                </p>
                <p>Não recebeu? Verifique também a caixa de spam.</p>
                <button
                  type="button"
                  disabled={resendingVerification}
                  onClick={async () => {
                    try {
                      setResendingVerification(true);
                      await authService.resendEmailVerification({
                        email: email.trim(),
                        restaurantSlug: pathSlug || undefined,
                      });
                      toast.success('Se a conta estiver pendente, enviaremos uma nova confirmação.');
                    } catch {
                      toast.error('Não foi possível reenviar agora. Tente novamente mais tarde.');
                    } finally {
                      setResendingVerification(false);
                    }
                  }}
                >
                  {resendingVerification ? 'Reenviando...' : 'Reenviar e-mail de confirmação'}
                </button>
                <button type="button" onClick={() => navigate(loginPath)}>
                  Ir para o login
                </button>
              </S.VerificationNotice>
            ) : (
            <S.Form onSubmit={handleSubmit} aria-busy={isSubmitting}>
              <S.InputGroup>
                <S.Label htmlFor="name">Nome Completo</S.Label>
                <S.LoginInputField>
                  <S.LoginInputIcon aria-hidden="true">
                    <User />
                  </S.LoginInputIcon>
                  <PasswordVisibilityField label="senha">
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
                  </PasswordVisibilityField>
                </S.LoginInputField>
              </S.InputGroup>

              <S.InputGroup>
                <S.Label htmlFor="email">E-mail</S.Label>
                <S.LoginInputField>
                  <S.LoginInputIcon aria-hidden="true">
                    <Mail />
                  </S.LoginInputIcon>
                  <PasswordVisibilityField label="senha">
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
                  </PasswordVisibilityField>
                </S.LoginInputField>
              </S.InputGroup>

              <S.InputGroup>
                <S.Label htmlFor="phone">Telefone</S.Label>
                <S.LoginInputField>
                  <S.LoginInputIcon aria-hidden="true">
                    <Phone />
                  </S.LoginInputIcon>
                  <PasswordVisibilityField label="senha">
                    <S.Input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    placeholder="(85) 99999-9999"
                    autoComplete="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    disabled={isSubmitting}
                    required
                    />
                  </PasswordVisibilityField>
                </S.LoginInputField>
              </S.InputGroup>

              <S.InputGroup>
                <S.Label htmlFor="password">Senha</S.Label>
                <S.LoginInputField>
                  <S.LoginInputIcon aria-hidden="true">
                    <LockKeyhole />
                  </S.LoginInputIcon>
                  <PasswordVisibilityField label="senha">
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
                  </PasswordVisibilityField>
                </S.LoginInputField>
              </S.InputGroup>

              <S.InputGroup>
                <S.Label htmlFor="confirmPassword">Confirmar Senha</S.Label>
                <S.LoginInputField>
                  <S.LoginInputIcon aria-hidden="true">
                    <LockKeyhole />
                  </S.LoginInputIcon>
                  <PasswordVisibilityField label="senha">
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
                  </PasswordVisibilityField>
                </S.LoginInputField>
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
                  <>
                    <span>
                      {isTableContext
                        ? `Criar conta e continuar na ${tableLabel}`
                        : pathSlug
                          ? 'Criar conta de cliente'
                          : 'Finalizar Cadastro'}
                    </span>
                    <ArrowRight aria-hidden="true" />
                  </>
                )}
              </S.Button>
            </S.Form>
            )}

            <S.LoginRegisterText>
              Já possui uma conta? <Link to={loginPath}>Fazer Login</Link>
            </S.LoginRegisterText>
          </S.LoginFormWrapper>
        </S.LoginFormSection>
      </S.Container>
    </ThemeProvider>
  );
}
