import { useState, type FormEvent } from 'react';
import styled from 'styled-components';
import { CheckCircle2, CreditCard, Link2, LoaderCircle, Search, ShieldCheck, UserRound, UserRoundCheck, UserRoundPlus } from 'lucide-react';
import nfcRegistrationService, { type NfcCustomerRecord } from '../../Services/nfcRegistrationService';

/*
 * Visuals reproduced from the user's GastroNexa-Cadastro-Vinculo-NFC ZIP:
 * gx-r-ready, gx-r-mode, gx-r-field, gx-r-visit-row, gx-r-check,
 * gx-r-existing-summary, and gx-r-button. Keep actual operations wired
 * to the authenticated backend; never ship the reference's mock customers.
 */
const Panel = styled.section`
  --r-bg: light-dark(#f6f7f9, #15191f);
  --r-surface: light-dark(#fff, #20262f);
  --r-ink: light-dark(#222832, #f0f3f7);
  --r-muted: light-dark(#64707e, #b1bccb);
  --r-line: light-dark(#e5e9ef, #3b4350);
  --r-soft: light-dark(#f3f5f8, #2b3441);
  --r-orange: light-dark(#b94011, #ff9b6b);
  --r-on-orange: light-dark(#fff, #2b1509);
  --r-tint: light-dark(#fff2e9, #3c2b24);
  --r-green: light-dark(#267746, #8bdbad);
  --r-green-bg: light-dark(#edf8f0, #243d30);
  --r-red: light-dark(#b3423b, #ffaba4);

  display: block;
  width: 100%;
  min-width: 0;
  margin: 0 auto;
  padding: 0;
  color: var(--r-ink);
  background: transparent;
  font: 400 14px/1.5 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
  color-scheme: light;

  &, & * { box-sizing: border-box; }
  && h1, && h2, && p, && dl { margin: 0; }
  && h1, && h2, && strong, && dd { font-weight: 500; }
  && button, && input { font-family: inherit; }
  && button { cursor: pointer; touch-action: manipulation; }
  && button:disabled { opacity: .58; cursor: not-allowed; }
  && button:focus-visible, && input:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--r-orange) 50%, transparent);
    outline-offset: 3px;
  }
  && svg { flex-shrink: 0; }

  .gx-r-ready {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--r-green);
    font-size: 11px;
    font-weight: 400;
  }
  .gx-r-ready svg { width: 15px; height: 15px; }
  && h1 {
    color: var(--r-ink);
    font-size: 27px;
    line-height: 1.2;
    letter-spacing: -.04em;
    margin: 14px 0 10px;
  }
  && .gx-r-lead {
    font-size: 13px;
    color: var(--r-muted);
    line-height: 1.65;
    margin-bottom: 22px;
  }
  .gx-r-mode {
    display: flex;
    gap: 5px;
    background: var(--r-soft);
    padding: 4px;
    border-radius: 10px;
    margin: 0 0 19px;
  }
  && .gx-r-mode button {
    flex: 1;
    min-width: 0;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: 0;
    border-radius: 7px;
    background: transparent;
    color: var(--r-muted);
    font-size: 13px;
    font-weight: 400;
    padding: 10px 7px;
  }
  && .gx-r-mode button[aria-pressed=true] {
    background: var(--r-surface);
    color: var(--r-ink);
    box-shadow: 0 1px 4px color-mix(in srgb, var(--r-ink) 9%, transparent);
  }
  .gx-r-mode svg { width: 17px; height: 17px; }
  .gx-r-form-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    font-size: 12px;
    color: var(--r-muted);
    margin-bottom: 4px;
  }
  && .gx-r-field {
    display: grid;
    gap: 7px;
    margin: 0 0 16px;
    color: var(--r-ink);
    font-size: 12px;
    font-weight: 400;
    min-width: 0;
  }
  && .gx-r-field input {
    width: 100%;
    min-width: 0;
    min-height: 46px;
    border: 1px solid var(--r-line);
    background: var(--r-surface);
    color: var(--r-ink);
    border-radius: 8px;
    padding: 11px 12px;
    font-size: 16px;
    font-weight: 400;
    line-height: 1.25;
  }
  && input::placeholder { color: var(--r-muted); opacity: 1; }
  .gx-r-visit-row {
    display: flex;
    gap: 15px;
    align-items: center;
    border-top: 1px solid var(--r-line);
    margin-top: 5px;
    padding-top: 18px;
  }
  && .gx-r-visit-row > .gx-r-field {
    position: relative;
    width: 125px;
    min-width: 125px;
  }
  .gx-r-visit-row .gx-r-field > span {
    position: absolute;
    right: 0;
    top: 2px;
    font-size: 11px;
    color: var(--r-muted);
  }
  .gx-r-visit-row > span { font-size: 11px; color: var(--r-muted); margin-top: 8px; }
  && .gx-r-check {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    min-height: 44px;
    margin: 3px 0 17px;
    padding-top: 6px;
    font-size: 11px;
    line-height: 1.6;
    color: var(--r-muted);
    font-weight: 400;
  }
  && .gx-r-check input {
    width: 17px;
    height: 17px;
    flex-shrink: 0;
    accent-color: var(--r-orange);
    margin: 1px 0 0;
  }
  && .gx-r-button {
    min-height: 46px;
    border: 1px solid var(--r-line);
    border-radius: 9px;
    padding: 11px 15px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    font-size: 13px;
    font-weight: 500;
    background: var(--r-surface);
    color: var(--r-ink);
    text-align: center;
  }
  && .gx-r-button-primary {
    border-color: var(--r-orange);
    background: var(--r-orange);
    color: var(--r-on-orange);
  }
  .gx-r-button svg { width: 16px; height: 16px; }
  .gx-r-wide { width: 100%; }
  .gx-r-search-row { display: flex; gap: 8px; min-width: 0; }
  .gx-r-search-row .gx-r-field { flex: 1; min-width: 0; margin-bottom: 0; }
  && .gx-r-search-row .gx-r-button { flex-shrink: 0; font-size: 12px; padding-inline: 13px; align-self: end; }
  && .gx-r-hint { color: var(--r-muted); font-size: 11px; line-height: 1.6; margin: 8px 0 16px; }
  .gx-r-search-results { display: grid; gap: 8px; margin: 18px 0; }
  && .gx-r-search-results > p { font-size: 12px; color: var(--r-muted); margin-bottom: 4px; }
  && .gx-r-result {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    text-align: left;
    min-height: 64px;
    border: 1px solid var(--r-line);
    border-radius: 9px;
    padding: 13px;
    background: var(--r-surface);
    color: var(--r-ink);
    width: 100%;
  }
  && .gx-r-result[aria-pressed=true] {
    border-color: var(--r-orange);
    background: var(--r-tint);
  }
  .gx-r-result strong { display: block; font-size: 14px; margin-bottom: 4px; }
  .gx-r-result span { font-size: 11px; color: var(--r-muted); display: block; overflow-wrap: anywhere; }
  .gx-r-not-found { padding: 19px 0 7px; }
  && .gx-r-not-found h2 { font-size: 17px; letter-spacing: -.02em; margin-bottom: 8px; }
  && .gx-r-not-found p { font-size: 12px; color: var(--r-muted); margin-bottom: 15px; }
  .gx-r-existing-summary {
    padding: 17px 16px;
    background: var(--r-soft);
    border-radius: 10px;
    margin: 19px 0;
  }
  .gx-r-found-heading { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .gx-r-person-avatar {
    width: 39px;
    height: 39px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
    border-radius: 50%;
    background: var(--r-tint);
    color: var(--r-orange);
  }
  .gx-r-found-heading > div { min-width: 0; flex: 1; }
  .gx-r-found-heading strong { display: block; font-size: 14px; overflow-wrap: anywhere; }
  .gx-r-found-heading span { display: block; font-size: 11px; color: var(--r-muted); margin-top: 3px; }
  .gx-r-existing-summary dl { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 17px 0 0; }
  .gx-r-existing-summary dt { font-size: 11px; color: var(--r-muted); }
  .gx-r-existing-summary dd { font-size: 13px; margin: 4px 0 0; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
  && .gx-r-error { font-size: 12px; color: var(--r-red); margin-bottom: 14px; }
  .gx-r-operation-status { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--r-muted); margin-bottom: 14px; }
  .gx-r-operation-status svg { width: 16px; height: 16px; color: var(--r-orange); animation: gx-r-spin 1s linear infinite; }
  @keyframes gx-r-spin { to { transform: rotate(360deg); } }
  @media (max-width: 550px) {
    && h1 { font-size: 25px; }
    .gx-r-mode button { font-size: 12px; gap: 6px; }
    .gx-r-search-row { flex-wrap: wrap; }
    .gx-r-search-row .gx-r-field { flex-basis: 100%; }
    && .gx-r-search-row .gx-r-button { width: 100%; }
    .gx-r-existing-summary { padding: 15px 12px; }
    .gx-r-existing-summary dl { grid-template-columns: 1fr; gap: 11px; }
  }
  @media (max-width: 360px) {
    && h1 { font-size: 24px; }
    .gx-r-mode button { font-size: 11px; }
    .gx-r-mode svg { display: none; }
    && .gx-r-visit-row > .gx-r-field { width: 115px; min-width: 115px; }
    .gx-r-visit-row { gap: 11px; }
  }
  @media (prefers-color-scheme: dark) {
    color-scheme: dark;
  }
  @media (prefers-reduced-motion: reduce) {
    &, & * { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
  }
`;

type Assignment = { customerId: string; cardId: string; displayCode: string; tableNumber: number | null };
export type NfcEnrollmentChoice = {
  customerId?: string;
  name?: string;
  cpf?: string;
  phone?: string;
  tableNumber: number | null;
  whatsappConsent: boolean;
};

function maskCpf(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return digits.slice(0, 3) + '.' + digits.slice(3);
  if (digits.length <= 9) return digits.slice(0, 3) + '.' + digits.slice(3, 6) + '.' + digits.slice(6);
  return digits.slice(0, 3) + '.' + digits.slice(3, 6) + '.' + digits.slice(6, 9) + '-' + digits.slice(9);
}

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits ? '(' + digits : '';
  const start = '(' + digits.slice(0, 2) + ') ';
  if (digits.length <= 7) return start + digits.slice(2);
  const prefix = digits.length > 10 ? 7 : 6;
  return start + digits.slice(2, prefix) + '-' + digits.slice(prefix);
}

export function NfcCardEnrollment({ cardCode, restaurantName, onEnroll }: {
  cardCode: string;
  restaurantName: string;
  onEnroll: (payload: NfcEnrollmentChoice) => Promise<Assignment>;
}) {
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [table, setTable] = useState('');
  const [consent, setConsent] = useState(false);
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<NfcCustomerRecord[]>([]);
  const [selected, setSelected] = useState<NfcCustomerRecord | null>(null);
  const [searchCompleted, setSearchCompleted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const switchMode = (next: 'new' | 'existing') => {
    if (busy) return;
    setMode(next);
    setTable('');
    setConsent(false);
    setSelected(null);
    setQuery('');
    setFound([]);
    setSearchCompleted(false);
    setError('');
    if (next === 'existing') { setName(''); setCpf(''); setPhone(''); }
  };

  const search = async () => {
    if (busy) return;
    const digits = query.replace(/\D/g, '');
    if (digits.length !== 10 && digits.length !== 11) {
      setError('Informe o CPF completo ou telefone com DDD.');
      return;
    }
    setBusy(true);
    setSelected(null);
    setFound([]);
    setError('');
    setSearchCompleted(false);
    try {
      setFound(await nfcRegistrationService.identitySearch(digits));
      setSearchCompleted(true);
    } catch (cause) {
      const err = cause as { response?: { data?: { error?: string } } };
      setError(err.response?.data?.error || 'Não foi possível consultar os cadastros. Tente novamente.');
    } finally {
      setBusy(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const tableNumber = table ? Number(table) : null;
    if (tableNumber !== null && (!Number.isSafeInteger(tableNumber) || tableNumber <= 0 || tableNumber > 100000)) {
      setError('Informe uma mesa válida.');
      return;
    }
    if (mode === 'existing' && !selected) {
      setError('Selecione o cliente encontrado.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (mode === 'new') {
        const matches = await nfcRegistrationService.identitySearch(cpf);
        if (matches.length) {
          setMode('existing');
          setQuery(cpf);
          setFound(matches);
          setSearchCompleted(true);
          setError('CPF já cadastrado neste restaurante. Selecione o cadastro existente.');
          return;
        }
      }
      await onEnroll({
        ...(mode === 'existing' && selected
          ? { customerId: selected.id }
          : { name: name.trim(), cpf, phone }),
        tableNumber,
        whatsappConsent: consent,
      });
    } catch (cause) {
      const err = cause as { response?: { data?: { error?: string } } };
      setError(err.response?.data?.error || 'Não foi possível vincular este cartão. Confira os dados.');
    } finally {
      setBusy(false);
    }
  };

  return <Panel aria-label="Cadastro e vínculo NFC" aria-busy={busy} data-busy={busy}>
    <p className="gx-r-ready"><CheckCircle2 aria-hidden="true" /> Cartão disponível identificado. Pronto para vincular.</p>
    <h1>Quem vai usar este cartão?</h1>
    <p className="gx-r-lead">Cadastre o cliente ou encontre seu cadastro neste restaurante.</p>

    <div className="gx-r-mode" role="group" aria-label="Tipo de cadastro">
      <button type="button" aria-pressed={mode === 'new'} onClick={() => switchMode('new')} disabled={busy}>
        <UserRoundPlus aria-hidden="true" /> Novo cliente
      </button>
      <button type="button" aria-pressed={mode === 'existing'} onClick={() => switchMode('existing')} disabled={busy}>
        <UserRoundCheck aria-hidden="true" /> Já cadastrado
      </button>
    </div>

    <form onSubmit={event => void submit(event)}>
      {mode === 'new' ? <>
        <div className="gx-r-form-heading"><span>Dados do cliente</span></div>
        <label className="gx-r-field">Nome completo
          <input value={name} onChange={e => setName(e.target.value)} autoComplete="off"
            maxLength={120} minLength={2} placeholder="Nome do cliente" required disabled={busy} />
        </label>
        <label className="gx-r-field">CPF
          <input inputMode="numeric" autoComplete="off" value={maskCpf(cpf)}
            onChange={e => setCpf(e.target.value.replace(/\D/g, '').slice(0, 11))}
            placeholder="000.000.000-00" minLength={14} maxLength={14} required disabled={busy} />
        </label>
        <label className="gx-r-field">Telefone
          <input inputMode="tel" autoComplete="off" value={maskPhone(phone)}
            onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
            placeholder="(00) 00000-0000" required disabled={busy} />
        </label>
      </> : <>
        <label className="gx-r-field">CPF ou telefone do cliente
          <input inputMode="numeric" autoComplete="off" value={query}
            onChange={e => { setQuery(e.target.value.replace(/\D/g, '').slice(0, 11)); setFound([]); setSelected(null); setSearchCompleted(false); }}
            placeholder="Com ou sem pontuação" disabled={busy} />
        </label>
        <button className="gx-r-button gx-r-wide" type="button" onClick={() => void search()}
          disabled={busy || ![10, 11].includes(query.replace(/\D/g, '').length)}>
          <Search aria-hidden="true" /> Buscar
        </button>
        <p className="gx-r-hint">A busca consulta somente os clientes de {restaurantName || 'seu restaurante'}.</p>

        {searchCompleted && !found.length && <section className="gx-r-not-found" role="status">
          <h2>Nenhum cadastro encontrado</h2>
          <p>Não encontramos este CPF ou telefone no restaurante autenticado.</p>
          <button type="button" className="gx-r-button gx-r-wide" onClick={() => {
            const previous = query;
            switchMode('new');
            if (previous.length === 11) setCpf(previous);
            else setPhone(previous);
          }}>Cadastrar novo cliente</button>
        </section>}
        {found.length > 0 && <div className="gx-r-search-results">
          <p>Selecione o cliente antes de vincular ao cartão.</p>
          {found.map(customer => <button type="button" key={customer.id} className="gx-r-result"
            aria-pressed={selected?.id === customer.id}
            onClick={() => { setSelected(customer); setTable(''); setConsent(false); setError(''); }} disabled={busy}>
            <div><strong>{customer.name}</strong>
              <span>{customer.cpfMasked} · {customer.phoneMasked}</span></div>
            <UserRoundCheck aria-hidden="true" size={18} />
          </button>)}
        </div>}
        {selected && <div className="gx-r-existing-summary" role="status">
          <div className="gx-r-found-heading">
            <span className="gx-r-person-avatar"><UserRound aria-hidden="true" size={21} /></span>
            <div><strong>{selected.name}</strong><span>Cadastro localizado neste restaurante</span></div>
            <CheckCircle2 aria-hidden="true" size={17} />
          </div>
          <dl>
            <div><dt>CPF</dt><dd>{selected.cpfMasked}</dd></div>
            <div><dt>Telefone</dt><dd>{selected.phoneMasked}</dd></div>
            <div><dt>Cartão NFC</dt><dd>{cardCode}</dd></div>
            <div><dt>Restaurante</dt><dd>{restaurantName}</dd></div>
          </dl>
          <p className="gx-r-hint">Confira os dados e confirme o vínculo. O cadastro original será preservado.</p>
        </div>}
      </>}

      {(mode === 'new' || selected) && <>
        <div className="gx-r-visit-row">
          <label className="gx-r-field">Mesa <span>opcional</span>
            <input type="text" inputMode="numeric" maxLength={6}
              placeholder="Ex.: 08" value={table}
              onChange={e => setTable(e.target.value.replace(/\D/g, '').slice(0, 6))}
              disabled={busy} />
          </label>
          <span>Sem mesa? Pode continuar.</span>
        </div>
        <label className="gx-r-check">
          <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} disabled={busy} />
          <small>Cliente autoriza comunicações pelo WhatsApp (opcional)</small>
        </label>
        {busy && <p className="gx-r-operation-status" role="status">
          <LoaderCircle aria-hidden="true" /> Verificando e vinculando no servidor...
        </p>}
        {error && <p className="gx-r-error" role="alert">{error}</p>}
        <button className="gx-r-button gx-r-button-primary gx-r-wide" type="submit" disabled={busy}>
          <Link2 aria-hidden="true" /> {busy ? 'Confirmando no servidor...' : mode === 'new' ? 'Cadastrar e vincular' : 'Vincular cadastro existente'}
        </button>
      </>}
      {error && mode === 'existing' && !selected && <p className="gx-r-error" role="alert">{error}</p>}
    </form>
    <p className="gx-r-hint" style={{ textAlign: 'center', marginTop: 19 }}>
      <ShieldCheck aria-hidden="true" size={13} style={{ verticalAlign: 'middle', marginRight: 5 }} />
      Confirmação segura pelo restaurante autenticado.
    </p>
  </Panel>;
}
