import { useRef, useState, type FormEvent } from 'react';
import styled from 'styled-components';
import { ArrowLeft, ArrowRight, CheckCircle2, ContactRound, CreditCard, Smartphone, UserPlus } from 'lucide-react';
import { NfcReceptionAnimation } from './NfcReceptionAnimation';
import nfcRegistrationService, { type NfcCustomerRecord } from '../../Services/nfcRegistrationService';
import nfcComandaService from '../../Services/nfcComandaService';
import { scanNfcCard } from './nfcWebReader';
import { NfcCustomerComandas } from './NfcCustomerComandas';

type RegistrationMode = 'new' | 'existing';
type LinkedCard = { customerId: string; cardId: string; displayCode: string; tableNumber: number | null };
type Props = { onCompleted?: () => void };

const Shell = styled.section`
  display: grid; gap: 18px; color: #26333a; min-width: 0;
  *, *::before, *::after { box-sizing: border-box; }
  h2, h3, h4, p { margin: 0; }
  button, input { font: inherit; }
  button { cursor: pointer; }
  .steps { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; padding: 12px 4px; }
  .step { display: inline-flex; align-items: center; gap: 9px; color: #8d979c; font-size: 12px; font-weight: 740; }
  .step b { width: 25px; height: 25px; display: inline-grid; place-items: center; background: #edf0f2; color: #7a8790; border-radius: 50%; font-size: 11px; }
  .step[data-current="true"] { color: #be4d15; }
  .step[data-current="true"] b { background: #cc561b; color: #fff; }
  .step[data-done="true"] b { background: #e2f4ea; color: #198454; }
  .step-sep { width: 28px; height: 1px; background: #dbe1e4; }
  .workspace { display: grid; grid-template-columns: minmax(0,1.18fr) minmax(260px,.82fr); background: #fff; border: 1px solid #e5e9eb; border-radius: 19px; overflow: hidden; }
  .form-area { padding: clamp(19px,2.7vw,31px); display: grid; align-content: start; gap: 18px; min-width: 0; }
  .eyebrow { font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: #c2551e; font-weight: 850; }
  .form-area h2 { font-size: clamp(21px,2.3vw,27px); line-height: 1.18; color: #202b30; }
  .subline { font-size: 13px; color: #6d7982; line-height: 1.6; }
  .mode-switch { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); padding: 5px; background: #f1f3f4; gap: 4px; border-radius: 13px; }
  .mode-switch button { padding: 12px 7px; border: 0; background: transparent; color: #74808a; font-size: 12px; border-radius: 10px; font-weight: 760; display: inline-flex; align-items: center; justify-content: center; gap: 7px; }
  .mode-switch button[aria-pressed="true"] { background: #fff; color: #c2541e; box-shadow: 0 2px 8px #0001; }
  .mode-switch svg { width: 16px; height: 16px; }
  .fields { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 15px; }
  .fields label { display: grid; gap: 7px; color: #37444d; font-size: 12px; font-weight: 780; }
  .fields .wide { grid-column: 1 / -1; }
  input:not([type="checkbox"]) { width: 100%; min-width: 0; border-radius: 10px; border: 1px solid #d5dce1; min-height: 46px; padding: 11px 12px; background: #fff; color: #243039; font-size: 13px; }
  input:focus-visible, button:focus-visible { outline: 3px solid #e9a47a; outline-offset: 2px; }
  .consent { display: flex; align-items: start; gap: 9px; font-size: 12px; color: #58656b; }
  .consent input { width: 16px; height: 16px; flex-shrink: 0; margin-top: 2px; }
  .break { border-top: 1px solid #e9edef; padding-top: 15px; }
  .hint { color: #79868b; font-size: 12px; line-height: 1.55; }
  .actions { display: flex; flex-wrap: wrap; gap: 10px; }
  .primary, .secondary { border-radius: 10px; padding: 13px 16px; font-size: 13px; font-weight: 800; min-height: 45px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
  .primary { background: #cb5219; border: 1px solid #cb5219; color: white; }
  .secondary { background: white; border: 1px solid #d5dfe3; color: #425059; }
  button:disabled { opacity: .55; cursor: not-allowed; }
  .primary svg, .secondary svg { width: 17px; height: 17px; }
  .state { background: #f5faf7; border: 1px solid #d8eade; padding: 14px; border-radius: 11px; font-size: 13px; color: #2c6652; }
  .error { padding: 12px; border-radius: 11px; background: #fff0ef; color: #a23729; font-size: 12px; }
  .desktop-illustration { min-width: 0; }
  @media (max-width: 860px) {
    .workspace { grid-template-columns: minmax(0,1fr); }
    .desktop-illustration { display: none; }
  }
  @media(max-width:520px) { .fields { grid-template-columns: minmax(0,1fr); } .fields .wide { grid-column: auto; } .mode-switch button { font-size: 11px; } .step-sep { width: 12px; } .step { font-size: 11px; } .desktop-illustration { display: none; } }
`;

export function NfcGuidedReception({ onCompleted }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [mode, setMode] = useState<RegistrationMode>('new');
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [lookupCpf, setLookupCpf] = useState('');
  const [table, setTable] = useState('');
  const [whatsappConsent, setWhatsappConsent] = useState(false);
  const [customer, setCustomer] = useState<NfcCustomerRecord | null>(null);
  const [token, setToken] = useState('');
  const [assignment, setAssignment] = useState<LinkedCard | null>(null);
  const [comandaId, setComandaId] = useState('');
  const [showComandas, setShowComandas] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const openRequestKey = useRef('');
  const locked = useRef(false);

  const reset = () => {
    if (locked.current) return;
    setStep(1); setMode('new'); setName(''); setCpf(''); setPhone(''); setLookupCpf('');
    setTable(''); setWhatsappConsent(false); setCustomer(null); setToken('');
    setAssignment(null); setComandaId(''); setShowComandas(false); setError(''); setNotice('');
    openRequestKey.current = '';
  };

  const identifyCustomer = async (event: FormEvent) => {
    event.preventDefault();
    if (locked.current || busy) return;
    locked.current = true; setBusy(true); setError('');
    try {
      let found: NfcCustomerRecord | null = null;
      if (mode === 'new') found = await nfcRegistrationService.create({ name, cpf, phone });
      else found = await nfcRegistrationService.lookup(lookupCpf);
      if (!found) throw new Error('Cadastro não encontrado. Confira o CPF ou cadastre um novo cliente.');
      setCustomer(found); setStep(2);
    } catch (cause) {
      const response = cause as { response?: { data?: { error?: string } } };
      setError(response.response?.data?.error || (cause instanceof Error ? cause.message : 'Não foi possível identificar o cliente.'));
    } finally { locked.current = false; setBusy(false); }
  };

  const readCard = async () => {
    if (locked.current || busy || assignment) return;
    locked.current = true; setBusy(true); setError(''); setToken('');
    try { setToken(await scanNfcCard()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível ler o cartão NFC.'); }
    finally { locked.current = false; setBusy(false); }
  };

  const pairCard = async () => {
    if (!customer || !token || locked.current || busy) return;
    locked.current = true; setBusy(true); setError(''); setNotice('');
    try {
      const tableNumber = table.trim() ? Number(table) : null;
      let current = assignment;
      if (!current) {
        current = await nfcRegistrationService.intake({ token, customerId: customer.id, tableNumber });
        setAssignment(current);
      }
      if (!openRequestKey.current) openRequestKey.current = crypto.randomUUID().replace(/-/g, '');
      const comanda = await nfcComandaService.open(current.customerId, current.cardId, current.tableNumber, openRequestKey.current);
      setComandaId(comanda.id);
      if (whatsappConsent && current.tableNumber != null) {
        try {
          await nfcComandaService.sendVisitAccessCode(comanda.id);
          setNotice('Código de acesso da visita solicitado para o WhatsApp autorizado.');
        } catch {
          setNotice('Comanda aberta. O envio pelo WhatsApp não foi concluído; confira a configuração do canal.');
        }
      }
      setStep(3);
      onCompleted?.();
    } catch (cause) {
      const response = cause as { response?: { data?: { error?: string } } };
      setError(response.response?.data?.error || (assignment
        ? 'O cartão foi vinculado, mas a comanda não abriu. Tente novamente sem aproximar outro cartão.'
        : 'Não foi possível vincular este cartão. Verifique se está disponível e pertence ao restaurante.'));
    } finally { locked.current = false; setBusy(false); }
  };

  return <Shell aria-label="Atendimento guiado de cartão NFC">
    <div className="steps" aria-label="Etapas do atendimento">
      {(['Cliente', 'Vincular cartão', 'Concluído'] as const).map((label, index) => <div className="step" data-current={step === index + 1} data-done={step > index + 1} key={label} aria-current={step === index + 1 ? 'step' : undefined}>
        <b>{step > index + 1 ? <CheckCircle2 size={15} aria-hidden="true" /> : index + 1}</b>{label}
        {index < 2 && <i className="step-sep" aria-hidden="true" />}
      </div>)}
    </div>
    <div className="workspace">
      <div className="form-area">
        <span className="eyebrow">Etapa {step} de 3</span>
        {step === 1 && <>
          <h2>Quem vamos atender?</h2>
          <p className="subline">Identifique o cliente antes de vincular um cartão preparado e disponível.</p>
          <div className="mode-switch" role="group" aria-label="Tipo de cadastro NFC">
            <button type="button" aria-pressed={mode === 'new'} onClick={() => { setMode('new'); setError(''); }}><UserPlus aria-hidden="true" /> Novo cliente</button>
            <button type="button" aria-pressed={mode === 'existing'} onClick={() => { setMode('existing'); setError(''); }}><ContactRound aria-hidden="true" /> Cliente cadastrado</button>
          </div>
          <form onSubmit={event => void identifyCustomer(event)} className="fields">
            {mode === 'new' ? <>
              <label className="wide">Nome completo<input autoComplete="name" required minLength={2} maxLength={120} placeholder="Nome e sobrenome" value={name} onChange={event => setName(event.target.value)} /></label>
              <label>CPF completo<input autoComplete="off" inputMode="numeric" required placeholder="000.000.000-00" value={cpf} onChange={event => setCpf(event.target.value)} /></label>
              <label>Telefone com DDD<input autoComplete="tel" inputMode="tel" required placeholder="(85) 99999-9999" value={phone} onChange={event => setPhone(event.target.value)} /></label>
            </> : <label className="wide">CPF do cliente cadastrado<input autoComplete="off" inputMode="numeric" required placeholder="Informe o CPF completo" value={lookupCpf} onChange={event => setLookupCpf(event.target.value)} /></label>}
            <label className="wide consent"><input type="checkbox" checked={whatsappConsent} onChange={event => setWhatsappConsent(event.target.checked)} /> Cliente autorizou comunicações pelo WhatsApp (opcional)</label>
            <label className="wide break">Mesa (opcional)<input type="number" min={1} max={100000} placeholder="Ex.: 08" value={table} onChange={event => setTable(event.target.value)} /></label>
            <button className="primary wide" type="submit" disabled={busy}>{busy ? 'Identificando...' : 'Continuar para o cartão'} <ArrowRight aria-hidden="true" /></button>
          </form>
          <p className="hint">Os dados pessoais ficam protegidos no servidor. O cartão armazena apenas um endereço individual.</p>
        </>}
        {step === 2 && <>
          <h2>Vincular cartão NFC</h2>
          <p className="subline"><strong>{customer?.name}</strong> foi identificado. Aproxime um cartão já preparado e disponível no estoque.</p>
          <div className="state"><CreditCard size={17} aria-hidden="true" /> {token ? 'Cartão lido e pronto para confirmar o vínculo.' : 'Aguardando leitura de um cartão NFC da GastroNexa.'}</div>
          <div className="actions">
            <button className="secondary" type="button" onClick={() => void readCard()} disabled={busy || Boolean(assignment)}><Smartphone aria-hidden="true" /> {busy ? 'Aguarde...' : 'Ler cartão no Android'}</button>
            <button className="primary" type="button" disabled={!token || busy} onClick={() => void pairCard()}><CreditCard aria-hidden="true" /> {assignment ? 'Tentar abrir comanda' : 'Vincular e abrir comanda'}</button>
          </div>
          {!assignment && <button className="secondary" type="button" onClick={() => { setStep(1); setToken(''); setError(''); }}><ArrowLeft aria-hidden="true" /> Voltar aos dados</button>}
          <p className="hint">No iPhone, aproxime o cartão e abra o link pela notificação do Safari. A página NFC permite identificar e vincular o cartão com funcionário autenticado.</p>
        </>}
        {step === 3 && <>
          <CheckCircle2 size={37} color="#188555" aria-hidden="true" />
          <h2>Cartão vinculado com sucesso!</h2>
          <p className="subline">A comanda individual está aberta no servidor e pronta para os pedidos.</p>
          <div className="state"><strong>{assignment?.displayCode}</strong> · Comanda {comandaId.slice(0, 8).toUpperCase()}</div>
          {notice && <p className="hint" role="status">{notice}</p>}
          <div className="actions"><button className="secondary" type="button" onClick={() => setShowComandas(value => !value)}>{showComandas ? 'Ocultar comandas' : 'Ver comanda'}</button>
            <button className="primary" type="button" onClick={reset}>Novo atendimento <ArrowRight aria-hidden="true" /></button></div>
          {showComandas && customer && <NfcCustomerComandas customerId={customer.id} cardId={assignment?.cardId} />}
        </>}
        {error && <div className="error" role="alert">{error}</div>}
      </div>
      <div className="desktop-illustration"><NfcReceptionAnimation decorative /></div>
    </div>
  </Shell>;
}
