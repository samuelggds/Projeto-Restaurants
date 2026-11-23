import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import styled from 'styled-components';
import { normalizeRestaurantCategory } from '../../../../config/restaurantCategory';
import { evaluatePassword } from '../../../../features/password-policy';
import { CustomerLoginExperience } from '../../../Login/components/CustomerLoginExperience';
import { CustomerRecoveryExperience } from '../../../RecoverPassword/CustomerRecoveryExperience';
import { CustomerRegisterExperience } from '../../../Register/CustomerRegisterExperience';
import { demoPhotoPath, demoStores, type DemoSlug } from './catalog';

const initialAccount = { email: 'marina@example.test', password: 'Vitrine!Marina42' };
const demoCode = '246810';
const loginPath = '?acesso=login';
const registerPath = '?acesso=cadastro';
const recoveryPath = '?acesso=recuperar';

const AccessBar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: #fffaf1;
  color: #483c33;
  font:
    500 12px/1.4 system-ui,
    sans-serif;
  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    min-width: 38px;
    min-height: 36px;
    border: 1px solid #dccfc0;
    border-radius: 11px;
    background: white;
    color: inherit;
    cursor: pointer;
  }
`;

type Props = { slug: DemoSlug; onLogin: () => void; onBack: () => void };

export function DemoAuth({ slug, onLogin, onBack }: Props) {
  const [params, setParams] = useSearchParams();
  const page = params.get('acesso');
  const [account, setAccount] = useState(initialAccount);
  const [email, setEmail] = useState(initialAccount.email);
  const [password, setPassword] = useState(initialAccount.password);
  const [confirmation, setConfirmation] = useState(initialAccount.password);
  const [name, setName] = useState('Marina Costa');
  const [phone, setPhone] = useState('(11) 90000-0000');
  const [code, setCode] = useState(demoCode);
  const [reset, setReset] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const store = demoStores[slug];
  const mark = `${demoPhotoPath}/logo-${slug}.svg`;
  const branding = {
    name: store.name,
    description: '',
    logoUrl: mark,
    markUrl: mark,
    coverUrl: store.cover,
    primaryColor: store.color,
    category: normalizeRestaurantCategory(store.category),
  };
  const evaluation = evaluatePassword(password, confirmation);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page, reset, registered]);

  function openLogin() {
    setParams(loginPath, { replace: true });
    setReset(false);
    setRegistered(false);
    setError('');
  }
  function finish(action: () => void) {
    setParams({}, { replace: true });
    action();
  }
  function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (email.trim().toLowerCase() !== account.email || password !== account.password) {
      setError('Use as credenciais de exemplo da vitrine.');
      return;
    }
    finish(onLogin);
  }
  function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!evaluation.isValid) return;
    setAccount({ email: email.trim().toLowerCase(), password });
    setRegistered(true);
    setError('');
    setNotice('Cadastro e confirmação de e-mail simulados. Você já pode entrar.');
  }
  function recover(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reset) {
      setReset(true);
      setNotice(`Use o código fictício ${demoCode} para simular a recuperação.`);
      return;
    }
    if (code !== demoCode || !evaluation.isValid) {
      setNotice(`O código de demonstração é ${demoCode}.`);
      return;
    }
    setAccount({ email: email.trim().toLowerCase(), password });
    setNotice('Senha redefinida para esta demonstração. Você já pode entrar.');
    openLogin();
  }
  const google = {
    googleButtonRef,
    googleStatus: 'idle',
    googleMessage: '',
    onInitializeGoogle: () => finish(onLogin),
  };
  const info = notice || 'Use os dados fictícios já preenchidos para experimentar.';
  return (
    <>
      <AccessBar className="gx-demo-auth-bar">
        <button type="button" aria-label="Voltar ao cardápio" onClick={() => finish(onBack)}>
          <ArrowLeft size={18} />
        </button>
        <span role="status">{info}</span>
      </AccessBar>
      {page === 'cadastro' ? (
        <CustomerRegisterExperience
          branding={branding}
          name={name}
          email={email}
          phone={phone}
          password={password}
          confirmPassword={confirmation}
          evaluation={evaluation}
          isSubmitting={false}
          errorMessage={error}
          verificationPending={registered}
          resendingVerification={false}
          loginPath={loginPath}
          {...google}
          onNameChange={setName}
          onEmailChange={setEmail}
          onPhoneChange={setPhone}
          onPasswordChange={setPassword}
          onConfirmPasswordChange={setConfirmation}
          onSubmit={register}
          onBack={openLogin}
          onGoToLogin={openLogin}
          onResendVerification={() =>
            setNotice('Reenvio simulado. Toque em Ir para o login para continuar.')
          }
        />
      ) : page === 'recuperar' ? (
        <CustomerRecoveryExperience
          branding={branding}
          step={reset ? 'reset' : 'request'}
          contactMethod="email"
          identifier={email}
          code={code}
          newPassword={password}
          confirmPassword={confirmation}
          evaluation={evaluation}
          isLoading={false}
          remainingSeconds={0}
          phoneRecoveryEnabled={false}
          onIdentifierChange={setEmail}
          onCodeChange={setCode}
          onNewPasswordChange={setPassword}
          onConfirmPasswordChange={setConfirmation}
          onSubmit={recover}
          onBack={openLogin}
          onChangeContact={() => {
            setReset(false);
            setNotice('');
          }}
          onResend={() => {
            setCode(demoCode);
            setNotice(`Código de demonstração reenviado: ${demoCode}.`);
          }}
        />
      ) : (
        <CustomerLoginExperience
          branding={branding}
          email={email}
          password={password}
          rememberMe={remember}
          showPassword={showPassword}
          isLoading={false}
          feedback={error ? { type: 'error', message: error } : null}
          registerPath={registerPath}
          recoverPasswordPath={recoveryPath}
          {...google}
          showResendVerification={false}
          resendingVerification={false}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onRememberChange={setRemember}
          onTogglePassword={() => setShowPassword((value) => !value)}
          onSubmit={login}
          onNavigate={(path) => {
            setError('');
            setNotice('');
            setParams(path);
          }}
          onResendVerification={() => {}}
        />
      )}
    </>
  );
}
