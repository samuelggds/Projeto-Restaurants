import { lazy, Suspense, useEffect, useRef, useState, type FormEvent } from 'react';
import { isAxiosError } from 'axios';
import { CircleCheck, MailCheck } from 'lucide-react';
import authService from '../../../Services/authService';
import { MfaVerificationModal } from '../../Login/components/MfaVerificationModal';
import { validatePassword, PRIVILEGED_PASSWORD_POLICY } from '../../../features/password-policy';
import {
  RESTAURANT_CATEGORY_OPTIONS,
  type RestaurantCategory,
} from '../../../config/restaurantCategory';
import { isValidWhatsappOrderPhone } from '../../Home/domain/checkout';
import { demoStores, type DemoSlug } from '../landing/storefrontDemo/catalog';
import {
  activateTrial,
  getTrialAvailability,
  loadTrialPlans,
  requestTrialCode,
  trialRequestError,
  type TrialAccess,
  type TrialChallenge,
  type TrialDetails,
  type TrialPlan,
} from './trialApi';
import TrialMenuSetup from './TrialMenuSetup';
import { useTrialOwnerLogin } from './useTrialOwnerLogin';
import './RestaurantTrialSignup.css';

const TrialBillingPreferences = lazy(() =>
  import('../../admin/components/RecurringBillingPayment').then(({ RecurringBillingPayment }) => ({
    default: RecurringBillingPayment,
  })),
);

const storefronts: Partial<Record<RestaurantCategory, DemoSlug>> = {
  PIZZARIA: 'forno-alto',
  HAMBURGUERIA: 'braseiro-burger',
  ACAITERIA: 'acai-da-mata',
  RESTAURANTE: 'salvia-trattoria',
};
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const calendar = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'America/Sao_Paulo',
});

export default function RestaurantTrialSignup() {
  const ownerLogin = useTrialOwnerLogin();
  const query = new URLSearchParams(window.location.search);
  const demoModel = (query.get('modelo') || '').toUpperCase();
  const demo = Object.hasOwn(storefronts, demoModel)
    ? demoStores[storefronts[demoModel as RestaurantCategory]]
    : null;
  const [category, setCategory] = useState<RestaurantCategory | ''>('');
  const [requestedPlan, setRequestedPlan] = useState(query.get('plano') || 'BASICO');
  const [plans, setPlans] = useState<TrialPlan[] | null>(null);
  const [registration, setRegistration] = useState<'loading' | 'enabled' | 'contact' | 'error'>(
    'loading',
  );
  const [planRequest, setPlanRequest] = useState(0);
  const [details, setDetails] = useState<TrialDetails | null>(null);
  const [challenge, setChallenge] = useState<TrialChallenge | null>(null);
  const [access, setAccess] = useState<TrialAccess | null>(null);
  const [busy, setBusy] = useState(false);
  const [billingOpen, setBillingOpen] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const codeInput = useRef<HTMLInputElement>(null);
  const finishHeading = useRef<HTMLHeadingElement>(null);
  const [notice, setNotice] = useState('');
  const plan = plans?.find((item) => item.code === requestedPlan) || plans?.[0];
  const selectedDemoSlug = category && storefronts[category];
  const photo = selectedDemoSlug
    ? demoStores[selectedDemoSlug].cover
    : category
      ? null
      : demo?.cover;

  useEffect(() => {
    document.title = 'Ativar meu restaurante | GastroNexa';
    const controller = new AbortController();
    getTrialAvailability(controller.signal)
      .then((mode) => {
        if (!controller.signal.aborted) setRegistration(mode);
      })
      .catch(() => {
        if (!controller.signal.aborted) setRegistration('error');
      });
    loadTrialPlans(controller.signal)
      .then((available) => {
        if (!controller.signal.aborted) setPlans(available);
      })
      .catch(() => {
        if (!controller.signal.aborted) setPlans([]);
      });
    return () => controller.abort();
  }, [planRequest]);

  useEffect(() => {
    if (access) finishHeading.current?.focus();
    else if (challenge) codeInput.current?.focus();
  }, [challenge, access]);

  async function sendCode(values: TrialDetails) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const next = await requestTrialCode(values.email);
      if (challenge) setNotice('Novo código enviado. Use o código mais recente.');
      if (codeInput.current) codeInput.current.value = '';
      setDetails(values);
      setChallenge(next);
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.code === 'TRIAL_SIGNUP_UNAVAILABLE') {
        setRegistration('contact');
        setChallenge(null);
        return;
      }
      setError(
        trialRequestError(
          err,
          'Não foi possível enviar o código. Confira sua conexão e tente novamente.',
        ),
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!category || !plan || registration !== 'enabled' || pending.current) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const read = (key: string) => String(values.get(key) || '').trim();
    const phone = form.elements.namedItem('whatsapp') as HTMLInputElement;
    phone.setCustomValidity(
      isValidWhatsappOrderPhone(phone.value) ? '' : 'Informe um número brasileiro com DDD.',
    );
    if (!form.reportValidity()) return;
    void sendCode({
      email: read('email').toLowerCase(),
      restaurantName: read('restaurantName'),
      ownerName: read('ownerName'),
      whatsapp: read('whatsapp').replace(/\D/g, ''),
      category,
      plan: plan.code,
      quotedMonthlyFee: plan.monthlyFee,
      quotedTrialDays: plan.trialDays,
    });
  }

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!challenge || !details || pending.current) return;
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const fields = new FormData(form);
    const password = String(fields.get('password') || '');
    const passwordInput = form.elements.namedItem('password') as HTMLInputElement;
    const [passwordError] = validatePassword(password, password, PRIVILEGED_PASSWORD_POLICY);
    passwordInput.setCustomValidity(passwordError || '');
    if (!form.reportValidity()) return;
    pending.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await activateTrial({
        ...details,
        challenge: challenge.challenge,
        code: String(fields.get('code') || ''),
        password,
      });
      setAccess(result);
      setChallenge(null);
      await ownerLogin.signIn(result, details.email, password);
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.code === 'TRIAL_SIGNUP_UNAVAILABLE') {
        setRegistration('contact');
        setChallenge(null);
      } else if (isAxiosError(err) && err.response?.data?.code === 'TRIAL_PLAN_CHANGED') {
        setChallenge(null);
        setPlans(null);
        setPlanRequest((previous) => previous + 1);
        setError(
          'As condições desse plano mudaram. Revise o plano atualizado e confirme sua escolha.',
        );
      } else {
        setError(
          trialRequestError(
            err,
            'Não foi possível confirmar a ativação. Tente novamente com o mesmo código.',
          ),
        );
      }
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <main className="gx-trial">
      <header className="gx-trial__nav">
        <a className="gx-trial__brand" href="/" aria-label="GastroNexa, página inicial">
          <img src="/gastronexa-logo.svg" alt="" />
          <span>GastroNexa</span>
        </a>
        <a href="/#vitrines">Voltar aos cardápios</a>
      </header>
      <div className={access ? 'gx-trial__layout gx-trial__layout--complete' : 'gx-trial__layout'}>
        <aside className="gx-trial__story" aria-label="Seu cardápio na GastroNexa">
          <img src={photo || '/marketing-vitrines/hero-restaurantes-mobile-640.webp'} alt="" />
          <div>
            <p>
              Seu restaurante,
              <br />
              <em>com a sua cara.</em>
            </p>
            <span>
              {demo
                ? `Você experimentou o cardápio ${demo.name}. Agora escolha o tipo da sua loja.`
                : 'Escolha o tipo da sua loja e personalize o cardápio com seus pratos e preços.'}
            </span>
          </div>
        </aside>
        <section className="gx-trial__panel" aria-labelledby="gx-trial-title">
          {access && details ? (
            <>
              <CircleCheck className="gx-trial__icon" aria-hidden="true" />
              <h1 id="gx-trial-title" ref={finishHeading} tabIndex={-1}>
                Teste ativado!
              </h1>
              <p>
                O restaurante <strong>{details.restaurantName}</strong> já tem acesso à GastroNexa.
                Seu teste vai até <strong>{calendar.format(new Date(access.trialEndsAt))}</strong>.
              </p>
              {ownerLogin.authorized ? (
                <>
                  <TrialMenuSetup access={access} details={details} />
                  <div className="gx-trial__billing">
                    <button
                      type="button"
                      aria-expanded={billingOpen}
                      aria-controls="gx-trial-payment"
                      onClick={() => setBillingOpen(!billingOpen)}
                    >
                      {billingOpen
                        ? 'Fechar opções de pagamento'
                        : 'Escolher Pix ou cartão para a mensalidade'}
                    </button>
                    <div id="gx-trial-payment" hidden={!billingOpen}>
                      {billingOpen && (
                        <Suspense fallback={<p role="status">Carregando opções de pagamento…</p>}>
                          <TrialBillingPreferences />
                        </Suspense>
                      )}
                    </div>
                  </div>
                  <a className="gx-trial__primary" href="/admin">
                    Abrir meu painel
                  </a>
                </>
              ) : ownerLogin.attempting ? (
                <p role="status">Abrindo o editor do seu cardápio…</p>
              ) : ownerLogin.mfa ? (
                <MfaVerificationModal
                  open
                  {...ownerLogin.mfa}
                  onVerify={(code) => ownerLogin.verifyCode(access, details.email, code)}
                  onSelectChannel={(channel) => authService.selectLogin2faChannel({ channel })}
                  onResend={(channel) => authService.resendLogin2fa({ channel })}
                  onSuccess={ownerLogin.closeMfa}
                  onCancel={ownerLogin.closeMfa}
                />
              ) : (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = event.currentTarget;
                    if (!form.reportValidity()) return;
                    const password = String(new FormData(form).get('ownerPassword') || '');
                    form.reset();
                    void ownerLogin.signIn(access, details.email, password);
                  }}
                >
                  {ownerLogin.issue && (
                    <p className="gx-trial__error" role="alert">
                      {ownerLogin.issue}
                    </p>
                  )}
                  <fieldset className="gx-trial__fields">
                    <label>
                      Senha de {details.email}
                      <input
                        type="password"
                        name="ownerPassword"
                        autoComplete="current-password"
                        required
                      />
                    </label>
                  </fieldset>
                  <button type="submit" className="gx-trial__primary">
                    Entrar e configurar o cardápio
                  </button>
                </form>
              )}
              <p className="gx-trial__hint">
                Guarde o{' '}
                <a href={access.adminPath} referrerPolicy="no-referrer">
                  link privado do restaurante
                </a>{' '}
                para os próximos acessos.
              </p>
            </>
          ) : registration !== 'enabled' ? (
            <>
              <h1 id="gx-trial-title">Ative seu restaurante</h1>
              {registration === 'contact' ? (
                <>
                  <p>
                    O cadastro de novos restaurantes está com a equipe GastroNexa. Fale com a gente
                    para iniciar sua ativação.
                  </p>
                  <a className="gx-trial__primary" href="/#contato">
                    Falar com a equipe
                  </a>
                </>
              ) : registration === 'error' ? (
                <>
                  <p role="alert">Não foi possível consultar a disponibilidade do cadastro.</p>
                  <button
                    type="button"
                    className="gx-trial__primary"
                    onClick={() => {
                      setRegistration('loading');
                      setPlanRequest((n) => n + 1);
                    }}
                  >
                    Tentar novamente
                  </button>
                </>
              ) : (
                <p role="status">Verificando a disponibilidade do teste…</p>
              )}
            </>
          ) : challenge && details && plan ? (
            <>
              <MailCheck className="gx-trial__icon" aria-hidden="true" />
              <h1 id="gx-trial-title">Confirme seu e-mail</h1>
              <p>
                Enviamos um código de seis dígitos para <strong>{details.email}</strong>. Ele vale
                por {challenge.expiresInMinutes} minutos.
              </p>
              <form onSubmit={confirm} aria-busy={busy}>
                <fieldset disabled={busy} className="gx-trial__fields">
                  <label>
                    Código do e-mail
                    <input
                      name="code"
                      ref={codeInput}
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      required
                    />
                  </label>
                  <label>
                    Crie sua senha
                    <input
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={128}
                      required
                      aria-describedby="gx-trial-password"
                      onInput={(e) => e.currentTarget.setCustomValidity('')}
                    />
                  </label>
                  <small id="gx-trial-password">
                    Use ao menos 8 caracteres, com maiúscula, minúscula, número e símbolo.
                  </small>
                  <div className="gx-trial__terms">
                    <strong>Hoje, {currency.format(0)}</strong>
                    <span>
                      {plan.name} com {plan.trialDays}{' '}
                      {plan.trialDays === 1 ? 'dia útil' : 'dias úteis'} de teste. Depois, a
                      mensalidade será de {currency.format(plan.monthlyFee)}, com pagamento por Pix.
                      Você pode escolher o cartão após ativar a conta.
                    </span>
                  </div>
                  <label className="gx-trial__agree">
                    <input type="checkbox" required />{' '}
                    <span>
                      Concordo com o plano, o valor após o teste e os{' '}
                      <a href="/termos" target="_blank" rel="noopener noreferrer">
                        termos de uso
                      </a>
                      .
                    </span>
                  </label>
                </fieldset>
                {error && (
                  <p className="gx-trial__error" role="alert">
                    {error}
                  </p>
                )}
                {notice && <p role="status">{notice}</p>}
                <button type="submit" className="gx-trial__primary" disabled={busy}>
                  {busy ? 'Aguarde…' : 'Ativar meu restaurante'}
                </button>
                <div className="gx-trial__actions">
                  <button type="button" disabled={busy} onClick={() => void sendCode(details)}>
                    Reenviar código
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setError('');
                      setNotice('');
                      setChallenge(null);
                    }}
                  >
                    Editar dados
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              <h1 id="gx-trial-title">Ative seu restaurante</h1>
              <p>
                Escolha seu tipo de cozinha para começar com um cardápio editável, com pratos e
                fotos.
              </p>
              <form onSubmit={start} aria-busy={busy}>
                <fieldset disabled={busy} className="gx-trial__fields">
                  <div className="gx-trial__pair">
                    <label>
                      Nome do restaurante
                      <input
                        name="restaurantName"
                        autoComplete="organization"
                        defaultValue={details?.restaurantName}
                        minLength={2}
                        maxLength={120}
                        required
                      />
                    </label>
                    <label>
                      Tipo de restaurante
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as RestaurantCategory)}
                        required
                        name="category"
                      >
                        <option value="" disabled>
                          Selecione o tipo
                        </option>
                        {RESTAURANT_CATEGORY_OPTIONS.map(({ value, label }) => (
                          <option value={value} key={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label>
                    Nome do proprietário
                    <input
                      name="ownerName"
                      autoComplete="name"
                      defaultValue={details?.ownerName}
                      minLength={2}
                      maxLength={120}
                      required
                    />
                  </label>
                  <div className="gx-trial__pair">
                    <label>
                      E-mail de acesso
                      <input
                        name="email"
                        type="email"
                        autoComplete="email"
                        defaultValue={details?.email}
                        maxLength={254}
                        required
                      />
                    </label>
                    <label>
                      WhatsApp com DDD
                      <input
                        name="whatsapp"
                        type="tel"
                        autoComplete="tel"
                        defaultValue={details?.whatsapp}
                        maxLength={24}
                        required
                        placeholder="(11) 99999-9999"
                        onInput={(e) => e.currentTarget.setCustomValidity('')}
                      />
                    </label>
                  </div>
                  <label>
                    Plano
                    <select
                      name="plan"
                      value={plan?.code || ''}
                      onChange={(e) => setRequestedPlan(e.target.value)}
                      disabled={!plan}
                    >
                      {!plan && (
                        <option value="">
                          {plans ? 'Planos indisponíveis' : 'Carregando planos…'}
                        </option>
                      )}
                      {plans?.map((item) => (
                        <option value={item.code} key={item.code}>
                          {item.name} · {currency.format(item.monthlyFee)}/mês
                        </option>
                      ))}
                    </select>
                  </label>
                </fieldset>
                {plan && (
                  <p className="gx-trial__hint">
                    {plan.trialDays} {plan.trialDays === 1 ? 'dia útil' : 'dias úteis'} de teste
                    grátis. A mensalidade do plano começa após o teste.
                  </p>
                )}
                {plans?.length === 0 && (
                  <p role="alert" className="gx-trial__error">
                    Os planos para teste estão indisponíveis.{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setPlans(null);
                        setPlanRequest((n) => n + 1);
                      }}
                    >
                      Tentar novamente
                    </button>
                  </p>
                )}
                {error && (
                  <p className="gx-trial__error" role="alert">
                    {error}
                  </p>
                )}
                <button className="gx-trial__primary" type="submit" disabled={busy || !plan}>
                  {busy ? 'Enviando código…' : 'Receber código por e-mail'}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
