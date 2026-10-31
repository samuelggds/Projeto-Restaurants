import { useRef, useState, type FormEvent } from 'react';
import styled from 'styled-components';
import { CheckCircle2, CreditCard, Link2, Search, ShieldCheck, Store, UserPlus, UserRoundCheck } from 'lucide-react';
import { useAuth } from '../../contexts/authContext';
import nfcRegistrationService, { type NfcCustomerRecord } from '../../Services/nfcRegistrationService';
import nfcComandaService from '../../Services/nfcComandaService';
import { scanNfcCard } from './nfcWebReader';

const Layout = styled.section`
  color-scheme: light dark; --r-bg: light-dark(#f6f7f9,#15191f); --r-surface:light-dark(#fff,#20262f);
  --r-ink:light-dark(#222832,#f0f3f7); --r-muted:light-dark(#64707e,#b1bccb);
  --r-line:light-dark(#e5e9ef,#3b4350); --r-soft:light-dark(#f3f5f8,#2b3441);
  --r-orange:light-dark(#b94011,#ff9b6b); --r-green:light-dark(#267746,#8bdbad);
  background:var(--r-bg); color:var(--r-ink); max-width:736px; width:100%; min-width:0; margin:auto;
  padding:clamp(12px,3vw,30px); border-radius:18px; font:400 14px/1.5 Inter,system-ui,sans-serif;
  *,*::before,*::after {box-sizing:border-box}
  h1,h2,p {margin:0} h1{font-size:clamp(23px,5vw,27px);letter-spacing:-.04em;font-weight:600}
  .brand{display:flex;align-items:center;gap:12px;margin-bottom:25px;font-size:26px;font-weight:650;letter-spacing:-.04em}
  .brand span{color:var(--r-orange)}
  .context{display:flex;flex-wrap:wrap;justify-content:space-between;gap:10px;margin-bottom:15px;color:var(--r-muted);font-size:12px}
  .context div,.ready{display:flex;align-items:center;gap:7px}
  .surface{background:var(--r-surface);border:1px solid var(--r-line);border-radius:15px;padding:clamp(16px,4vw,30px);display:grid;gap:17px}
  .ready{color:var(--r-green);font-size:12px}.lead,.hint{color:var(--r-muted);font-size:13px}
  .modes{display:flex;gap:5px;background:var(--r-soft);border-radius:10px;padding:4px}
  button,input{font:inherit}button{cursor:pointer;min-height:44px;border-radius:9px;padding:10px 13px}
  button:disabled{opacity:.55;cursor:not-allowed}
  button:focus-visible,input:focus-visible{outline:3px solid var(--r-orange);outline-offset:3px}
  .modes button{flex:1;min-width:0;border:0;background:transparent;color:var(--r-muted)}
  .modes button[aria-pressed=true]{background:var(--r-surface);color:var(--r-ink);box-shadow:0 1px 4px #0002}
  form,.fields,label{display:grid;gap:13px}label{gap:6px;font-size:12px;font-weight:600}
  .fields{grid-template-columns:repeat(2,minmax(0,1fr))}.wide{grid-column:1/-1}
  input:not([type=checkbox]){width:100%;min-width:0;min-height:46px;border:1px solid var(--r-line);border-radius:8px;background:var(--r-surface);color:var(--r-ink);padding:11px}
  .checkbox{display:flex;align-items:flex-start;gap:9px;font-weight:400;color:var(--r-muted)}.checkbox input{accent-color:var(--r-orange);width:17px;height:17px}
  .primary{background:var(--r-orange);color:light-dark(#fff,#201209);border:1px solid var(--r-orange);font-weight:650}
  .secondary{background:var(--r-surface);color:var(--r-ink);border:1px solid var(--r-line)}
  .full{width:100%}.person{display:grid;gap:5px;background:var(--r-soft);padding:16px;border-radius:10px}
  .person small{color:var(--r-muted)}.error{color:light-dark(#a42c28,#ffaba4);font-size:13px}
  .actions{display:flex;gap:9px;flex-wrap:wrap}.actions button{flex:1}
  .brand{font-weight:500}
  .surface{box-shadow:0 5px 20px #00000008}
  .person{border:1px solid var(--r-line)}
  .person strong{font-size:14px}
  .primary,.secondary{display:inline-flex;align-items:center;justify-content:center;gap:9px;font-weight:500}
  .fields label,.surface>form label{font-weight:500}
  @media(max-width:550px){
    padding:24px 16px 20px;border-radius:12px;
    .brand{font-size:25px;margin-bottom:23px}
    .surface{padding:22px 20px;gap:16px}
    h1{font-size:25px;line-height:1.2}
    .lead{line-height:1.65}
    .fields{grid-template-columns:1fr;gap:15px}
    .wide{grid-column:auto}
    input:not([type=checkbox]){font-size:16px}
    .modes button{font-size:12px;gap:6px;padding-inline:5px}
    .context{gap:9px}
    .context div{font-size:11px}
    .person{padding:15px 12px}
    .actions{flex-direction:column}
    .actions button{width:100%}
  }
  @media(max-width:360px){
    padding-inline:12px;
    .surface{padding:21px 16px}
    .brand{font-size:23px}
    h1{font-size:24px}
    .modes button{font-size:11px}
    .modes svg{display:none}
  }
  @media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}
`;

type Props = { onCompleted?: () => void; onBackToPanel?: () => void };
const digits = (value: string) => value.replace(/\D/g, '');
const errorText = (error: unknown) => {
  const response = error as { response?: { data?: { error?: string } } };
  return response.response?.data?.error || (error instanceof Error ? error.message : 'Não foi possível concluir a operação.');
};
export function NfcBackendRegistration({ onCompleted, onBackToPanel }: Props) {
  const { user } = useAuth();
  const [mode, setMode] = useState<'new'|'existing'>('new');
  const [token, setToken] = useState('');
  const [cardCode, setCardCode] = useState('');
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [searchCpf, setSearchCpf] = useState('');
  const [table, setTable] = useState('');
  const [consent, setConsent] = useState(false);
  const [customer, setCustomer] = useState<NfcCustomerRecord|null>(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const requestKey = useRef('');
  const restaurantName = String(user?.restaurant?.name || 'Restaurante autenticado');
  const guarded = async (action: () => Promise<void>) => {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError('');
    try { await action(); } catch (e) { setError(errorText(e)); }
    finally { locked.current = false; setBusy(false); }
  };
  const readCard = () => guarded(async () => {
    const scanned = await scanNfcCard();
    // Resolve is server-owned; a prepared card is additionally verified by /cards/intake.
    const result = await nfcRegistrationService.resolve(scanned);
    if (result.status !== 'READY' || result.customerId) throw new Error('Este cartão não está disponível. Consulte o atendimento atual ou finalize a devolução.');
    setToken(scanned); setCardCode(result.displayCode);
    setCustomer(null); setSuccess('');
  });
  const changeMode = (next: 'new'|'existing') => {
    if (busy) return;
    setMode(next); setCustomer(null); setTable(''); setConsent(false); setError('');
  };
  const lookup = (value: string) => guarded(async () => {
    if (digits(value).length !== 11) throw new Error('Informe o CPF completo com 11 dígitos.');
    const found = await nfcRegistrationService.lookup(digits(value));
    setCustomer(found);
    if (!found) setError('Cadastro não encontrado neste restaurante. Utilize Novo cliente para cadastrar.');
    else { setMode('existing'); setTable(''); setConsent(false); }
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void guarded(async () => {
      if (!token || !cardCode) throw new Error('Leia e valide primeiro um cartão NFC disponível.');
      const number = table.trim() ? Number(table) : null;
      if (number !== null && (!Number.isSafeInteger(number) || number < 1 || number > 100000)) throw new Error('Informe um número de mesa válido.');
      let existing = customer;
      if (mode === 'new') {
        const found = await nfcRegistrationService.lookup(digits(cpf));
        if (found) {
          setCustomer(found); setMode('existing'); setTable(''); setConsent(false);
          throw new Error('CPF já cadastrado. Confira o cliente encontrado e confirme o vínculo explicitamente.');
        }
      } else if (!existing) throw new Error('Consulte e selecione o cliente existente antes de vincular.');
      const assignment = await nfcRegistrationService.intake({
        token, ...(existing ? { customerId: existing.id } : { name:name.trim(), cpf:digits(cpf), phone:digits(phone) }),
        tableNumber:number,
      });
      // A server-confirmed assignment is never rolled back by an optional comanda/WhatsApp failure.
      let detail = '';
      try {
        if (!requestKey.current) requestKey.current = crypto.randomUUID().replace(/-/g, '');
        const comanda = await nfcComandaService.open(assignment.customerId, assignment.cardId, assignment.tableNumber, requestKey.current);
        if (consent && number !== null) {
          try { await nfcComandaService.sendVisitAccessCode(comanda.id); }
          catch { detail = ' O envio opcional por WhatsApp não foi concluído.'; }
        }
      } catch { detail = ' A abertura da comanda deve ser conferida no painel.'; }
      setSuccess('Cartão '+assignment.displayCode+' vinculado com sucesso no servidor.'+detail);
      onCompleted?.();
    });
  };
  return <Layout aria-label="Cadastro e vínculo NFC">
    <div className="brand">Gastro<span>Nexa</span></div>
    <div className="context"><div><Store size={16}/> {restaurantName}</div><div><CreditCard size={16}/> {cardCode ? 'Cartão '+cardCode : 'Aguardando cartão'}</div></div>
    <section className="surface">
      {success ? <>
        <div className="ready"><CheckCircle2 size={18}/> VÍNCULO CONFIRMADO</div>
        <h1>Tudo certo para atender.</h1><p className="lead" role="status">{success}</p>
        <button type="button" className="primary full" onClick={() => onBackToPanel?.()}>Continuar para o painel</button>
      </> : <>
        <div className="ready"><ShieldCheck size={17}/> {token ? 'Cartão identificado e disponível' : 'Verificação segura pelo servidor'}</div>
        <h1>Quem vai usar este cartão?</h1>
        <p className="lead">Cadastre o cliente ou encontre seu cadastro neste restaurante.</p>
        {!token && <button type="button" className="primary full" disabled={busy} onClick={() => void readCard()}>{busy ? 'Verificando...' : 'Aproximar e verificar cartão NFC'}</button>}
        {token && <>
          <div className="modes" role="group" aria-label="Cadastro do cliente">
            <button type="button" aria-pressed={mode==='new'} onClick={() => changeMode('new')}><UserPlus size={16}/> Novo cliente</button>
            <button type="button" aria-pressed={mode==='existing'} onClick={() => changeMode('existing')}><UserRoundCheck size={16}/> Já cadastrado</button>
          </div>
          <form onSubmit={submit}>
            {mode==='new' ? <div className="fields">
              <label className="wide">Nome completo<input required minLength={2} maxLength={120} value={name} onChange={e=>setName(e.target.value)} autoComplete="off"/></label>
              <label>CPF<input required inputMode="numeric" maxLength={14} value={cpf} onChange={e=>setCpf(e.target.value)} autoComplete="off"/></label>
              <label>Telefone com DDD<input required inputMode="tel" maxLength={24} value={phone} onChange={e=>setPhone(e.target.value)} autoComplete="off"/></label>
            </div> : <>
              <label>CPF completo do cliente<input inputMode="numeric" maxLength={14} value={searchCpf} onChange={e=>{setSearchCpf(e.target.value);setCustomer(null);}} autoComplete="off"/></label>
              <button className="secondary full" type="button" disabled={busy||digits(searchCpf).length!==11} onClick={() => void lookup(searchCpf)}><Search size={16}/> Buscar cadastro</button>
            </>}
            {customer && <div className="person" role="status"><strong>{customer.name}</strong><small>CPF {customer.cpfMasked} · {customer.phoneMasked}</small><small>Cadastro existente neste restaurante. Confirme o vínculo ao cartão {cardCode}.</small><button className="secondary" type="button" onClick={()=>{setCustomer(null);setTable('');setConsent(false);}}>Trocar cliente</button></div>}
            {(mode==='new'||customer) && <>
              <label>Mesa (opcional)<input type="number" min="1" max="100000" value={table} onChange={e=>setTable(e.target.value)}/></label>
              <label className="checkbox"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> Cliente autoriza envio opcional do código da visita por WhatsApp quando houver mesa.</label>
              <button className="primary full" type="submit" disabled={busy}><Link2 size={16}/> {busy?'Confirmando no servidor...':mode==='new'&&!customer?'Cadastrar e vincular':'Vincular cadastro existente'}</button>
            </>}
          </form>
        </>}
        {error && <p className="error" role="alert">{error}</p>}
      </>}
    </section>
    <p className="hint"><ShieldCheck size={14}/> CPF, vínculo e permissões são verificados no backend do restaurante autenticado.</p>
  </Layout>;
}
