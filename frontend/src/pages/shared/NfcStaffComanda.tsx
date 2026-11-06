import { useCallback, useEffect, useState } from 'react';
import api from '../../Services/api';
import { NfcProductThumbnail } from './NfcProductThumbnail';
import { nfcFriendlyOrderStatus } from './nfcFriendlyMessages';
import { CheckCircle2, ChevronDown, ClipboardList, CreditCard, RefreshCw, ShieldCheck, UtensilsCrossed } from 'lucide-react';

type Visit = {
  id: string; status: 'OPEN' | 'UNPAID' | 'PAID' | 'CANCELLED'; tableNumber: number | null;
  totalCents: number; paidCents: number; outstandingCents: number;
  items: Array<{ id: string; orderId: number | null; description: string; quantity: number; totalCents: number; image?: string | null }>;
  orders: Array<{ id: number; status: string }>;
  payments: Array<{ id: string; status: string; amountCents: number }>;
};
type Context = { card: { displayCode: string; status: string }; customer: { name: string } | null; comanda: Visit | null };
const money = (value: number) => (value / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function NfcStaffComanda({ token }: { token: string }) {
  const [data, setData] = useState<Context | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'orders'|'payments'>('orders');
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const load = useCallback(async () => {
    const result = await api.post<Context>('/nfc-registration/cards/staff-comanda',
      { token }, { skipBaseUrlFallback: true });
    setData(result.data);
    setError('');
  }, [token]);
  useEffect(() => {
    let active = true;
    void api.post<Context>('/nfc-registration/cards/staff-comanda',
      { token }, { skipBaseUrlFallback: true }).then(response => {
      if (active) { setData(response.data); setError(''); }
    }).catch(() => { if (active) setError('Não foi possível consultar a comanda.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);
  const visit = data?.comanda;
  return <section aria-label="Consulta de comanda do cliente">
    {loading && <p role="status" className="gx-line-note">Carregando comanda...</p>}
    {error && <p role="alert" className="gx-error">{error}</p>}
    {data && <>
      <div className="gx-inline-context"><span className="gx-avatar"><CreditCard aria-hidden="true"/></span>
        <div><strong>{data.customer?.name || 'Cliente vinculado'}</strong><small>Cartão {data.card.displayCode} · {visit ? '#'+visit.id.slice(0,8).toUpperCase() : 'Sem comanda'}</small></div>
        <CheckCircle2 aria-hidden="true"/></div>
      {!visit ? <section className="gx-panel gx-empty"><span><ClipboardList aria-hidden="true"/></span><h2>Nenhuma comanda vinculada</h2>
        <p>Confira o vínculo do cartão e abra uma comanda para este cliente.</p></section> : <>
        <section className="gx-balance" aria-label="Resumo financeiro">
          <div className="gx-balance-label"><span>Saldo a pagar</span><span className="gx-pill">{visit.status === 'PAID' ? 'Quitada' : visit.status === 'UNPAID' ? 'Pendente' : 'Em atendimento'}</span></div>
          <strong>{money(visit.outstandingCents)}</strong>
          <dl><div><dt>Total consumido</dt><dd>{money(visit.totalCents)}</dd></div><div><dt>Total pago</dt><dd>{money(visit.paidCents)}</dd></div></dl>
        </section>
        <div className="gx-bill-tabs" role="group" aria-label="Dados da comanda">
          <button type="button" aria-pressed={tab==='orders'} onClick={()=>setTab('orders')}>Pedidos ({visit.orders.length})</button>
          <button type="button" aria-pressed={tab==='payments'} onClick={()=>setTab('payments')}>Pagamentos ({visit.payments.length})</button>
        </div>
        {tab==='orders' ? <section className="gx-panel" aria-label="Pedidos e itens consumidos">
          {visit.orders.length===0 && visit.items.length===0 ? <div className="gx-empty">
            <span><UtensilsCrossed aria-hidden="true"/></span><h2>Nenhum pedido registrado</h2><p>Os pedidos feitos durante o atendimento aparecerão aqui.</p>
          </div> : <>
            {visit.orders.map(order => {
              const expanded = (expandedOrderId ?? visit.orders[0]?.id) === order.id;
              const orderItems = visit.items.filter(item => item.orderId === order.id);
              return <div className="gx-order-card gx-order-accordion" key={order.id}>
                <button type="button" className="gx-order-toggle" aria-expanded={expanded}
                  aria-controls={`nfc-order-items-${order.id}`}
                  onClick={() => setExpandedOrderId(expanded ? -1 : order.id)}>
                  <span className="gx-order-top"><strong>Pedido #{order.id}</strong><span className="gx-pill">{nfcFriendlyOrderStatus(order.status)}</span></span>
                  <ChevronDown className={expanded ? 'gx-order-chevron is-open' : 'gx-order-chevron'} aria-hidden="true" />
                </button>
                <div id={`nfc-order-items-${order.id}`} className="gx-order-details" data-open={expanded}>
                  <div className="gx-order-details-inner">
                    {orderItems.length ? orderItems.map(item=><div className="gx-mini-line" key={item.id}>
                      <NfcProductThumbnail source={item.image}/><span>{item.quantity}× {item.description}</span><strong>{money(item.totalCents)}</strong>
                    </div>) : <p className="gx-line-note">Nenhum item registrado neste pedido.</p>}
                  </div>
                </div>
              </div>;
            })}
            {visit.items.filter(item => item.orderId == null).length > 0 && <div className="gx-order-unlinked">
              <strong>Outros itens da comanda</strong>
              {visit.items.filter(item => item.orderId == null).map(item=><div className="gx-mini-line" key={item.id}>
                <NfcProductThumbnail source={item.image}/><span>{item.quantity}× {item.description}</span><strong>{money(item.totalCents)}</strong>
              </div>)}
            </div>}
          </>}
        </section> : <section className="gx-panel" aria-label="Histórico de pagamentos">
          {visit.payments.length===0 ? <div className="gx-empty"><span><CreditCard aria-hidden="true"/></span>
            <h2>Nenhum pagamento registrado</h2><p>Os pagamentos realizados aparecerão aqui após a confirmação.</p></div> :
            visit.payments.map(payment=><div className="gx-order-card" key={payment.id}>
              <div className="gx-order-top"><strong>{money(payment.amountCents)}</strong>
                <span className="gx-pill">{payment.status==='CONFIRMED' ? 'Confirmado' : payment.status==='REVERSED' ? 'Estornado' : 'Pendente'}</span>
              </div>
            </div>)}
        </section>}
      </>}
      <div className="gx-refresh-row"><span>Informações da comanda</span>
        <button type="button" className="gx-button" disabled={loading} onClick={()=>{
          setLoading(true); void load().catch(()=>setError('Não foi possível atualizar a comanda.')).finally(()=>setLoading(false));
        }}><RefreshCw aria-hidden="true"/> Atualizar</button>
      </div>
    </>}
    <p className="gx-line-note"><ShieldCheck aria-hidden="true"/> Aqui você pode acompanhar pedidos e pagamentos sem alterar a comanda.</p>
  </section>;
}
