import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { Clock3, CreditCard, FileText, ShieldAlert, X } from 'lucide-react';
import nfcComandaService, { type NfcComanda, type NfcCustomerComandas } from '../../Services/nfcComandaService';
import { NfcPrepareOrder } from './NfcPrepareOrder';
import nfcRegistrationService from '../../Services/nfcRegistrationService';
import { scanNfcCard } from './nfcWebReader';

const Frame = styled.section`
  display: grid; gap: 12px; min-width: 0;
  .summary { display: flex; gap: 10px; flex-wrap: wrap; }
  .tile { padding: 12px 16px; border: 1px solid #e4e8ee; border-radius: 12px; background: #fff; flex: 1; min-width: 135px; }
  .tile strong { display: block; margin-top: 5px; font-size: 19px; }
  .tile small { font-size: 12px; color: #66717b; }
  .entries { display: grid; gap: 9px; }
  .entry { text-align: left; display: flex; justify-content: space-between; gap: 12px; padding: 14px;
    border: 1px solid #e4e8ee; border-radius: 12px; background: #fff; cursor: pointer; align-items: center; }
  .entry:focus-visible { outline: 3px solid #e7631b; }
  .entry strong, .entry small { display: block; }
  .entry small { font-size: 12px; color: #66717b; margin-top: 4px; }
  .status { padding: 6px 9px; border-radius: 8px; font-size: 12px; white-space: nowrap; font-weight: 800; }
  .paid { color: #117442; background: #e5f8ed; }
  .unpaid { color: #9e2626; background: #ffeaea; }
  .open { color: #875211; background: #fff0d3; }
  .warning { color: #9e2626; padding: 12px; border-radius: 9px; background: #fff0f0; }
  .info { color: #65717c; font-size: 13px; }
`;
const Overlay = styled.div`
  position: fixed; inset: 0; z-index: 10000; background: rgba(8, 20, 34, .68);
  display: flex; align-items: center; justify-content: center; padding: 16px;
  .dialog { width: min(620px, 100%); max-height: calc(100dvh - 32px); overflow-y: auto;
    border-radius: 20px; background: #fff; box-shadow: 0 20px 75px #0005; color: #1b2730; }
  .header { padding: 22px 24px; background: linear-gradient(125deg, #202833, #354153); color: #fff; display: flex;
    justify-content: space-between; align-items: start; gap: 12px; }
  .header h3 { font-size: 21px; margin: 6px 0; }
  .header p { font-size: 13px; color: #dbe2e9; margin: 0; }
  .close { border: 1px solid #fff5; color: #fff; background: #ffffff19; border-radius: 9px; padding: 8px; cursor: pointer; }
  .content { padding: 20px 24px; display: grid; gap: 17px; }
  .pair { display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; font-size: 13px; }
  .pair span { color: #63707a; }
  .divider { border-top: 1px solid #e9eef2; padding-top: 16px; }
  h4 { margin: 0 0 10px; font-size: 14px; display: flex; align-items: center; gap: 8px; }
  .line { padding: 10px 0; border-bottom: 1px solid #eef1f4; }
  .line:last-child { border-bottom: 0; }
  .total { font-size: 18px; font-weight: 800; }
  .payment { padding: 10px; background: #f8fafc; border-radius: 10px; margin-bottom: 7px; }
  .actions { display: flex; gap: 10px; flex-wrap: wrap; }
  .action { padding: 10px 14px; color: #fff; background: #d65b14; border: 0; border-radius: 10px; cursor: pointer; }
  .action:disabled { opacity: .5; cursor: not-allowed; }
  .error { color: #9d2929; }
`;
const money = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dateTime = (value?: string | null) => value ? new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Não registrado';
const label = (status: NfcComanda['status']) => status === 'PAID' ? 'Paga' : status === 'UNPAID' ? 'Pagamento pendente' : 'Em andamento';

export function NfcCustomerComandas({ customerId, cardId, customerName }: { customerId: string; cardId?: string; customerName?: string }) {
  const [state, setState] = useState<NfcCustomerComandas | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [whatsappConsent, setWhatsappConsent] = useState(false);
  const [visitNotice, setVisitNotice] = useState('');
  const [returnCpf, setReturnCpf] = useState('');
  const reload = useCallback(async () => {
    const response = await nfcComandaService.customerComandas(customerId);
    setState(response);
  }, [customerId]);
  useEffect(() => {
    let active = true;
    void nfcComandaService.customerComandas(customerId).then(data => { if (active) setState(data); })
      .catch(() => { if (active) setError('Não foi possível consultar as comandas deste cliente.'); });
    return () => { active = false; };
  }, [customerId]);
  const selected = state?.comandas.find((item) => item.id === selectedId) ?? null;
  useEffect(() => {
    if (!selectedId) return;
    const handle = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelectedId(null); };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [selectedId]);
  async function confirmPaymentAndRelease() {
    if (!selected || !selected.cardId || busy || !/^\d{11}$/.test(returnCpf)) return;
    setBusy(true); setError('');
    try {
      const token = await scanNfcCard();
      const released = await nfcRegistrationService.returnPaidCard(token, returnCpf, selected.id);
      setReturnCpf(''); setSelectedId(null);
      setVisitNotice(`Pagamento conferido no backend. Cartão ${released.displayCode} desvinculado e disponível para o próximo cliente.`);
      await reload();
    } catch (cause) {
      const response = cause as { response?: { data?: { error?: string } } };
      setError(response.response?.data?.error || 'Pagamento ainda não confirmado ou cartão/CPF inválidos. Não foi possível liberar o cartão.');
      setReturnCpf('');
    } finally { setBusy(false); }
  }
  async function openComanda() {
    if (busy || !cardId || state?.hasOpenComanda || state?.blocked) return;
    setBusy(true); setError('');
    try {
      const parsed = tableNumber.trim() ? Number(tableNumber) : null;
      if (parsed !== null && (!Number.isSafeInteger(parsed) || parsed <= 0 || parsed > 100000)) {
        throw new Error('Número da mesa inválido.');
      }
      const created = await nfcComandaService.open(customerId, cardId, parsed);
      if (whatsappConsent && parsed !== null) {
        try {
          await nfcComandaService.sendVisitAccessCode(created.id);
          setVisitNotice('Código de acesso enfileirado para o WhatsApp autorizado.');
        } catch {
          setVisitNotice('Comanda aberta, mas não foi possível enviar o código. Confira o WhatsApp do restaurante.');
        }
      }
      await reload();
      setWhatsappConsent(false);
      setTableNumber('');
    } catch {
      setError('Não foi possível abrir a comanda. Confira se o cartão está ativo e se o cliente possui pendências.');
    } finally { setBusy(false); }
  }
  return <Frame aria-label="Comandas e situação financeira NFC">
    {customerName && <p className="info">Cliente: <strong>{customerName}</strong></p>}
    {!state && !error && <p role="status">Carregando comandas...</p>}
    {error && <p className="warning" role="alert"><ShieldAlert size={16} /> {error}</p>}
    {state && <>
      {visitNotice && <p role="status" className="info">{visitNotice}</p>}
      <div className="summary">
        <div className="tile"><small>Situação do cliente</small><strong>{state.blocked ? 'Bloqueado' : state.hasOpenComanda ? 'Em atendimento' : 'Liberado'}</strong></div>
        <div className="tile"><small>Saldo em dívida</small><strong>{money(state.outstandingCents)}</strong></div>
        <div className="tile"><small>Comandas cadastradas</small><strong>{state.comandas.length}</strong></div>
      </div>
      {state.blocked && <p className="warning">Cliente possui saldo vencido neste restaurante. Novas comandas ficam bloqueadas até quitação.</p>}
      {cardId && !state.hasOpenComanda && !state.blocked && <div className="tile">
        <strong>Abrir comanda NFC</strong>
        <p className="info">Informe a mesa apenas se o cliente estiver usando uma.</p>
        <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', alignItems: 'center' }}>
          <input type="number" aria-label="Número da mesa opcional" min="1" max="100000"
            value={tableNumber} onChange={e => setTableNumber(e.target.value)}
            placeholder="Mesa (opcional)" style={{ padding: 9, border: '1px solid #d5dce2', borderRadius: 8, width: 145 }} />
          <button type="button" disabled={busy} onClick={() => void openComanda()}
            style={{ background: '#d65b14', color: '#fff', border: 0, padding: '10px 14px', borderRadius: 9, cursor: 'pointer' }}>
            Abrir comanda
          </button>
        </div>
        <label className="info" style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input type="checkbox" checked={whatsappConsent} onChange={event => setWhatsappConsent(event.target.checked)} />
          Cliente autorizou receber o código temporário desta visita no WhatsApp cadastrado.
        </label>
        <p className="info">O envio automático exige uma mesa informada e integração WhatsApp ativa.</p>
      </div>}
      <div className="entries">
        {state.comandas.map(comanda => <button type="button" className="entry" key={comanda.id} onClick={() => setSelectedId(comanda.id)}>
          <span><strong>{customerName ? `${customerName} · ` : ''}Comanda {comanda.id.slice(0, 8).toUpperCase()}</strong><small>Entrada: {dateTime(comanda.openedAt)} · Vence: {dateTime(comanda.dueAt)} · {comanda.tableNumber ? `Mesa ${comanda.tableNumber}` : 'Sem mesa'}</small></span>
          <span><span className={`status ${comanda.status === 'PAID' ? 'paid' : comanda.status === 'UNPAID' ? 'unpaid' : 'open'}`}>{label(comanda.status)}</span><small>{money(comanda.totalCents)}</small></span>
        </button>)}
        {!state.comandas.length && <p className="info">Este cliente ainda não possui comandas NFC registradas.</p>}
      </div>
    </>}
    {selected && <Overlay onMouseDown={event => { if (event.target === event.currentTarget) setSelectedId(null); }}>
      <div className="dialog" role="dialog" aria-modal="true" aria-label="Detalhes da comanda NFC">
        <header className="header"><div><small>GASTRONEXA · COMANDA INDIVIDUAL</small><h3>Comanda {selected.id.slice(0, 8).toUpperCase()}</h3>{customerName && <p>Cliente: {customerName}</p>}<p>{label(selected.status)} · {selected.tableNumber ? `Mesa ${selected.tableNumber}` : 'Mesa não informada'}</p></div><button className="close" type="button" aria-label="Fechar comanda" onClick={() => setSelectedId(null)}><X size={20}/></button></header>
        <div className="content">
          <div>
            <div className="pair"><span>Abertura</span><b>{dateTime(selected.openedAt)}</b></div>
            <div className="pair"><span>Prazo para pagamento</span><b>{dateTime(selected.dueAt)}</b></div>
            <div className="pair"><span>Encerramento</span><b>{dateTime(selected.closedAt)}</b></div>
            <div className="pair"><span>Quitação</span><b>{dateTime(selected.paidAt)}</b></div>
          </div>
          <section className="divider"><h4><FileText size={18}/> Itens consumidos</h4>
            {selected.items.map(item => <div className="pair line" key={item.id}><span>{item.quantity}× {item.description}<small> · {dateTime(item.createdAt)}</small></span><b>{money(item.totalCents)}</b></div>)}
            {!selected.items.length && <p className="info">Nenhum item lançado nesta comanda.</p>}
          </section>
          <section className="divider">
            <div className="pair total"><span>Total</span><b>{money(selected.totalCents)}</b></div>
            <div className="pair"><span>Pago e confirmado</span><b>{money(selected.paidCents)}</b></div>
            <div className="pair total"><span>Saldo pendente</span><b>{money(selected.outstandingCents)}</b></div>
          </section>
          {selected.status === 'OPEN' && selected.cardId && <section className="divider"><NfcPrepareOrder comandaId={selected.id} /></section>}
          <section className="divider"><h4><CreditCard size={18}/> Histórico de pagamentos</h4>
            {selected.payments.map(payment => <div className="payment" key={payment.id}>
              <div className="pair"><span>{payment.method} · {dateTime(payment.createdAt)}</span><b>{money(payment.amountCents)}</b></div>
              <div className="pair"><span>Situação</span><b>{payment.status === 'CONFIRMED' ? 'Confirmado' : payment.status === 'REVERSED' ? 'Estornado' : 'Aguardando confirmação'}</b></div>
              {payment.confirmedAt && <div className="pair"><span>Confirmado em</span><b>{dateTime(payment.confirmedAt)}</b></div>}
            </div>)}
            {!selected.payments.length && <p className="info"><Clock3 size={15}/> Nenhum pagamento registrado.</p>}
          </section>
          {selected.cardId && <section className="divider" style={{ display: 'grid', gap: 10 }}>
            <h4><CreditCard size={18} /> Conferir pagamento e liberar cartão NFC</h4>
            <p className="info">Após o Pix ou Point ser confirmado no servidor, aproxime o cartão e peça ao cliente o CPF completo. A mesma operação valida a quitação e libera o cartão para novo cadastro.</p>
            <label className="info" style={{ display: 'grid', gap: 5 }}>
              CPF completo (11 dígitos)
              <input type="password" autoComplete="off" inputMode="numeric" maxLength={11} value={returnCpf}
                onChange={event => setReturnCpf(event.target.value.replace(/\D/g, '').slice(0, 11))}
                placeholder="CPF completo do titular" style={{ padding: 11, border: '1px solid #cbd5df', borderRadius: 9 }} />
            </label>
            <button type="button" disabled={busy || returnCpf.length !== 11} onClick={() => void confirmPaymentAndRelease()}
              style={{ background: '#d65b14', color: '#fff', border: 0, padding: '12px 14px', borderRadius: 9 }}>
              Aproximar cartão, verificar quitação e desvincular
            </button>
            {error && <p role="alert" className="warning">{error}</p>}
          </section>}
          <p className="info">Os valores e estados são calculados no servidor. A confirmação financeira exige autorização e não é feita automaticamente ao abrir esta tela.</p>
        </div>
      </div>
    </Overlay>}
  </Frame>;
}
