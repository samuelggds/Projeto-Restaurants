import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, ChevronDown, ConciergeBell, CreditCard, Eye, RefreshCw, ShieldCheck, Store, UtensilsCrossed } from 'lucide-react';
import styled from 'styled-components';
import api from '../../Services/api';
import NfcCpfThreeDigits from './NfcCpfThreeDigits';

export type CustomerVisit = {
  id: string; cardCode: string; tableNumber: number | null; status: string; openedAt: string;
  customerName: string; restaurantName: string;
  totalCents: number; paidCents: number; outstandingCents: number;
  items: Array<{ id: string; kind: string; description: string; quantity: number;
    unitPriceCents: number; totalCents: number; createdAt: string; sourceOrderId: number | null;
    observation: string | null }>;
  orders: Array<{ id: number; status: string; createdAt: string; observation: string | null }>;
  payments: Array<{ id: string; amountCents: number; confirmedAt: string | null }>;
};
const money = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const time = (value: string) => new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const states: Record<string, string> = {
  PENDENTE: 'Recebido', PREPARANDO: 'Em preparo', PRONTO: 'Pronto',
  SAIU_PARA_ENTREGA: 'Saiu para entrega', ENTREGUE: 'Entregue', CANCELADO: 'Cancelado',
};

const Layout = styled.main`
  --paper: #f7f8fa; --surface: #fff; --ink: #232b37; --muted: #64748b;
  --line: #e2e6ec; --soft: #f0f2f6; --orange: #c34610; --orange-bg: #fff0e8;
  --green: #19824b; --green-bg: #e8f7ef;
  min-height: 100dvh; padding: 22px 16px 55px; color: var(--ink); background: var(--paper);
  * { box-sizing: border-box; }
  .shell { max-width: 590px; margin: 0 auto; }
  .top, .row, .between { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .top { margin-bottom: 24px; }
  .brand { display: flex; align-items: center; gap: 8px; color: var(--ink); font-size: 22px;
    font-weight: 800; letter-spacing: -.05em; }
  .brand span { color: var(--orange); }
  .brand img { height: 29px; width: 29px; object-fit: contain; }
  .live { background: var(--green-bg); color: var(--green); border-radius: 7px; font-size: 11px; padding: 7px 9px; }
  .restaurant { display: flex; align-items: center; gap: 6px; color: var(--muted); font-size: 12px; margin-bottom: 17px; }
  h1 { font-size: clamp(27px, 6vw, 35px); line-height: 1.1; letter-spacing: -.045em; margin: 4px 0 18px; }
  h2 { margin: 0; font-size: 20px; letter-spacing: -.02em; }
  p { margin: 0; }
  .greeting { color: var(--muted); font-size: 13px; }
  .readonly { font-size: 11px; background: var(--soft); padding: 7px 9px; border-radius: 7px;
    display: flex; align-items: center; gap: 5px; white-space: nowrap; }
  .visit { display: flex; flex-wrap: wrap; gap: 14px; font-size: 12px; color: var(--muted); margin-bottom: 22px; }
  .visit span { display: inline-flex; align-items: center; gap: 5px; }
  .visit svg { color: var(--orange); }
  .card { background: var(--surface); border: 1px solid var(--line); border-radius: 15px; padding: 21px; }
  .balance-card { margin-bottom: 29px; }
  .small { color: var(--muted); font-size: 12px; }
  .open { background: var(--orange-bg); color: var(--orange); font-size: 11px; padding: 6px 9px; border-radius: 6px; }
  .balance { font-size: 40px; color: var(--orange); font-weight: 750; letter-spacing: -.04em; margin: 12px 0 23px; }
  .totals { display: grid; grid-template-columns: 1fr 1fr; border-top: 1px solid var(--line); padding-top: 15px; gap: 12px; }
  .totals strong { display: block; margin-top: 6px; font-size: 16px; font-variant-numeric: tabular-nums; }
  .section-head { margin-bottom: 15px; }
  .orders { display: grid; gap: 12px; }
  details.order, details.payment { background: var(--surface); border: 1px solid var(--line); border-radius: 15px; overflow: hidden; }
  details summary { list-style: none; cursor: pointer; }
  details summary::-webkit-details-marker { display: none; }
  .order summary { min-height: 68px; display: flex; justify-content: space-between; align-items: center; gap: 13px; padding: 16px; }
  .order-title { font-size: 14px; font-weight: 700; }
  .order-meta { color: var(--muted); font-size: 11px; margin-top: 5px; }
  .order-side { display: grid; justify-items: end; gap: 6px; }
  .order-side strong { font-size: 14px; }
  .status { background: var(--orange-bg); color: var(--orange); padding: 5px 7px; font-size: 11px; border-radius: 5px; }
  .status.delivered { background: var(--green-bg); color: var(--green); }
  .chevron { color: var(--muted); flex-shrink: 0; transition: transform .15s; }
  details[open] > summary .chevron { transform: rotate(180deg); }
  .order-items { border-top: 1px solid var(--line); padding: 0 16px; }
  .item { padding: 15px 0; }
  .item + .item { border-top: 1px solid var(--line); }
  .item strong { font-size: 13px; }
  .item-price { flex-shrink: 0; }
  .item-note { margin-top: 9px; background: var(--soft); color: var(--muted); padding: 8px 10px;
    border-radius: 6px; font-size: 11px; overflow-wrap: anywhere; }
  .payment { margin-top: 20px; }
  .payment summary { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 16px; font-size: 13px; }
  .payment-body { padding: 15px 16px; border-top: 1px solid var(--line); font-size: 12px; }
  .payment-body p { color: var(--muted); margin-top: 8px; font-size: 11px; }
  .muted { color: var(--muted); }
  .green { color: var(--green); }
  .help { text-align: center; color: var(--muted); font-size: 12px; margin: 25px 0 20px; display: flex; justify-content: center; gap: 8px; }
  button { font: inherit; cursor: pointer; min-height: 46px; border-radius: 9px; font-weight: 650; }
  button:disabled { opacity: .55; cursor: not-allowed; }
  .refresh { width: 100%; background: var(--surface); border: 1px solid var(--line);
    color: var(--ink); display: flex; align-items: center; justify-content: center; gap: 8px; }
  .verified { font-size: 11px; color: var(--muted); text-align: center; margin: 10px 0; }
  .foot { color: var(--muted); font-size: 11px; border-top: 1px solid var(--line); padding-top: 17px;
    margin-top: 24px; text-align: center; display: flex; justify-content: center; align-items: center; gap: 6px; }
  .error { color: #a42a27; font-size: 13px; margin: 10px 0; }
  .access { text-align: center; padding: 28px 18px; }
  .nfc-mark { display: inline-grid; place-items: center; width: 55px; height: 55px; border-radius: 13px; background: var(--orange-bg);
    color: var(--orange); font-size: 22px; }
  .access h1 { margin-top: 14px; font-size: 28px; }
  .access form { display: grid; justify-items: center; gap: 17px; margin-top: 22px; }
  .access form button { width: 100%; background: var(--orange); color: #fff; border: 0; }
  .access .access-fields { background: var(--soft); border-radius: 10px; padding: 18px 12px; width: 100%; display: grid; justify-items: center; gap: 9px; }
  .access .hint { font-size: 11px; color: var(--muted); }
  .access .readonly { width: fit-content; margin: 18px auto 0; }
  @media(prefers-color-scheme:dark) {
    --paper: #151a20; --surface: #202731; --ink: #f1f4f8; --muted: #b2bdca;
    --line: #3c4552; --soft: #2b3441; --orange: #ff9b69; --orange-bg: #3b2a23;
    --green: #8ad9a8; --green-bg: #243b2f;
  }
  @media(max-width:360px) {
    .card { padding: 15px; } .order summary { padding: 13px; gap: 7px; }
    .readonly { font-size: 10px; } .brand { font-size: 19px; } .visit { gap: 9px; }
  }
`;

export default function NfcCustomerReadOnlyPage() {
  const { token = '' } = useParams();
  const [cpf, setCpf] = useState('');
  const [session, setSession] = useState('');
  const [visit, setVisit] = useState<CustomerVisit | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [updated, setUpdated] = useState('');
  const refreshing = useRef(false);
  const validToken = /^[A-Za-z0-9_-]{32,128}$/u.test(token);

  const load = useCallback(async (sessionToken: string) => {
    if (refreshing.current) return;
    refreshing.current = true;
    try {
      const response = await api.get<{ comanda: CustomerVisit; updatedAt: string }>('/nfc-customer-view/account', {
        headers: { 'x-nfc-customer-session': sessionToken, 'x-nfc-card-token': token },
        skipBaseUrlFallback: true,
      });
      if (!response.data?.comanda) throw new Error('Comanda indisponível');
      setVisit(response.data.comanda);
      setUpdated(response.data.updatedAt);
      setError('');
    } catch (cause) {
      const status = (cause as { response?: { status?: number } }).response?.status;
      if (status === 401 || status === 403) {
        setSession(''); setVisit(null); setCpf('');
        setError('Acesso encerrado. Aproxime novamente o cartão e confirme sua identidade.');
      } else setError('Não foi possível atualizar a comanda. Verifique sua conexão.');
    } finally { refreshing.current = false; }
  }, [token]);

  const verify = async (event: FormEvent) => {
    event.preventDefault();
    if (!validToken || cpf.length !== 3 || busy) return;
    setBusy(true); setError('');
    try {
      const response = await api.post<{ sessionToken: string }>('/nfc-customer-view/verify',
        { token, cpfPrefix: cpf }, { skipBaseUrlFallback: true });
      if (!response.data?.sessionToken) throw new Error('Sessão inválida');
      setCpf(''); setSession(response.data.sessionToken);
      await load(response.data.sessionToken);
    } catch {
      setSession(''); setVisit(null);
      setError('Não foi possível confirmar a visita. Se houve tentativas incorretas, o acesso poderá ficar temporariamente bloqueado.');
    } finally { setBusy(false); }
  };

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    const timer = window.setInterval(() => { if (!cancelled && !document.hidden) void load(session); }, 5000);
    const visible = () => { if (!cancelled && !document.hidden) void load(session); };
    document.addEventListener('visibilitychange', visible);
    return () => { cancelled = true; window.clearInterval(timer); document.removeEventListener('visibilitychange', visible); };
  }, [session, load]);

  const orders = visit ? [...visit.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : [];
  return <Layout><div className="shell">
    <header className="top"><div className="brand"><img src="/gastronexa-logo.svg" alt="" />Gastro<span>Nexa</span></div>
      <span className="live">● Atualização automática</span></header>
    {!visit && <><section className="card access">
      <div className="restaurant"><Store size={15} /> Comanda do cliente</div>
      <span className="nfc-mark"><CreditCard /></span>
      <h1>Consulte sua comanda.</h1>
      <p className="small">Após aproximar o cartão, abra o link NFC e confirme sua identidade.</p>
      {!validToken ? <p role="alert" className="error">Identificador inválido. Aproxime novamente o cartão NFC.</p> :
        <form onSubmit={e => void verify(e)}>
          <div className="access-fields">
            <NfcCpfThreeDigits value={cpf} onChange={setCpf} disabled={busy} label="3 primeiros dígitos do seu CPF" />
            <p className="hint">Informe os três primeiros números do CPF cadastrado.</p>
          </div>
          <button type="submit" disabled={busy || cpf.length !== 3}>
            {busy ? 'Verificando...' : 'Acessar comanda'}
          </button>
        </form>}
      <span className="readonly"><Eye size={14} /> Acesso somente para consulta</span>
      <p className="hint" style={{ marginTop: 12 }}>O cartão sozinho não libera dados. O acesso é temporário.</p>
    </section>{error && <p className="error" role="alert">{error}</p>}</>}
    {visit && <>
      <div className="restaurant"><Store size={15} /> {visit.restaurantName}</div>
      <div className="between"><p className="greeting">Olá, {visit.customerName}.</p>
        <span className="readonly"><Eye size={14} /> Somente consulta</span></div>
      <h1>Sua comanda.</h1>
      <div className="visit"><span><CreditCard size={15} /> {visit.cardCode}</span>
        <span><UtensilsCrossed size={15} /> {visit.tableNumber === null ? 'Sem mesa' : 'Mesa ' + visit.tableNumber}</span>
        <span>Comanda {visit.id.slice(0, 8).toUpperCase()}</span></div>
      <section className="card balance-card" aria-label="Resumo da comanda">
        <div className="between"><span className="small">Saldo em aberto</span>
          <span className="open">{visit.outstandingCents > 0 ? '● Em aberto' : '● Sem saldo'}</span></div>
        <div className="balance">{money(visit.outstandingCents)}</div>
        <div className="totals"><div><span className="small">Total consumido</span><strong>{money(visit.totalCents)}</strong></div>
          <div><span className="small">Já pago</span><strong>{money(visit.paidCents)}</strong></div></div>
      </section>
      <section aria-label="Pedidos da visita"><div className="between section-head"><h2>Seus pedidos</h2>
        <span className="small">{orders.length} {orders.length === 1 ? 'pedido' : 'pedidos'} nesta visita</span></div>
        <div className="orders">
          {orders.map((order, index) => {
            const items = visit.items.filter(item => item.sourceOrderId === order.id);
            return <details className="order" key={order.id} defaultOpen={index === 0}>
              <summary><div><div className="order-title">Pedido #{order.id}</div>
                <p className="order-meta">{time(order.createdAt)} · {items.reduce((sum, item) => sum + item.quantity, 0)} itens</p></div>
                <div className="order-side"><span className={'status' + (order.status === 'ENTREGUE' ? ' delivered' : '')}>
                  {states[order.status] || order.status}</span>
                  <strong>{money(items.reduce((sum, item) => sum + item.totalCents, 0))}</strong></div>
                <ChevronDown className="chevron" size={16} /></summary>
              <div className="order-items">{items.map(item => <div className="item" key={item.id}>
                <div className="between"><div><strong>{item.description}</strong>
                  <p className="order-meta">{item.quantity} × {money(item.unitPriceCents)} por unidade</p></div>
                  <strong className="item-price">{money(item.totalCents)}</strong></div>
                {item.observation && <p className="item-note">Observação: {item.observation}</p>}
              </div>)}{order.observation && !items.some(item => item.observation === order.observation)
                && <p className="item-note">Observação do pedido: {order.observation}</p>}</div>
            </details>;
          })}
          {visit.items.filter(item => item.sourceOrderId === null).map(item => <div className="card" key={item.id}>
            <div className="between"><strong>{item.description}</strong><strong>{money(item.totalCents)}</strong></div>
          </div>)}
          {visit.items.length === 0 && <p className="small">Nenhum consumo registrado nesta visita.</p>}
        </div>
      </section>
      {visit.payments.length > 0 && <details className="payment">
        <summary><span className="row"><CheckCircle2 size={16} className="green" /> Pagamentos registrados</span>
          <strong>{money(visit.payments.reduce((sum, p) => sum + p.amountCents, 0))}</strong><ChevronDown size={16} className="chevron" /></summary>
        <div className="payment-body">{visit.payments.map(payment => <div key={payment.id}>
          <div className="between"><span className="muted">Pagamento confirmado {payment.confirmedAt ? time(payment.confirmedAt) : ''}</span>
            <strong>{money(payment.amountCents)}</strong></div></div>)}
          <p>Somente pagamentos confirmados são apresentados. O saldo é calculado pelo servidor.</p></div>
      </details>}
      {visit.payments.length === 0 && visit.paidCents > 0 && <div className="card payment">
        <div className="between"><span className="row"><CheckCircle2 size={16} className="green" /> Valor já pago</span>
          <strong>{money(visit.paidCents)}</strong></div></div>}
      <p className="help"><ConciergeBell size={16} /> Para fazer outro pedido, fale com o garçom.</p>
      <button className="refresh" type="button" disabled={busy} onClick={() => void load(session)}>
        <RefreshCw size={17} /> Atualizar comanda</button>
      <p className="verified" role="status">Atualizado: {updated ? time(updated) : 'Consultando...'} · Consulta automática a cada 5 segundos.</p>
      {error && <p className="error" role="alert">{error}</p>}
    </>}
    <footer className="foot"><ShieldCheck size={15} /> Consulta protegida · somente leitura.</footer>
  </div></Layout>;
}
