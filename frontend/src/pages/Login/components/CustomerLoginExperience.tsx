import { useState, type CSSProperties, type FormEvent, type RefObject } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { LoginBranding } from '../domain/loginBranding';
import * as S from './CustomerLoginExperience.styles';

type Feedback = {
  type: 'success' | 'error';
  message: string;
} | null;

type Props = {
  branding: LoginBranding;
  email: string;
  password: string;
  rememberMe: boolean;
  showPassword: boolean;
  isLoading: boolean;
  feedback: Feedback;
  registerPath: string;
  recoverPasswordPath: string;
  googleButtonRef: RefObject<HTMLDivElement | null>;
  googleStatus: string;
  googleMessage: string;
  showResendVerification: boolean;
  resendingVerification: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onRememberChange: (checked: boolean) => void;
  onTogglePassword: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onNavigate: (path: string) => void;
  onInitializeGoogle: () => void;
  onResendVerification: () => void;
};

export function CustomerLoginExperience({
  branding,
  email,
  password,
  rememberMe,
  showPassword,
  isLoading,
  feedback,
  registerPath,
  recoverPasswordPath,
  googleButtonRef,
  googleStatus,
  googleMessage,
  showResendVerification,
  resendingVerification,
  onEmailChange,
  onPasswordChange,
  onRememberChange,
  onTogglePassword,
  onSubmit,
  onNavigate,
  onInitializeGoogle,
  onResendVerification,
}: Props) {
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [markLoaded, setMarkLoaded] = useState(false);
  const heroImage = branding.coverUrl || branding.logoUrl;
  const markImage = branding.markUrl;
  const initials = branding.name.trim().slice(0, 1).toUpperCase() || 'G';
  const style = {
    '--auth-primary': branding.primaryColor || '#e85a2b',
  } as CSSProperties;

  return (
    <S.CustomerAuthLayout style={style} data-testid="login-layout" data-auth-portal="customer">
      <S.Hero>
        {heroImage ? (
          <>
            {!heroLoaded ? <S.HeroSkeleton aria-hidden="true" /> : null}
            <S.HeroImage
              src={heroImage}
              alt=""
              aria-hidden="true"
              style={{ '--hero-image-opacity': heroLoaded ? 1 : 0 } as CSSProperties}
              onLoad={() => setHeroLoaded(true)}
              onError={() => setHeroLoaded(false)}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              draggable="false"
            />
          </>
        ) : (
          <S.HeroSkeleton aria-hidden="true" />
        )}
        <S.HeroOverlay />
        <S.HeroBranding>
          <S.RestaurantMark aria-label={branding.name}>
            {markImage && !markLoaded ? <span className="logo-skeleton" aria-hidden="true" /> : null}
            {markImage ? (
              <img
                src={markImage}
                alt=""
                aria-hidden="true"
                onLoad={() => setMarkLoaded(true)}
                onError={() => setMarkLoaded(false)}
              />
            ) : (
              <span>{initials}</span>
            )}
          </S.RestaurantMark>

          <S.HeroNameGroup>
            <S.RestaurantName>{branding.name}</S.RestaurantName>
            <S.AccessBadge>Acesso do Cliente</S.AccessBadge>
          </S.HeroNameGroup>

          <S.HeroDescription>
            {branding.description ||
              'Sabores inesquecíveis e ingredientes selecionados com todo o carinho que você merece.'}
          </S.HeroDescription>
        </S.HeroBranding>
      </S.Hero>

      <S.FormPanel data-testid="login-form-section">
        <S.FormCard data-testid="login-card">
          <S.HeadingGroup>
            <h2>Bem-vindo de volta!</h2>
            <p>Acesse sua conta para continuar no {branding.name}.</p>
          </S.HeadingGroup>

          {feedback ? (
            <S.Feedback
              role={feedback.type === 'error' ? 'alert' : 'status'}
              aria-live={feedback.type === 'error' ? 'assertive' : 'polite'}
              style={
                {
                  '--feedback-border':
                    feedback.type === 'success'
                      ? 'rgba(16,185,129,.3)'
                      : 'rgba(239,68,68,.28)',
                  '--feedback-bg':
                    feedback.type === 'success'
                      ? 'rgba(16,185,129,.08)'
                      : 'rgba(239,68,68,.07)',
                  '--feedback-color': feedback.type === 'success' ? '#087d58' : '#b42318',
                } as CSSProperties
              }
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 size={17} aria-hidden="true" />
              ) : (
                <AlertCircle size={17} aria-hidden="true" />
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
                <span>E-mail</span>
                <S.InputShell>
                  <Mail aria-hidden="true" />
                  <input
                    id="email"
                    name="username"
                    type="email"
                    inputMode="email"
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
                <span>Senha</span>
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

            <S.PrimaryButton type="submit" disabled={isLoading} aria-label="Entrar como cliente">
              <span>{isLoading ? 'Entrando...' : 'Entrar como cliente'}</span>
              {!isLoading ? <ArrowRight aria-hidden="true" /> : null}
            </S.PrimaryButton>
          </S.AuthForm>

          <S.Divider>ou</S.Divider>

          {googleStatus === 'ready' ? (
            <S.GoogleSlot>
              <div className="google-real-button" ref={googleButtonRef} />
              <S.GoogleVisual aria-hidden="true">
                <span className="google-g">G</span>
                <span>Continuar com o Google</span>
              </S.GoogleVisual>
            </S.GoogleSlot>
          ) : (
            <S.GoogleFallback
              type="button"
              onClick={onInitializeGoogle}
              disabled={googleStatus === 'loading'}
            >
              <span className="google-g">G</span>
              <span>
                {googleStatus === 'loading' ? 'Carregando login com Google...' : 'Continuar com o Google'}
              </span>
            </S.GoogleFallback>
          )}

          {googleMessage ? (
            <S.GoogleMessage role="alert" aria-live="polite">
              {googleMessage}
            </S.GoogleMessage>
          ) : null}

          <S.RegisterFooter>
            Não tem uma conta? <Link to={registerPath}>Cadastre-se aqui</Link>
          </S.RegisterFooter>
        </S.FormCard>
      </S.FormPanel>
    </S.CustomerAuthLayout>
  );
}
