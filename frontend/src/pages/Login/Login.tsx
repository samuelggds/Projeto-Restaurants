import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import {
  CheckCircle2,
  AlertCircle,
  Utensils,
  Sun,
  Moon,
  Eye,
  EyeOff,
} from 'lucide-react';
import authService from '../../Services/authService';
import { useAuth } from '../../contexts/authContext.js';
import * as S from './styles';
import { useAppDialog } from '../../components/AppDialog/context';
import { useRestaurantLoginBranding } from './hooks/useRestaurantLoginBranding';
import { canUseTechnicalAccess, TECHNICAL_ACCESS_DENIED_MESSAGE } from './technicalAccess';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isTechnicalAccess = location.pathname === '/super_admin/login';
  const branding = useRestaurantLoginBranding(searchParams);
  const restaurantQuery = searchParams.toString();
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

  const getSafeNextPath = useCallback(() => {
    const rawNext = String(searchParams.get('next') || '').trim();

    if (!rawNext || !rawNext.startsWith('/') || rawNext.startsWith('//')) {
      return '';
    }

    const blockedPaths = new Set(['/login', '/register', '/recover-password']);
    const normalizedPath = rawNext.toLowerCase();

    if (blockedPaths.has(normalizedPath)) {
      return '';
    }

    return rawNext;
  }, [searchParams]);

  const redirectByRole = useCallback(
    (user) => {
      if (user?.mustChangePassword === true) {
        navigate('/change-password');
        return;
      }

      if (user?.role === 'SUPER_ADMIN') {
        navigate('/super_admin');
        return;
      }

      const nextPath = getSafeNextPath();
      if (nextPath) {
        navigate(nextPath);
        return;
      }

      if (user?.role === 'ADMIN') {
        navigate('/admin');
        return;
      }

      if (user?.role === 'MOTOQUEIRO') {
        navigate('/courier');
        return;
      }

      if (user?.role === 'FUNCIONARIO') {
        const subRole = (user as Record<string, unknown>)?.subRole;
        navigate(subRole === 'COZINHA' ? '/kitchen' : subRole === 'GARCOM' ? '/waiter' : '/login');
        return;
      }

      navigate('/');
    },
    [getSafeNextPath, navigate],
  );

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

  const initializeGoogleLogin = useCallback(async () => {
    if (googleInitInFlightRef.current) {
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
              const authResponse = await completeLoginWithMfaIfNeeded(firstStep);

              setFeedback({
                type: 'success',
                message: 'Login realizado com sucesso!',
              });
              setTimeout(() => {
                login(authResponse.user, authResponse.token);
                redirectByRole(authResponse.user);
              }, 700);
            } catch (error) {
              const message = error?.response?.data?.error || 'Erro ao autenticar com Google';
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
    getGoogleClientId,
    loadGoogleScript,
    login,
    redirectByRole,
    isDarkMode,
    completeLoginWithMfaIfNeeded,
  ]);

  useEffect(() => {
    if (isTechnicalAccess) {
      return;
    }
    isGoogleMountedRef.current = true;

    const timeoutId = setTimeout(() => {
      initializeGoogleLogin();
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      isGoogleMountedRef.current = false;
    };
  }, [initializeGoogleLogin, isTechnicalAccess]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback(null);
    setIsLoading(true);
    try {
      const firstStep = await authService.login({
        email,
        password,
      });
      const response = await completeLoginWithMfaIfNeeded(firstStep);

      if (isTechnicalAccess && !canUseTechnicalAccess(response?.user)) {
        await authService.logout(response?.token).catch(() => undefined);
        throw new Error(TECHNICAL_ACCESS_DENIED_MESSAGE);
      }

      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      setFeedback({ type: 'success', message: 'Login realizado com sucesso!' });
      setTimeout(() => {
        login(response.user, response.token);
        redirectByRole(response.user);
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
            aria-label={isDarkMode ? 'Ativar modo claro' : 'Ativar modo escuro'}
            onClick={() => setIsDarkMode(!isDarkMode)}
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </S.ThemeToggleButton>
        </S.TopBar>

        <S.BannerSection $hasLogo={Boolean(branding.logoUrl)}>
          <S.BrandTitle>
            {branding.logoUrl ? (
              <S.RestaurantLogo src={branding.logoUrl} alt={`Capa ${branding.name}`} />
            ) : (
              <Utensils size={32} strokeWidth={2.5} />
            )}
            <span>{branding.name}</span>
          </S.BrandTitle>
          <S.BrandSubtitle>
            {isTechnicalAccess
              ? 'Canal reservado para suporte, monitoramento e manutenção segura da plataforma.'
              : branding.description}
          </S.BrandSubtitle>
        </S.BannerSection>

        <S.FormSection>
          <S.FormWrapper>
            <S.WelcomeText>{isTechnicalAccess ? 'Acesso técnico' : 'Bem-vindo!'}</S.WelcomeText>
            <S.FormSubtitle>
              {isTechnicalAccess
                ? 'Entre com a conta exclusiva de Super Admin para acompanhar a manutenção.'
                : 'Por favor, insira seus dados de acesso para continuar.'}
            </S.FormSubtitle>

            {feedback && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.6rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  lineHeight: 1.45,
                  background:
                    feedback.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.08)',
                  border: `1px solid ${feedback.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.25)'}`,
                  color: feedback.type === 'success' ? '#059669' : '#dc2626',
                }}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 size={17} style={{ flexShrink: 0, marginTop: 1 }} />
                ) : (
                  <AlertCircle size={17} style={{ flexShrink: 0, marginTop: 1 }} />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            <S.Form onSubmit={handleSubmit}>
              <S.InputGroup>
                <S.Label htmlFor="email">E-mail</S.Label>
                <S.Input
                  id="email"
                  type="email"
                  placeholder="exemplo@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </S.InputGroup>

              <S.InputGroup>
                <S.Label htmlFor="password">Senha</S.Label>
                <S.PasswordField>
                  <S.Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
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
                </S.PasswordField>
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
                  <S.ForgotLink
                    type="button"
                    onClick={() =>
                      navigate(`/recover-password${restaurantQuery ? `?${restaurantQuery}` : ''}`)
                    }
                  >
                    Esqueceu a senha?
                  </S.ForgotLink>
                ) : null}
              </S.Row>

              <S.Button type="submit" disabled={isLoading}>
                {isLoading ? 'Entrando...' : 'Entrar no Sistema'}
              </S.Button>
            </S.Form>

            {!isTechnicalAccess ? (
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
                {googleMessage && <S.GoogleHint>{googleMessage}</S.GoogleHint>}
                <S.RegisterText>
                  Não tem uma conta? <a href="/register">Cadastre-se aqui</a>
                </S.RegisterText>
              </>
            ) : null}
          </S.FormWrapper>
        </S.FormSection>
      </S.Container>
    </ThemeProvider>
  );
}
