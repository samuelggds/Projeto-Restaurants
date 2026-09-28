import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import authService from '../../Services/authService';
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
import {
  executePhoneCaptcha,
  IDENTITY_PLATFORM_PHONE_RECAPTCHA_ACTION,
} from '../../modules/auth/phoneCaptcha';
import { useRestaurantLoginBranding } from '../Login/hooks/useRestaurantLoginBranding';
import { getRestaurantSlugFromAuthPath } from '../Login/domain/loginPortal';
import { useResendCooldown } from './hooks/useResendCooldown';
import { CustomerRecoveryExperience } from './CustomerRecoveryExperience';

type ContactMethod = 'email' | 'phone';

const REQUEST_RECOVERY_ERROR_MESSAGE =
  'Não foi possível enviar o código agora. Tente novamente em alguns instantes.';
const RESET_PASSWORD_ERROR_MESSAGE =
  'Não foi possível redefinir a senha agora. Confira o código e tente novamente.';

export default function RecoverPassword() {
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
  const branding = useRestaurantLoginBranding(contextualSearchParams);
  const authExperience = resolveAuthExperience(contextualSearchParams);
  const loginPath = pathSlug
    ? `/${pathSlug}/login${canonicalSearch ? `?${canonicalSearch}` : ''}`
    : buildAuthEntryUrl('/login', contextualSearchParams);

  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [contactMethod, setContactMethod] = useState<ContactMethod>(
    () => (searchParams.get('method') === 'sms' ? 'phone' : 'email'),
  );
  const [identifier, setIdentifier] = useState('');
  const [smsChallengeId, setSmsChallengeId] = useState('');
  const [phoneAuth, setPhoneAuth] = useState<{ enabled: boolean; siteKey: string | null }>({
    enabled: false,
    siteKey: null,
  });
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const requestPending = useRef(false);
  const { remainingSeconds, canRequest, startCooldown } = useResendCooldown();

  const passwordEvaluation = evaluatePassword(
    newPassword,
    confirmPassword,
    STANDARD_PASSWORD_POLICY,
  );

  useEffect(() => {
    let active = true;
    void authService
      .getPhoneAuthConfig()
      .then((config) => {
        if (!active) return;
        const next = {
          enabled: Boolean(config?.enabled),
          siteKey: typeof config?.siteKey === 'string' ? config.siteKey : null,
        };
        setPhoneAuth(next);
        if (!next.enabled && contactMethod === 'phone') setContactMethod('email');
      })
      .catch(() => {
        if (!active) return;
        setPhoneAuth({ enabled: false, siteKey: null });
        if (contactMethod === 'phone') setContactMethod('email');
      });
    return () => {
      active = false;
    };
  }, [contactMethod]);

  const buildIdentifierPayload = () => {
    const value = identifier.trim();
    return contactMethod === 'phone' ? { phone: value } : { email: value };
  };

  const requestRecovery = async () => {
    if (requestPending.current || isLoading || !canRequest()) return;
    if (!identifier.trim()) {
      toast.error('Informe o e-mail ou telefone.');
      return;
    }

    requestPending.current = true;
    startCooldown();

    try {
      setIsLoading(true);
      const response =
        contactMethod === 'phone'
          ? await authService.forgotPasswordSms({
              phone: identifier.trim(),
              captchaResponse: await executePhoneCaptcha(
                phoneAuth.siteKey,
                IDENTITY_PLATFORM_PHONE_RECAPTCHA_ACTION,
              ),
            })
          : await authService.forgotPassword(buildIdentifierPayload());

      startCooldown();
      setCode('');
      setSmsChallengeId(contactMethod === 'phone' ? String(response?.challengeId || '') : '');
      toast.success(
        response?.message ||
          (contactMethod === 'phone'
            ? 'Se o número estiver habilitado para recuperação, enviaremos um código por SMS.'
            : 'Se o e-mail estiver cadastrado, enviaremos um código de recuperação.'),
      );
      setStep('reset');
    } catch {
      toast.error(REQUEST_RECOVERY_ERROR_MESSAGE);
    } finally {
      requestPending.current = false;
      setIsLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (step === 'request') {
      await requestRecovery();
      return;
    }

    if (!passwordEvaluation.isValid) {
      toast.error(passwordEvaluation.errors[0]);
      return;
    }

    try {
      setIsLoading(true);
      const response =
        contactMethod === 'phone'
          ? await authService.resetPasswordSms({
              challengeId: smsChallengeId,
              code,
              newPassword,
              confirmPassword,
            })
          : await authService.resetPassword({
              ...buildIdentifierPayload(),
              code,
              newPassword,
              confirmPassword,
            });

      toast.success(response?.message || 'Senha redefinida com sucesso. Faça login para continuar.');
      navigate(loginPath, { replace: true });
    } catch {
      toast.error(RESET_PASSWORD_ERROR_MESSAGE);
    } finally {
      setIsLoading(false);
    }
  };

  const changeContact = () => {
    setStep('request');
    setCode('');
    setNewPassword('');
    setConfirmPassword('');
    setSmsChallengeId('');
  };

  return (
    <CustomerRecoveryExperience
      branding={branding}
      step={step}
      contactMethod={contactMethod}
      identifier={identifier}
      code={code}
      newPassword={newPassword}
      confirmPassword={confirmPassword}
      evaluation={passwordEvaluation}
      isLoading={isLoading}
      remainingSeconds={remainingSeconds}
      phoneRecoveryEnabled={phoneAuth.enabled}
      onIdentifierChange={setIdentifier}
      onCodeChange={setCode}
      onNewPasswordChange={setNewPassword}
      onConfirmPasswordChange={setConfirmPassword}
      onSubmit={handleSubmit}
      onBack={() => navigate(loginPath)}
      onChangeContact={changeContact}
      onResend={() => void requestRecovery()}
      authContext={authExperience.context}
    />
  );
}
