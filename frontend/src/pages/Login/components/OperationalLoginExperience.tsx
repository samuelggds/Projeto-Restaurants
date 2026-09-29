import { useState, type CSSProperties, type FormEvent } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import type { LoginBranding } from '../domain/loginBranding';
import * as S from './OperationalLoginExperience.styles';

type Feedback = {
  type: 'success' | 'error';
  message: string;
} | null;

type Props = {
  branding: LoginBranding;
  mode: 'team' | 'admin';
  email: string;
  password: string;
  rememberMe: boolean;
  showPassword: boolean;
  isLoading: boolean;
  feedback: Feedback;
  recoverPasswordPath: string;
  showResendVerification: boolean;
  resendingVerification: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onRememberChange: (checked: boolean) => void;
  onTogglePassword: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onNavigate: (path: string) => void;
  onResendVerification: () => void;
};

export function OperationalLoginExperience({
  branding,
  mode,
  email,
  password,
  rememberMe,
  showPassword,
  isLoading,
  feedback,
  recoverPasswordPath,
  showResendVerification,
  resendingVerification,
  onEmailChange,
  onPasswordChange,
  onRememberChange,
  onTogglePassword,
  onSubmit,
  onNavigate,
  onResendVerification,
}: Props) {
  const [coverFailed, setCoverFailed] = useState(false);
  const [markFailed, setMarkFailed] = useState(false);
  const coverImage = coverFailed ? '' : branding.coverUrl;
  const markImage = markFailed ? '' : branding.markUrl;
  const initials = branding.name.trim().slice(0, 1).toUpperCase() || 'G';
  const isTeam = mode === 'team';
  const accessLabel = isTeam ? 'Acesso da Equipe' : 'Acesso do Admin';
  const submitLabel = isTeam ? 'Entrar como equipe' : 'Entrar como admin';
  const style = {
    '--operational-primary': branding.primaryColor || '#e85a2b',
  } as CSSProperties;

  return (
    <S.OperationalAuthLayout
      style={style}
      data-testid="login-layout"
      data-auth-portal={mode}
      data-restaurant-category={branding.category}
    >
      <S.Hero data-testid="login-cover">
        {coverImage ? (
          <S.HeroImage
            data-testid="login-cover-image"
            src={coverImage}
            alt=""
            aria-hidden="true"
            onError={() => setCoverFailed(true)}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            draggable="false"
          />
        ) : null}
        <S.HeroOverlay />

        <S.HeroBranding data-testid="login-hero-content" data-category={branding.category}>
          <S.RestaurantMark aria-label={branding.name}>
            {markImage ? (
              <img
                src={markImage}
                alt=""
                aria-hidden="true"
                onError={() => setMarkFailed(true)}
                draggable="false"
              />
            ) : (
              <span>{initials}</span>
            )}
          </S.RestaurantMark>

          <S.HeroNameGroup>
            <S.RestaurantName>{branding.name}</S.RestaurantName>
            <S.AccessBadge>{accessLabel}</S.AccessBadge>
          </S.HeroNameGroup>

          {branding.description ? <S.HeroDescription>{branding.description}</S.HeroDescription> : null}
        </S.HeroBranding>
      </S.Hero>

      <S.MobileSpacer aria-hidden="true" />

      <S.FormPanel data-form-section="login-form-section">
        <S.FormCard data-testid="login-card">
          <S.HeadingGroup>
            <h1>Bem-vindo de volta!</h1>
            <p>Acesse sua conta para continuar no {branding.name}.</p>
          </S.HeadingGroup>

          {feedback ? (
            <S.Feedback
              role={feedback.type === 'error' ? 'alert' : 'status'}
              aria-live={feedback.type === 'error' ? 'assertive' : 'polite'}
              data-type={feedback.type}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 aria-hidden="true" />
              ) : (
                <AlertCircle aria-hidden="true" />
              )}
              <span>{feedback.message}</span>
            </S.Feedback>
          ) : null}

          {showResendVerification ? (
            <S.ResendButton
              type="button"
              disabled={resendingVerification || !email.trim()}
              onClick={onResendVerification}
            >
              {resendingVerification ? 'Reenviando confirmação...' : 'Reenviar e-mail de confirmação'}
            </S.ResendButton>
          ) : null}

          <S.AuthForm onSubmit={onSubmit} autoComplete="off">
            <S.Fields>
              <S.FieldGroup>
                <label htmlFor="email">E-mail</label>
                <S.InputShell>
                  <Mail aria-hidden="true" />
                  <input
                    id="email"
                    name="username"
                    type={isTeam ? 'text' : 'email'}
                    inputMode="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="seu@email.com"
                    autoComplete="off"
                    value={email}
                    onChange={(event) => onEmailChange(event.target.value)}
                    required
                  />
                  <span aria-hidden="true" />
                </S.InputShell>
              </S.FieldGroup>

              <S.FieldGroup>
                <label htmlFor="password">Senha</label>
                <S.InputShell>
                  <LockKeyhole aria-hidden="true" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Digite sua senha"
                    autoComplete="off"
                    value={password}
                    onChange={(event) => onPasswordChange(event.target.value)}
                    required
                  />
                  <S.PasswordToggle
                    type="button"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    aria-pressed={showPassword}
                    onClick={onTogglePassword}
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </S.PasswordToggle>
                </S.InputShell>
              </S.FieldGroup>

              <S.OptionsRow>
                <S.RememberLabel>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => onRememberChange(event.target.checked)}
                  />
                  <span>Lembrar de mim</span>
                </S.RememberLabel>
                <S.ForgotButton type="button" onClick={() => onNavigate(recoverPasswordPath)}>
                  Esqueceu a senha?
                </S.ForgotButton>
              </S.OptionsRow>
            </S.Fields>

            <S.PrimaryButton type="submit" disabled={isLoading} aria-label={submitLabel}>
              {isLoading ? 'Entrando...' : submitLabel + ' →'}
            </S.PrimaryButton>
          </S.AuthForm>
        </S.FormCard>
      </S.FormPanel>

      <S.HomeIndicator aria-hidden="true">
        <span />
      </S.HomeIndicator>
    </S.OperationalAuthLayout>
  );
}
