import { useState, type CSSProperties, type FormEvent, type RefObject } from 'react';
import { ArrowLeft, Check, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { PasswordEvaluation } from '../../features/password-policy';
import { GoogleBrandIcon } from '../../components/GoogleBrandIcon/GoogleBrandIcon';
import type { LoginBranding } from '../Login/domain/loginBranding';
import * as S from './CustomerRegisterExperience.styles';

type Props = {
  branding: LoginBranding;
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  evaluation: PasswordEvaluation;
  isSubmitting: boolean;
  errorMessage: string;
  verificationPending: boolean;
  resendingVerification: boolean;
  loginPath: string;
  googleButtonRef: RefObject<HTMLDivElement | null>;
  googleStatus: string;
  googleMessage: string;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onBack: () => void;
  onInitializeGoogle: () => void;
  onResendVerification: () => void;
  onGoToLogin: () => void;
  authContext?: 'ONLINE' | 'TABLE';
  submitAriaLabel?: string;
};

export function CustomerRegisterExperience({
  branding,
  name,
  email,
  phone,
  password,
  confirmPassword,
  evaluation,
  isSubmitting,
  errorMessage,
  verificationPending,
  resendingVerification,
  loginPath,
  googleButtonRef,
  googleStatus,
  googleMessage,
  onNameChange,
  onEmailChange,
  onPhoneChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
  onBack,
  onInitializeGoogle,
  onResendVerification,
  onGoToLogin,
  authContext = 'ONLINE',
  submitAriaLabel = 'Criar conta',
}: Props) {
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [heroFailed, setHeroFailed] = useState(false);
  const [markFailed, setMarkFailed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const heroImage = branding.coverUrl;
  const markImage = branding.markUrl;
  const initials = branding.name.trim().slice(0, 1).toUpperCase() || 'G';
  const style = {
    '--auth-primary': branding.primaryColor || '#e85a2b',
  } as CSSProperties;

  const visibleRules = evaluation.requirements.filter(
    (requirement) => requirement.id !== 'confirmation' && requirement.id !== 'maxBytes',
  );
  const confirmationRule = evaluation.requirements.find(
    (requirement) => requirement.id === 'confirmation',
  );

  return (
    <S.Layout
      style={style}
      data-testid="register-layout"
      data-auth-context={authContext}
      data-restaurant-category={branding.category}
    >
      <S.Hero>
        {heroImage && !heroFailed ? (
          <>
            {!heroLoaded ? <S.HeroSkeleton aria-hidden="true" /> : null}
            <S.HeroImage
              src={heroImage}
              alt=""
              aria-hidden="true"
              style={{ '--hero-image-opacity': heroLoaded ? 1 : 0 } as CSSProperties}
              onLoad={() => setHeroLoaded(true)}
              onError={() => setHeroFailed(true)}
            />
          </>
        ) : null}
        <S.HeroOverlay />
        <S.HeroBranding>
          <S.RestaurantMark>
            {markImage && !markFailed ? (
              <img src={markImage} alt="" aria-hidden="true" onError={() => setMarkFailed(true)} />
            ) : (
              initials
            )}
          </S.RestaurantMark>
          <S.HeroNameGroup>
            <S.RestaurantName>{branding.name}</S.RestaurantName>
            <S.AccessBadge>Acesso do Cliente</S.AccessBadge>
          </S.HeroNameGroup>
          {branding.description ? (
            <S.HeroDescription>{branding.description}</S.HeroDescription>
          ) : null}
        </S.HeroBranding>
      </S.Hero>

      <div>
        <S.MobileHeader>
          <button type="button" aria-label="Voltar" onClick={onBack}>
            <ArrowLeft size={16} />
          </button>
          <div className="copy">
            <h1>Criar conta</h1>
            <p>Faça parte da melhor experiência gastronômica</p>
          </div>
        </S.MobileHeader>

        <S.Panel>
          <S.Card>
            <S.DesktopHeading>
              <h1>Criar conta</h1>
              <p>Faça parte da melhor experiência gastronômica</p>
            </S.DesktopHeading>

            {verificationPending ? (
              <S.Verification role="status" aria-live="polite">
                <CheckCircle2 />
                <h2>Confira seu e-mail</h2>
                <p>
                  Enviamos um link de confirmação para <b>{email.trim()}</b>. Confirme o endereço
                  para liberar o acesso.
                </p>
                <button type="button" disabled={resendingVerification} onClick={onResendVerification}>
                  {resendingVerification ? 'Reenviando...' : 'Reenviar e-mail de confirmação'}
                </button>
                <button type="button" onClick={onGoToLogin}>Ir para o login</button>
              </S.Verification>
            ) : (
              <>
                <S.Form onSubmit={onSubmit}>
                  <S.Field>
                    <span>Nome completo</span>
                    <S.InputBox>
                      <input
                        id="name"
                        aria-label="Nome Completo"
                        value={name}
                        onChange={(event) => onNameChange(event.target.value)}
                        placeholder="Seu nome e sobrenome"
                        autoComplete="name"
                        required
                      />
                    </S.InputBox>
                  </S.Field>

                  <S.Field>
                    <span>E-mail</span>
                    <S.InputBox>
                      <input
                        id="email"
                        aria-label="E-mail"
                        type="email"
                        value={email}
                        onChange={(event) => onEmailChange(event.target.value)}
                        placeholder="seu@email.com"
                        autoComplete="email"
                        required
                      />
                    </S.InputBox>
                  </S.Field>

                  <S.Field>
                    <span>Celular</span>
                    <S.InputBox>
                      <input
                        id="phone"
                        aria-label="Telefone"
                        type="tel"
                        inputMode="tel"
                        value={phone}
                        onChange={(event) => onPhoneChange(event.target.value)}
                        placeholder="(11) 99999-0000 ou +55 (11) 99999-0000"
                        autoComplete="tel"
                        required
                      />
                    </S.InputBox>
                  </S.Field>

                  <S.Field>
                    <span>Senha</span>
                    <S.InputBox>
                      <input
                        id="password"
                        aria-label="Senha"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(event) => onPasswordChange(event.target.value)}
                        placeholder="Crie uma senha forte"
                        autoComplete="new-password"
                        required
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                        onClick={() => setShowPassword((current) => !current)}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </S.InputBox>
                  </S.Field>

                  <S.Rules role="region" aria-label="Requisitos da senha">
                    {visibleRules.map((rule) => (
                      <div
                        className={`rule ${rule.met ? 'met' : ''}`}
                        key={rule.id}
                        data-requirement={rule.id}
                        data-met={rule.met ? 'true' : 'false'}
                      >
                        <span className="check"><Check /></span>
                        <span>{rule.label}</span>
                      </div>
                    ))}
                  </S.Rules>

                  <S.Field>
                    <span>Confirmar senha</span>
                    <S.InputBox>
                      <input
                        id="confirmPassword"
                        aria-label="Confirmar Senha"
                        type={showConfirmation ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(event) => onConfirmPasswordChange(event.target.value)}
                        placeholder="Repita a senha criada"
                        autoComplete="new-password"
                        required
                      />
                      <button
                        type="button"
                        aria-label={showConfirmation ? 'Ocultar confirmação' : 'Mostrar confirmação'}
                        onClick={() => setShowConfirmation((current) => !current)}
                      >
                        {showConfirmation ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </S.InputBox>
                  </S.Field>

                  {confirmationRule ? (
                    <S.Rules>
                      <div
                        className={`rule ${confirmationRule.met ? 'met' : ''}`}
                        data-requirement="confirmation"
                        data-met={confirmationRule.met ? 'true' : 'false'}
                      >
                        <span className="check"><Check /></span>
                        <span>As senhas devem ser iguais</span>
                      </div>
                    </S.Rules>
                  ) : null}

                  {errorMessage ? <S.Error role="alert">{errorMessage}</S.Error> : null}

                  <S.Primary
                    type="submit"
                    aria-label={submitAriaLabel}
                    aria-busy={isSubmitting}
                    disabled={!evaluation.isValid || isSubmitting}
                  >
                    {isSubmitting ? 'Criando conta...' : 'Criar conta'}
                  </S.Primary>
                </S.Form>

                <S.Divider>ou</S.Divider>

                <S.GoogleSlot>
                  <div className="google-real-button" ref={googleButtonRef} />
                  {googleStatus === 'ready' ? (
                    <S.GoogleVisual aria-hidden="true">
                      <GoogleBrandIcon />
                      <span>Continuar com o Google</span>
                    </S.GoogleVisual>
                  ) : (
                    <S.GoogleFallback
                      className="google-fallback-overlay"
                      type="button"
                      disabled={googleStatus === 'loading'}
                      onClick={onInitializeGoogle}
                    >
                      <GoogleBrandIcon />
                      <span>
                        {googleStatus === 'loading'
                          ? 'Carregando Google...'
                          : 'Continuar com o Google'}
                      </span>
                    </S.GoogleFallback>
                  )}
                </S.GoogleSlot>

                {googleMessage ? <S.GoogleMessage role="alert">{googleMessage}</S.GoogleMessage> : null}

                <S.Footer>
                  <p>Já tem conta? <Link to={loginPath} aria-label="Fazer Login">Entrar</Link></p>
                  <small>
                    Ao se cadastrar, você declara que concorda e aceita nossos termos e políticas vigentes.
                  </small>
                </S.Footer>
              </>
            )}
          </S.Card>
        </S.Panel>
        <S.HomeIndicator />
      </div>
    </S.Layout>
  );
}
