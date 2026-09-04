import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import {
  CheckCircle2,
  AlertCircle,
  Sun,
  Moon,
  Eye,
  EyeOff,
  Mail,
  LockKeyhole,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import authService from '../../Services/authService';
import { useAuth } from '../../contexts/authContext.js';
import * as S from './styles';
import { useAppDialog } from '../../components/AppDialog/context';
import { useRestaurantLoginBranding } from './hooks/useRestaurantLoginBranding';
import { TenantBrandHero } from './components/TenantBrandHero';
import { canUseTechnicalAccess, TECHNICAL_ACCESS_DENIED_MESSAGE } from './technicalAccess';
import {
  buildAuthEntryUrl,
  getSafeNextPath,
  resolveAuthExperience,
} from '../../shared/navigation/authNavigation';
import { getRoleHome } from '../../routes/routeAuthorization';
import {
  getRestaurantCategoryLabel,
  getRestaurantLoginVisual,
} from '../../config/restaurantCategory';
import { getAccessibleBrandColor, getReadableTextColor } from './domain/loginBranding';
import { verifyAdminPortalGrant } from './domain/adminPortalSession';
import {
  canUseLoginPortal,
  getLoginPortalAccessError,
  getRestaurantSlugFromAuthPath,
  resolveLoginPortal,
} from './domain/loginPortal';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const portal = resolveLoginPortal(location.pathname);
  const portalSlug = getRestaurantSlugFromAuthPath(location.pathname);
  const searchReference = searchParams.toString();
  const contextualSearchParams = useMemo(() => {
    const params = new URLSearchParams(searchReference);
    if (portalSlug) {
      if (!params.has('slug') && !params.has('restaurantSlug')) params.set('slug', portalSlug);
      if (!params.has('next') && portal === 'CUSTOMER') params.set('next', `/${portalSlug}`);
    }
    return params;
  }, [portal, portalSlug, searchReference]);

  const isTechnicalAccess = portal === 'SUPER_ADMIN';
  const isAdminAccess = portal === 'ADMIN';
  const isStaffAccess = portal === 'STAFF';
  const isCustomerAccess = portal === 'CUSTOMER';
  const branding = useRestaurantLoginBranding(contextualSearchParams);
  const safeNextPath = getSafeNextPath(contextualSearchParams.get('next'));
  const authExperience = resolveAuthExperience(contextualSearchParams);
  const contextualRegisterPath = buildAuthEntryUrl('/register', contextualSearchParams);
  const registerPath =
    isCustomerAccess && portalSlug
      ? contextualRegisterPath.replace(/^\/register/u, `/${portalSlug}/register`)
      : contextualRegisterPath;
  const recoverPasswordPath = buildAuthEntryUrl('/recover-password', contextualSearchParams);
  const changePasswordPath = buildAuthEntryUrl('/change-password', contextualSearchParams);
  const isTableContext = !isTechnicalAccess && authExperience.context === 'TABLE';
  const showCustomerSelfService =
    !isTechnicalAccess && !isAdminAccess && !isStaffAccess && (isCustomerAccess || portal === 'GENERIC');
  const { login } = useAuth();
  const { promptDialog } = useAppDialog();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [googleStatus, setGoogleStatus] = useState('loading');
  const [googleMessage, setGoogleMessage] = useState('');
  const googleButtonRef = useRef(null);
  const isGoogleMountedRef = useRef(false);
  const googleInitInFlightRef = useRef(false);
  const googleInitializedRef = useRef(false);
  const googleInitializedClientIdRef = useRef('');

  const loadGoogleScript = useCallback(() => {
    if (window.google?.accounts?.id) {
      return Promise.resolve();
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]',
    );

    if (existingScript) {
      if (existingScript.dataset.loaded === 'true') {
        return Promise.resolve();
      }

      return new Promise<void>((resolve, reject) => {
        const handleLoad = () => {
          existingScript.dataset.loaded = 'true';
          existingScript.removeEventListener('load', handleLoad);
          existingScript.removeEventListener('error', handleError);
          resolve();
        };

        const handleError = () => {
          existingScript.removeEventListener('load', handleLoad);
          existingScript.removeEventListener('error', handleError);
          reject(new Error('script-error'));
        };

        existingScript.addEventListener('load', handleLoad);
        existingScript.addEventListener('error', handleError);
      });
    }

    return new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        script.dataset.loaded = 'true';
        resolve();
      };
      script.onerror = () => reject(new Error('script-error'));
      document.head.appendChild(script);
    });
  }, []);

  const getGoogleClientId = useCallback(async () => {
    const localClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (localClientId) {
      return localClientId;
    }

    return authService.getGoogleClientId();
  }, []);

  const redirectByRole = useCallback(
    (user) => {
      if (user?.role === 'CLIENTE') {
        if (user?.mustChangePassword === true) {
          navigate(changePasswordPath);
          return;
        }

        if (safeNextPath) {
          navigate(safeNextPath);
          return;
        }
      }

      navigate(getRoleHome(user));
    },
    [changePasswordPath, navigate, safeNextPath],
  );
  const latestRedirectByRoleRef = useRef(redirectByRole);

  useEffect(() => {
    latestRedirectByRoleRef.current = redirectByRole;
  }, [redirectByRole]);

  const completeLoginWithMfaIfNeeded = useCallback(
    async (authResponse) => {
      if (!authResponse?.mfaRequired) {
        return authResponse;
      }

      const code = await promptDialog({
        title: 'Verificação em duas etapas',
        description: 'Digite o código de segurança enviado para o seu e-mail.',
        inputLabel: 'Código de verificação',
        placeholder: '000000',
        confirmLabel: 'Verificar',
      });

      if (!code || !String(code).trim()) {
        throw new Error('Codigo 2FA nao informado.');
      }

      return authService.verifyLogin2fa({
        mfaToken: authResponse.mfaToken,
        code: String(code).trim(),
      });
    },
    [promptDialog],
  );

  const validatePortalAccess = useCallback(
    async (authResponse) => {
      if (isTechnicalAccess && !canUseTechnicalAccess(authResponse?.user)) {
        await authService.logout(authResponse?.token).catch(() => undefined);
        throw new Error(TECHNICAL_ACCESS_DENIED_MESSAGE);
      }

      if (!canUseLoginPortal(portal, authResponse?.user)) {
        await authService.logout(authResponse?.token).catch(() => undefined);
        throw new Error(getLoginPortalAccessError(portal));
      }

      if (isAdminAccess) {
        const grantContext = await verifyAdminPortalGrant(portalSlug);
        const userRestaurantId = Number(authResponse?.user?.restaurantId || 0);
        if (
          !grantContext.valid ||
          grantContext.slug !== portalSlug ||
          !Number.isInteger(userRestaurantId) ||
          userRestaurantId !== grantContext.restaurantId
        ) {
          await authService.logout(authResponse?.token).catch(() => undefined);
          throw new Error('Esta conta administrativa não pertence a este restaurante.');
        }
      }

      return authResponse;
    },
    [isAdminAccess, isTechnicalAccess, portal, portalSlug],
  );

  const initializeGoogleLogin = useCallback(async () => {
    if (!showCustomerSelfService || googleInitInFlightRef.current) {
      return;
    }

    googleInitInFlightRef.current = true;
    setGoogleStatus('loading');
    setGoogleMessage('');
    let resolvedGoogleClientId = '';

    try {
      const [googleClientId] = await Promise.all([getGoogleClientId(), loadGoogleScript()]);
      resolvedGoogleClientId = String(googleClientId || '');

      if (!googleClientId) {
        throw new Error('missing-client-id');
      }

      if (!isGoogleMountedRef.current || !googleButtonRef.current) {
        return;
      }

      if (!window.google?.accounts?.id) {
        throw new Error('google-api-unavailable');
      }

      const normalizedClientId = String(googleClientId).trim();
      if (
        !googleInitializedRef.current ||
        googleInitializedClientIdRef.current !== normalizedClientId
      ) {
        window.google.accounts.id.initialize({
          client_id: normalizedClientId,
          callback: async (response) => {
            try {
              const firstStep = await authService.loginWithGoogle(response.credential);
              const withMfa = await completeLoginWithMfaIfNeeded(firstStep);
              const authResponse = await validatePortalAccess(withMfa);

              setFeedback({ type: 'success', message: 'Login realizado com sucesso!' });
              setTimeout(() => {
                login(authResponse.user, authResponse.token);
                latestRedirectByRoleRef.current(authResponse.user);
              }, 700);
            } catch (error) {
              const message =
                error?.response?.data?.error ||
                (error instanceof Error ? error.message : 'Erro ao autenticar com Google');
              setFeedback({ type: 'error', message });
            }
          },
        });

        googleInitializedRef.current = true;
        googleInitializedClientIdRef.current = normalizedClientId;
      }

      googleButtonRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        type: 'standard',
        shape: 'pill',
        theme: isDarkMode ? 'filled_black' : 'outline',
        text: 'continue_with',
        size: 'large',
        width: 320,
      });

      setGoogleStatus('ready');
    } catch {
      if (isGoogleMountedRef.current) {
        const origin = window.location.origin;
        setGoogleStatus('error');
        setGoogleMessage(
          `Nao foi possivel carregar o login com Google. No Google Cloud Console, adicione o origin ${origin} em Authorized JavaScript origins para o client id ${resolvedGoogleClientId || 'configurado'}.`,
        );
      }
    } finally {
      googleInitInFlightRef.current = false;
    }
  }, [
    completeLoginWithMfaIfNeeded,
    getGoogleClientId,
    isDarkMode,
    loadGoogleScript,
    login,
    showCustomerSelfService,
    validatePortalAccess,
  ]);

  useEffect(() => {
    if (!showCustomerSelfService) return;
    isGoogleMountedRef.current = true;

    const timeoutId = setTimeout(() => {
      initializeGoogleLogin();
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      isGoogleMountedRef.current = false;
    };
  }, [initializeGoogleLogin, showCustomerSelfService]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback(null);
    setIsLoading(true);
    try {
      const firstStep = await authService.login({ email, password });
      const withMfa = await completeLoginWithMfaIfNeeded(firstStep);
      const response = await validatePortalAccess(withMfa);

      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      setFeedback({ type: 'success', message: 'Login realizado com sucesso!' });
      setTimeout(() => {
        login(response.user, response.token);
        latestRedirectByRoleRef.current(response.user);
      }, 700);
    } catch (error) {
      const message =
        error?.response?.data?.error ||
        (error?.request
          ? 'Sem conexão com o servidor. Verifique se backend/frontend estão na mesma rede e tente novamente.'
          : error instanceof Error
            ? error.message
            : 'E-mail ou senha incorretos.');
      setFeedback({ type: 'error', message });
    } finally {
      setIsLoading(false);
    }
  };

  const hasCover = Boolean(branding.logoUrl);
  const tableLabel = authExperience.tableNumber ? `Mesa ${authExperience.tableNumber}` : 'sua mesa';
  const categoryVisual = getRestaurantLoginVisual(branding.category);
  const categoryLabel = getRestaurantCategoryLabel(categoryVisual.category);
  const baseTheme = isDarkMode ? S.darkTheme : S.lightTheme;
  const submitLabel = isTechnicalAccess
    ? 'Entrar no Super Admin'
    : isAdminAccess
      ? 'Entrar no painel administrativo'
      : isStaffAccess
        ? 'Entrar na área da equipe'
        : isTableContext
          ? `Entrar e continuar na ${tableLabel}`
          : isCustomerAccess
            ? 'Entrar como cliente'
            : 'Entrar no Sistema';
  const accessLabel = isTechnicalAccess
    ? 'Canal técnico protegido'
    : isAdminAccess
      ? 'ADMIN'
      : isStaffAccess
        ? `${branding.name} • área da equipe`
        : isTableContext
          ? `Atendimento da ${tableLabel}`
          : isCustomerAccess
            ? `${branding.name} • acesso do cliente`
            : `${categoryLabel} • acesso protegido`;
  const heroContextLabel = isTechnicalAccess
    ? 'Operação segura da plataforma'
    : isAdminAccess
      ? 'ADMIN'
      : isStaffAccess
        ? 'Acesso da equipe'
        : isTableContext
          ? `${tableLabel} • acesso seguro`
          : isCustomerAccess
            ? 'Área do cliente'
            : null;
  const heroOverrideText = isTechnicalAccess
    ? 'Canal reservado para suporte, monitoramento e manutenção segura da plataforma.'
    : isAdminAccess
      ? 'Acesso administrativo privado deste restaurante. Entre somente com a conta ADMIN vinculada a este tenant.'
      : isStaffAccess
        ? 'Entre com sua conta de funcionário. Sua função define automaticamente o painel operacional correto.'
        : isTableContext
          ? `Você está entrando para continuar o atendimento da ${tableLabel}.`
          : isCustomerAccess
            ? `Entre para continuar no cardápio e nos pedidos de ${branding.name}.`
            : null;
  const welcomeText = isTechnicalAccess
    ? 'Acesso técnico'
    : isAdminAccess
      ? 'ADMIN'
      : isStaffAccess
        ? 'Acesso da equipe'
        : isTableContext
          ? `Continuar na ${tableLabel}`
          : isCustomerAccess
            ? 'Bem-vindo de volta!'
            : 'Bem-vindo!';
  const formSubtitle = isTechnicalAccess
    ? 'Entre com a conta exclusiva de Super Admin para administrar a plataforma.'
    : isAdminAccess
      ? `Entre com a conta ADMIN vinculada ao ${branding.name}.`
      : isStaffAccess
        ? 'Use sua conta de garçom, cozinha, atendente ou motoqueiro.'
        : isTableContext
          ? 'Entre com a mesma conta de cliente que você usa no cardápio online.'
          : isCustomerAccess
            ? `Acesse sua conta para continuar no ${branding.name}.`
            : `Acesse sua conta para continuar no ${branding.name}.`;

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
        data-testid="login-layout"
        data-auth-context={authExperience.context}
        data-auth-portal={portal.toLowerCase()}
        data-restaurant-category={categoryVisual.category}
      >
        <S.TopBar>
          <S.ThemeToggleButton
            type="button"
            aria-label={isDarkMode ? 'Ativar modo claro' : 'Ativar modo escuro'}
            aria-pressed={isDarkMode}
            onClick={() => setIsDarkMode(!isDarkMode)}
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </S.ThemeToggleButton>
        </S.TopBar>

        <S.LoginBannerSection
          $hasLogo={hasCover}
          data-testid="login-cover"
          data-has-cover={hasCover ? 'true' : 'false'}
        >
          <TenantBrandHero
            branding={branding}
            mode="login"
            contextLabel={heroContextLabel}
            overrideText={heroOverrideText}
          />
        </S.LoginBannerSection>

        <S.LoginFormSection data-testid="login-form-section">
          <S.LoginFormWrapper data-testid="login-card">
            <S.LoginAccessBadge>
              <ShieldCheck aria-hidden="true" />
              <span>{accessLabel}</span>
            </S.LoginAccessBadge>
            <S.WelcomeText>{welcomeText}</S.WelcomeText>
            <S.FormSubtitle>{formSubtitle}</S.FormSubtitle>

            {feedback && (
              <S.LoginFeedback
                role={feedback.type === 'error' ? 'alert' : 'status'}
                aria-live={feedback.type === 'error' ? 'assertive' : 'polite'}
                $type={feedback.type}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 size={17} aria-hidden="true" />
                ) : (
                  <AlertCircle size={17} aria-hidden="true" />
                )}
                <span>{feedback.message}</span>
              </S.LoginFeedback>
            )}

            <S.Form onSubmit={handleSubmit}>
              <S.InputGroup>
                <S.Label htmlFor="email">E-mail</S.Label>
                <S.LoginInputField>
                  <S.LoginInputIcon aria-hidden="true">
                    <Mail />
                  </S.LoginInputIcon>
                  <S.Input
                    id="email"
                    type="email"
                    placeholder="exemplo@email.com"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </S.LoginInputField>
              </S.InputGroup>

              <S.InputGroup>
                <S.Label htmlFor="password">Senha</S.Label>
                <S.LoginInputField data-password="true">
                  <S.LoginInputIcon aria-hidden="true">
                    <LockKeyhole />
                  </S.LoginInputIcon>
                  <S.Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <S.PasswordToggleButton
                    type="button"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((current) => !current)}
                  >
                    {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                  </S.PasswordToggleButton>
                </S.LoginInputField>
              </S.InputGroup>

              <S.Row>
                <S.CheckboxLabel htmlFor="remember">
                  <input
                    id="remember"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />{' '}
                  Lembrar de mim
                </S.CheckboxLabel>
                {!isTechnicalAccess ? (
                  <S.LoginForgotLink type="button" onClick={() => navigate(recoverPasswordPath)}>
                    Esqueceu a senha?
                  </S.LoginForgotLink>
                ) : null}
              </S.Row>

              <S.LoginSubmitButton type="submit" disabled={isLoading} aria-label={submitLabel}>
                <span>{isLoading ? 'Entrando...' : submitLabel}</span>
                {!isLoading ? <ArrowRight aria-hidden="true" /> : null}
              </S.LoginSubmitButton>
            </S.Form>

            <S.LoginSecurityNote>
              <ShieldCheck aria-hidden="true" />
              <span>Seus dados são protegidos durante o acesso.</span>
            </S.LoginSecurityNote>

            {showCustomerSelfService ? (
              <>
                <S.Divider>ou</S.Divider>
                <S.GoogleButtonContainer>
                  <div ref={googleButtonRef} />
                  {googleStatus !== 'ready' && (
                    <S.GoogleFallbackButton
                      type="button"
                      onClick={initializeGoogleLogin}
                      disabled={googleStatus === 'loading'}
                    >
                      {googleStatus === 'loading'
                        ? 'Carregando login com Google...'
                        : 'Tentar carregar login com Google'}
                    </S.GoogleFallbackButton>
                  )}
                </S.GoogleButtonContainer>
                {googleMessage && (
                  <S.GoogleHint role="alert" aria-live="polite">
                    {googleMessage}
                  </S.GoogleHint>
                )}
                <S.LoginRegisterText>
                  Não tem uma conta? <Link to={registerPath}>Cadastre-se aqui</Link>
                </S.LoginRegisterText>
              </>
            ) : null}
          </S.LoginFormWrapper>
        </S.LoginFormSection>
      </S.Container>
    </ThemeProvider>
  );
}
