import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import axios from 'axios';
import { ArrowRight, CircleCheck } from 'lucide-react';
import api from '../../../Services/api';
import * as S from './SalesContactForm.styles';

type PlanInterest = 'BASICO' | 'PREMIUM' | 'UNDECIDED';
type SalesChannel = 'DELIVERY' | 'TABLE' | 'PICKUP';

const states = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
];
const channels: { value: SalesChannel; label: string }[] = [
  { value: 'DELIVERY', label: 'Delivery' },
  { value: 'TABLE', label: 'Salão / mesas' },
  { value: 'PICKUP', label: 'Retirada' },
];
const businessTypes = [
  'Restaurante',
  'Pizzaria',
  'Hamburgueria',
  'Lanchonete',
  'Bar',
  'Cafeteria',
  'Outro',
];

function createRequestId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function submissionError(error: unknown) {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 429) {
      return 'Você atingiu o limite de tentativas. Aguarde até uma hora antes de enviar novamente.';
    }
    if (error.response?.status === 400 || error.response?.status === 409) {
      return 'Confira os dados preenchidos e tente enviar novamente.';
    }
  }
  return 'Não foi possível confirmar o envio. Seus dados continuam aqui; tente novamente em instantes.';
}

export function SalesContactForm({
  initialPlan = 'UNDECIDED',
  onPlanChange,
}: {
  initialPlan?: PlanInterest;
  onPlanChange?: (plan: PlanInterest) => void;
}) {
  const id = useId();
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [error, setError] = useState('');
  const [channelError, setChannelError] = useState(false);
  const pending = useRef(false);
  const request = useRef<{ payload: string; key: string } | null>(null);
  const planSelect = useRef<HTMLSelectElement>(null);
  const firstChannel = useRef<HTMLInputElement>(null);
  const successMessage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (planSelect.current) planSelect.current.value = initialPlan;
    request.current = null;
  }, [initialPlan]);

  useEffect(() => {
    if (status === 'success') successMessage.current?.focus();
  }, [status]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const form = event.currentTarget;
    const phoneInput = form.elements.namedItem('phone') as HTMLInputElement;
    const phoneDigits = phoneInput.value.replace(/\D/g, '');
    phoneInput.setCustomValidity(
      /^\d{10,15}$/.test(phoneDigits) ? '' : 'Informe um telefone com DDD, de 10 a 15 dígitos.',
    );
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const read = (name: string) => String(data.get(name) || '').trim();
    const selectedChannels = data.getAll('channels') as SalesChannel[];

    if (!selectedChannels.length) {
      setChannelError(true);
      firstChannel.current?.focus();
      return;
    }

    const payload = {
      name: read('name'),
      restaurantName: read('restaurantName'),
      email: read('email'),
      phone: read('phone').replace(/\D/g, ''),
      city: read('city'),
      state: read('state'),
      businessType: read('businessType'),
      channels: selectedChannels,
      planInterest: read('planInterest') as PlanInterest,
      message: read('message'),
      consent: data.get('consent') === 'on',
      website: read('website'),
    };
    const serializedPayload = JSON.stringify(payload);
    if (!request.current || request.current.payload !== serializedPayload) {
      request.current = { payload: serializedPayload, key: createRequestId() };
    }

    pending.current = true;
    setError('');
    setChannelError(false);
    setStatus('submitting');

    try {
      // Keep public leads independent of the restaurant's login and table session.
      const response = await axios.post('/sales-leads', payload, {
        baseURL: api.defaults.baseURL,
        timeout: api.defaults.timeout,
        withCredentials: false,
        headers: { 'Idempotency-Key': request.current.key },
      });
      if (response.data?.received !== true) throw new Error('Contato não confirmado.');
      setStatus('success');
    } catch (submissionFailure) {
      setError(submissionError(submissionFailure));
      setStatus('idle');
    } finally {
      pending.current = false;
    }
  }

  return (
    <S.Card>
      {status === 'success' ? (
        <S.Success ref={successMessage} role="status" tabIndex={-1}>
          <CircleCheck size={44} strokeWidth={1.5} aria-hidden="true" />
          <h3>Recebemos seu contato.</h3>
          <p>Nossa equipe vai conversar com você.</p>
        </S.Success>
      ) : (
        <>
          <h3>Conte um pouco sobre você.</h3>
          <S.Intro>Campos com * são obrigatórios.</S.Intro>
          <S.Form
            aria-label="Contato comercial"
            aria-busy={status === 'submitting'}
            onSubmit={submit}
            onChange={() => {
              if (pending.current) return;
              request.current = null;
              if (error) setError('');
              if (channelError) setChannelError(false);
            }}
          >
            {error && <S.ErrorMessage role="alert">{error}</S.ErrorMessage>}
            <S.Fields disabled={status === 'submitting'}>
              <S.Grid>
                <S.Field htmlFor={`${id}-name`}>
                  Seu nome *
                  <input
                    id={`${id}-name`}
                    name="name"
                    autoComplete="name"
                    placeholder="Como podemos chamar você?"
                    required
                    minLength={2}
                    maxLength={120}
                  />
                </S.Field>
                <S.Field htmlFor={`${id}-restaurant`}>
                  Nome do restaurante *
                  <input
                    id={`${id}-restaurant`}
                    name="restaurantName"
                    autoComplete="organization"
                    placeholder="Seu restaurante"
                    required
                    minLength={2}
                    maxLength={160}
                  />
                </S.Field>
                <S.Field htmlFor={`${id}-email`}>
                  E-mail *
                  <input
                    id={`${id}-email`}
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="voce@restaurante.com.br"
                    required
                    maxLength={254}
                  />
                </S.Field>
                <S.Field htmlFor={`${id}-phone`}>
                  Telefone com DDD *
                  <input
                    id={`${id}-phone`}
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="(11) 99999-9999"
                    required
                    minLength={10}
                    maxLength={25}
                    onInput={(event) => event.currentTarget.setCustomValidity('')}
                  />
                </S.Field>
                <S.Field htmlFor={`${id}-city`}>
                  Cidade *
                  <input
                    id={`${id}-city`}
                    name="city"
                    autoComplete="address-level2"
                    placeholder="Sua cidade"
                    required
                    minLength={2}
                    maxLength={100}
                  />
                </S.Field>
                <S.Field htmlFor={`${id}-state`}>
                  Estado *
                  <select
                    id={`${id}-state`}
                    name="state"
                    autoComplete="address-level1"
                    defaultValue=""
                    required
                  >
                    <option value="" disabled>
                      Selecione a UF
                    </option>
                    {states.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </S.Field>
                <S.Field htmlFor={`${id}-business`}>
                  Tipo de negócio *
                  <select id={`${id}-business`} name="businessType" defaultValue="" required>
                    <option value="" disabled>
                      Selecione
                    </option>
                    {businessTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </S.Field>
                <S.Field htmlFor={`${id}-plan`}>
                  Plano de interesse
                  <select
                    id={`${id}-plan`}
                    ref={planSelect}
                    name="planInterest"
                    defaultValue={initialPlan}
                    onChange={(event) => onPlanChange?.(event.currentTarget.value as PlanInterest)}
                  >
                    <option value="UNDECIDED">Quero uma orientação</option>
                    <option value="BASICO">Básico</option>
                    <option value="PREMIUM">Premium</option>
                  </select>
                </S.Field>
              </S.Grid>
              <S.Channels
                aria-invalid={channelError || undefined}
                aria-describedby={channelError ? `${id}-channels-error` : undefined}
              >
                <legend>Como você atende hoje? *</legend>
                <div>
                  {channels.map((channel, index) => (
                    <label key={channel.value}>
                      <input
                        ref={index === 0 ? firstChannel : undefined}
                        type="checkbox"
                        name="channels"
                        value={channel.value}
                        aria-invalid={channelError || undefined}
                        aria-describedby={channelError ? `${id}-channels-error` : undefined}
                      />
                      {channel.label}
                    </label>
                  ))}
                </div>
                {channelError && (
                  <S.ChannelError id={`${id}-channels-error`} role="alert">
                    Selecione ao menos uma forma de atendimento.
                  </S.ChannelError>
                )}
              </S.Channels>
              <S.OptionalMessage>
                <summary>
                  Quer contar mais? <span>(opcional)</span>
                </summary>
                <S.Field htmlFor={`${id}-message`}>
                  Sua mensagem
                  <textarea
                    id={`${id}-message`}
                    name="message"
                    maxLength={2000}
                    placeholder="Conte o que você quer melhorar na sua operação."
                    rows={3}
                  />
                </S.Field>
              </S.OptionalMessage>
              <S.Honeypot aria-hidden="true">
                <label htmlFor={`${id}-website`}>Deixe este campo vazio</label>
                <input
                  id={`${id}-website`}
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  maxLength={200}
                />
              </S.Honeypot>
              <S.Consent>
                <input name="consent" type="checkbox" required />
                <span>
                  Concordo que a GastroNexa use estes dados para entrar em contato comigo sobre a
                  plataforma. *
                </span>
              </S.Consent>
              <S.Submit type="submit" disabled={status === 'submitting'}>
                {status === 'submitting' ? 'Enviando seu contato…' : 'Quero conhecer a GastroNexa'}
                {status !== 'submitting' && <ArrowRight size={17} aria-hidden="true" />}
              </S.Submit>
            </S.Fields>
          </S.Form>
        </>
      )}
    </S.Card>
  );
}
