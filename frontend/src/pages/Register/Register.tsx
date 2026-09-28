import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import authService from '../../Services/authService';
import { useAuth } from '../../contexts/authContext';
import {
  evaluatePassword,
  STANDARD_PASSWORD_POLICY,
} from '../../features/password-policy';
import {
  buildAuthEntryUrl,
  getRememberedAuthReturnPath,
  getSafeAuthSearchParams,
  resolveAuthExperience,
} from '../../shared/navigation/authNavigation';
import { useRestaurantLoginBranding } from '../Login/hooks/useRestaurantLoginBranding';
import { getRestaurantSlugFromAuthPath } from '../Login/domain/loginPortal';
import { CustomerRegisterExperience } from './CustomerRegisterExperience';

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
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

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationPending, setVerificationPending] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [googleStatus, setGoogleStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [googleMessage, setGoogleMessage] = useState('');
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleMountedRef = useRef(false);
  const googleInitInFlightRef = useRef(false);

  const passwordEvaluation = evaluatePassword(
    password,
    confirmPassword,
    STANDARD_PASSWORD_POLICY,
  );

  const destinationAfterGoogle = authExperience.nextPath || (pathSlug ? `/${pathSlug}` : '/');

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

  const handleResendVerification = async () => {
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
  };

  const loadGoogleScript = useCallback(() => {
    if (window.google?.accounts?.id) return Promise.resolve();

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]',
    );

    if (existing) {
      if (existing.dataset.loaded === 'true') return Promise.resolve();
      return new Promise<void>((resolve, reject) => {
        const loaded = () => {
          existing.dataset.loaded = 'true';
          existing.removeEventListener('load', loaded);
          existing.removeEventListener('error', failed);
          resolve();
        };
        const failed = () => {
          existing.removeEventListener('load', loaded);
          existing.removeEventListener('error', failed);
          reject(new Error('google-script-error'));
        };
        existing.addEventListener('load', loaded);
        existing.addEventListener('error', failed);
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
      script.onerror = () => reject(new Error('google-script-error'));
      document.head.appendChild(script);
    });
  }, []);

  const initializeGoogle = useCallback(async () => {
    if (googleInitInFlightRef.current) return;
    googleInitInFlightRef.current = true;
    setGoogleStatus('loading');
    setGoogleMessage('');

    try {
      const clientId = String(
        import.meta.env.VITE_GOOGLE_CLIENT_ID || (await authService.getGoogleClientId()) || '',
      ).trim();
      await loadGoogleScript();

      if (!clientId || !window.google?.accounts?.id || !googleButtonRef.current) {
        throw new Error('google-unavailable');
      }

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          try {
            const authResponse = await authService.loginWithGoogle(response.credential);
            if (authResponse?.mfaRequired) {
              toast.info('Sua conta usa verificação em duas etapas. Entre para concluir o acesso.');
              navigate(loginPath);
              return;
            }
            login(authResponse.user, authResponse.token);
            navigate(destinationAfterGoogle, { replace: true });
          } catch (error) {
            const typed = error as { response?: { data?: { error?: string } }; message?: string };
            const message =
              typed.response?.data?.error ||
              typed.message ||
              'Não foi possível continuar com o Google.';
            setGoogleMessage(message);
            setGoogleStatus('error');
          }
        },
      });

      googleButtonRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        type: 'standard',
        shape: 'rectangular',
        theme: 'outline',
        text: 'continue_with',
        size: 'large',
        width: 420,
      });
      setGoogleStatus('ready');
    } catch {
      if (googleMountedRef.current) {
        setGoogleStatus('error');
        setGoogleMessage('Não foi possível carregar o cadastro com Google agora.');
      }
    } finally {
      googleInitInFlightRef.current = false;
    }
  }, [destinationAfterGoogle, loadGoogleScript, login, loginPath, navigate]);

  useEffect(() => {
    googleMountedRef.current = true;
    const timeout = window.setTimeout(() => void initializeGoogle(), 0);
    return () => {
      window.clearTimeout(timeout);
      googleMountedRef.current = false;
    };
  }, [initializeGoogle]);

  return (
    <CustomerRegisterExperience
      branding={branding}
      name={name}
      email={email}
      phone={phone}
      password={password}
      confirmPassword={confirmPassword}
      evaluation={passwordEvaluation}
      isSubmitting={isSubmitting}
      errorMessage={errorMessage}
      verificationPending={verificationPending}
      resendingVerification={resendingVerification}
      loginPath={loginPath}
      googleButtonRef={googleButtonRef}
      googleStatus={googleStatus}
      googleMessage={googleMessage}
      onNameChange={setName}
      onEmailChange={setEmail}
      onPhoneChange={setPhone}
      onPasswordChange={setPassword}
      onConfirmPasswordChange={setConfirmPassword}
      onSubmit={handleSubmit}
      onBack={() => navigate(loginPath)}
      onInitializeGoogle={() => void initializeGoogle()}
      onResendVerification={() => void handleResendVerification()}
      onGoToLogin={() => navigate(loginPath)}
      authContext={authExperience.context}
      submitAriaLabel={
        authExperience.context === 'TABLE' && authExperience.tableNumber
          ? `Criar conta e continuar na Mesa ${authExperience.tableNumber}`
          : 'Criar conta'
      }
    />
  );
}
