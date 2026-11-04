import { useState, type FormEvent } from 'react';
import styled from 'styled-components';
import { Search, UserRoundCheck, UserRoundPlus } from 'lucide-react';
import nfcRegistrationService, { type NfcCustomerRecord } from '../../Services/nfcRegistrationService';

const Panel = styled.section`
  display: grid; gap: 16px; min-width: 0;
  h2 {font-size: 22px;letter-spacing: -.035em;line-height: 1.2;}
  p {color: #647082;line-height: 1.55;font-size: 14px;}
  .ready {color:#167547;font-size:13px;}
  .modes {display:grid;grid-template-columns:1fr 1fr;gap:5px;border-radius:12px;background:#f2f3f6;padding:5px;}
  .modes button {color:#505c6f;background:transparent;min-width:0;display:flex;gap:6px;align-items:center;justify-content:center;font-size:13px;padding:10px 4px;}
  .modes button[aria-pressed=true] {color:#1e2937;background:#fff;box-shadow:0 2px 6px #0d203314;}
  .inputs {display:grid;gap:13px;}
  label {display:grid;gap:7px;font-size:13px;font-weight:650;}
  input {font-size:16px!important;min-width:0;width:100%;height:46px;}
  .check {display:flex;gap:10px;align-items:flex-start;font-size:13px;line-height:1.5;}
  .check input {height:18px;width:18px;flex-shrink:0;}
  .choice {display:flex;gap:10px;align-items:center;justify-content:space-between;text-align:left;border:1px solid #dfe3e8;background:#fff!important;color:#1c2938!important;border-radius:10px;padding:12px;}
  .choice.selected {border-color:#ce5118;background:#fff8f3!important;}
  .choice span {display:grid;gap:3px;overflow-wrap:anywhere;}
  .choice small {color:#5e6a7d;}
  .action {width:100%;min-height:48px!important;}
  .error {color:#a32626!important;}
  .summary {padding:12px;border-radius:11px;background:#f7f8f9;border:1px solid #e1e4e9;display:grid;gap:6px;}
  @media(max-width:350px) {.modes button {font-size:12px;}}
`;

type Assignment = { customerId: string; cardId: string; displayCode: string; tableNumber: number | null };
export type NfcEnrollmentChoice = { customerId?: string; name?: string; cpf?: string; phone?: string; tableNumber: number | null; whatsappConsent: boolean };

export function NfcCardEnrollment({ cardCode, restaurantName, onEnroll }: {
  cardCode: string; restaurantName: string;
  onEnroll: (payload: NfcEnrollmentChoice) => Promise<Assignment>;
}) {
  const [mode, setMode] = useState<'new'|'existing'>('new');
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [table, setTable] = useState('');
  const [consent, setConsent] = useState(false);
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<NfcCustomerRecord[]>([]);
  const [selected, setSelected] = useState<NfcCustomerRecord|null>(null);
  const [searchCompleted, setSearchCompleted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const switchMode = (next: 'new'|'existing') => {
    if (busy) return;
    setMode(next);setTable('');setConsent(false);setSelected(null);
    setQuery('');setFound([]);setSearchCompleted(false);setError('');
    if (next === 'existing') {setName('');setCpf('');setPhone('');}
  };
  const search = async () => {
    if (busy) return;
    const digits=query.replace(/\D/g,'');
    if (digits.length!==10 && digits.length!==11) {setError('Informe o CPF completo ou telefone com DDD.');return;}
    setBusy(true);setSelected(null);setFound([]);setError('');setSearchCompleted(false);
    try {
      setFound(await nfcRegistrationService.identitySearch(digits));
      setSearchCompleted(true);
    } catch (cause) {
      const err = cause as {response?:{data?:{error?:string}}};
      setError(err.response?.data?.error||'Não foi possível consultar os cadastros. Tente novamente.');
    } finally {setBusy(false);}
  };
  const submit = async (event:FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const tableNumber=table?Number(table):null;
    if (tableNumber!==null && (!Number.isSafeInteger(tableNumber)||tableNumber<=0||tableNumber>100000)) {
      setError('Informe uma mesa válida.');return;
    }
    if (mode==='existing'&&!selected) {setError('Selecione o cliente encontrado.');return;}
    setBusy(true);setError('');
    try {
      if (mode==='new') {
        const matches = await nfcRegistrationService.identitySearch(cpf);
        if (matches.length) {
          setMode('existing');setQuery(cpf);setFound(matches);setSearchCompleted(true);
          setError('CPF já cadastrado neste restaurante. Selecione o cadastro existente.');
          return;
        }
      }
      await onEnroll({
        ...(mode==='existing'&&selected?{customerId:selected.id}:{name:name.trim(),cpf,phone}),
        tableNumber,whatsappConsent:consent,
      });
    } catch (cause) {
      const err = cause as {response?:{data?:{error?:string}}};
      setError(err.response?.data?.error||'Não foi possível vincular este cartão. Confira os dados.');
    } finally {setBusy(false);}
  };
  return <Panel aria-label="Cadastro e vínculo NFC">
    <p className="ready">Cartão {cardCode} disponível. Pronto para vincular.</p>
    <h2>Quem vai usar este cartão?</h2>
    <p>Cadastre o cliente ou encontre seu cadastro em {restaurantName || 'seu restaurante'}.</p>
    <div className="modes" role="group" aria-label="Tipo de cadastro">
      <button type="button" aria-pressed={mode==='new'} onClick={()=>switchMode('new')} disabled={busy}><UserRoundPlus size={17}/> Novo cliente</button>
      <button type="button" aria-pressed={mode==='existing'} onClick={()=>switchMode('existing')} disabled={busy}><UserRoundCheck size={17}/> Já cadastrado</button>
    </div>
    <form className="inputs" onSubmit={event=>void submit(event)}>
      {mode==='new'?<>
        <label>Nome completo<input value={name} onChange={e=>setName(e.target.value)} autoComplete="off" maxLength={120} placeholder="Nome do cliente" minLength={2} required disabled={busy}/></label>
        <label>CPF<input inputMode="numeric" autoComplete="off" value={cpf} onChange={e=>setCpf(e.target.value.replace(/\D/g,'').slice(0,11))} placeholder="000.000.000-00" minLength={11} maxLength={11} required disabled={busy}/></label>
        <label>Telefone com DDD<input inputMode="tel" autoComplete="off" value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,'').slice(0,13))} placeholder="(00) 00000-0000" minLength={10} required disabled={busy}/></label>
      </>:<>
        <label>CPF ou telefone do cliente<input inputMode="numeric" autoComplete="off" value={query}
          onChange={e=>{setQuery(e.target.value.replace(/\D/g,'').slice(0,11));setFound([]);setSelected(null);setSearchCompleted(false);}}
          placeholder="Com ou sem pontuação" disabled={busy}/></label>
        <button type="button" onClick={()=>void search()} disabled={busy||![10,11].includes(query.replace(/\D/g,'').length)}><Search size={16}/> Buscar cadastro</button>
        {searchCompleted && !found.length && <p role="status">Cadastro não encontrado neste restaurante. Você pode voltar para Novo cliente.</p>}
        {found.map(customer=><button type="button" key={customer.id} className={'choice'+(selected?.id===customer.id?' selected':'')} aria-pressed={selected?.id===customer.id}
          onClick={()=>{setSelected(customer);setTable('');setConsent(false);setError('');}} disabled={busy}>
          <span><strong>{customer.name}</strong><small>{customer.cpfMasked} · {customer.phoneMasked}</small></span>
          <UserRoundCheck size={18}/>
        </button>)}
        {selected && <div className="summary" role="status">
          <strong>Confira antes de vincular</strong>
          <p>Cliente: {selected.name}</p><p>Cartão: {cardCode}</p>
          <p>Restaurante: {restaurantName}</p>
        </div>}
      </>}
      {(mode==='new'||selected) && <>
        <label>Mesa (opcional)<input type="number" inputMode="numeric" min={1} max={100000} value={table} onChange={e=>setTable(e.target.value)} disabled={busy}/></label>
        <label className="check"><input type="checkbox" checked={consent} disabled={busy} onChange={e=>setConsent(e.target.checked)}/>
          Cliente autorizou receber informações desta visita pelo WhatsApp cadastrado.</label>
        <button className="action" type="submit" disabled={busy||(mode==='existing'&&!selected)}>
          {busy?'Verificando cadastro e vínculo...':mode==='new'?'Cadastrar e vincular cartão':'Vincular cadastro existente'}
        </button>
      </>}
      {error&&<p role="alert" className="error">{error}</p>}
    </form>
  </Panel>;
}
