import { useState, type CSSProperties, type FormEvent } from 'react';
import { ArrowLeft, Check, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import type { PasswordEvaluation } from '../../features/password-policy';
import type { LoginBranding } from '../Login/domain/loginBranding';
import * as S from './CustomerRecoveryExperience.styles';

type ContactMethod = 'email' | 'phone';

type Props = {
  branding: LoginBranding;
  step: 'request' | 'reset';
  contactMethod: ContactMethod;
  identifier: string;
  code: string;
  newPassword: string;
  confirmPassword: string;
  evaluation: PasswordEvaluation;
  isLoading: boolean;
  remainingSeconds: number;
  phoneRecoveryEnabled: boolean;
  onIdentifierChange: (value: string) => void;
  onCodeChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onBack: () => void;
  onChangeContact: () => void;
  onResend: () => void;
};

export function CustomerRecoveryExperience({
  branding,
  step,
  contactMethod,
  identifier,
  code,
  newPassword,
  confirmPassword,
  evaluation,
  isLoading,
  remainingSeconds,
  phoneRecoveryEnabled,
  onIdentifierChange,
  onCodeChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
  onBack,
  onChangeContact,
  onResend,
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
    (requirement) =>
      requirement.id !== 'confirmation' &&
      requirement.id !== 'maxBytes' &&
      requirement.id !== 'notPredictable',
  );
  const confirmationRule = evaluation.requirements.find(
    (requirement) => requirement.id === 'confirmation',
  );

  return (
    <S.Layout style={style} data-testid="recover-password-layout">
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
          <button type="button" onClick={onBack} aria-label="Voltar">
            <ArrowLeft size={18} />
          </button>
          <h1>Recuperar senha</h1>
        </S.MobileHeader>

        <S.Panel>
          <S.Card>
            <S.Illustration>
              <span className="circle"><ShieldAlert /></span>
            </S.Illustration>

            <S.Heading>
              <h2>{step === 'request' ? 'Esqueceu sua senha?' : 'Crie uma nova senha'}</h2>
              <p>
                {step === 'request'
                  ? contactMethod === 'phone'
                    ? 'Digite seu telefone verificado e enviaremos um código para redefinir sua senha.'
                    : 'Digite seu e-mail e enviaremos um código seguro para você redefinir sua credencial de acesso.'
                  : 'Digite o código recebido e escolha uma nova senha para sua conta.'}
              </p>
            </S.Heading>

            <S.Form onSubmit={onSubmit}>
              <S.Field>
                <span>{contactMethod === 'phone' ? 'Telefone verificado' : 'E-mail de cadastro'}</span>
                <S.InputBox>
                  <input
                    type={contactMethod === 'phone' ? 'tel' : 'email'}
                    inputMode={contactMethod === 'phone' ? 'tel' : 'email'}
                    value={identifier}
                    onChange={(event) => onIdentifierChange(event.target.value)}
                    placeholder={contactMethod === 'phone' ? '(11) 99999-9999' : 'seu@email.com'}
                    readOnly={step === 'reset'}
                    required
                  />
                </S.InputBox>
              </S.Field>

              {step === 'reset' ? (
                <>
                  <S.Notice>
                    Código solicitado para {identifier}. Informe o código recebido para continuar.
                  </S.Notice>

                  <S.Field>
                    <span>Código de recuperação</span>
                    <S.InputBox>
                      <input
                        id="reset-code"
                        aria-label="Código"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        value={code}
                        onChange={(event) =>
                          onCodeChange(event.target.value.replace(/\D/g, '').slice(0, 6))
                        }
                        placeholder="Código de 6 dígitos"
                        required
                      />
                    </S.InputBox>
                  </S.Field>

                  <S.Field>
                    <span>Nova senha</span>
                    <S.InputBox>
                      <input
                        id="new-password"
                        aria-label="Nova senha"
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(event) => onNewPasswordChange(event.target.value)}
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

                  <S.Rules>
                    {visibleRules.map((rule) => (
                      <div className={`rule ${rule.met ? 'met' : ''}`} key={rule.id}>
                        <span className="check"><Check /></span>
                        <span>{rule.label}</span>
                      </div>
                    ))}
                  </S.Rules>

                  <S.Field>
                    <span>Confirmar nova senha</span>
                    <S.InputBox>
                      <input
                        id="confirm-password"
                        aria-label="Confirmar nova senha"
                        type={showConfirmation ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(event) => onConfirmPasswordChange(event.target.value)}
                        placeholder="Repita a nova senha"
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
                      <div className={`rule ${confirmationRule.met ? 'met' : ''}`}>
                        <span className="check"><Check /></span>
                        <span>As senhas devem ser iguais</span>
                      </div>
                    </S.Rules>
                  ) : null}
                </>
              ) : null}

              <S.Primary
                type="submit"
                aria-label={step === 'request' ? 'Enviar código' : 'Redefinir senha'}
                disabled={
                  isLoading ||
                  (step === 'request' && remainingSeconds > 0) ||
                  (step === 'reset' && (code.length !== 6 || !evaluation.isValid))
                }
              >
                {isLoading
                  ? 'Processando...'
                  : step === 'request'
                    ? remainingSeconds > 0
                      ? `Aguarde ${remainingSeconds}s`
                      : 'Enviar código de recuperação'
                    : 'Redefinir senha'}
              </S.Primary>

              {step === 'reset' ? (
                <S.SecondaryRow>
                  <button type="button" onClick={onChangeContact} disabled={isLoading}>
                    Alterar contato
                  </button>
                  <button type="button" onClick={onResend} disabled={isLoading || remainingSeconds > 0}>
                    {remainingSeconds > 0 ? `Reenviar em ${remainingSeconds}s` : 'Reenviar código'}
                  </button>
                </S.SecondaryRow>
              ) : null}
            </S.Form>

            <S.Back type="button" onClick={onBack}>
              <ArrowLeft size={14} />
              Voltar para o login
            </S.Back>

            {phoneRecoveryEnabled && step === 'request' && contactMethod === 'email' ? (
              <span style={{ display: 'none' }} data-phone-recovery-available="true" />
            ) : null}
          </S.Card>
        </S.Panel>
        <S.HomeIndicator />
      </div>
    </S.Layout>
  );
}
