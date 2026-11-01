import { useCallback, useEffect, useState } from 'react';
import api from '../../Services/api';

type Visit = {
  id: string; status: 'OPEN' | 'UNPAID' | 'PAID'; tableNumber: number | null;
  totalCents: number; paidCents: number; outstandingCents: number;
  items: Array<{ id: string; description: string; quantity: number; totalCents: number }>;
  orders: Array<{ id: number; status: string }>;
  payments: Array<{ id: string; status: string; amountCents: number }>;
};
type Context = { card: { displayCode: string; status: string }; customer: { name: string } | null; comanda: Visit | null };
const money = (value: number) => (value / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function NfcStaffComanda({ token }: { token: string }) {
  const [data, setData] = useState<Context | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
  return <section aria-label="Consulta de comanda do cliente" style={{ display: 'grid', gap: 13 }}>
    {loading && <p role="status">Consultando visita no servidor...</p>}
    {error && <p role="alert">{error}</p>}
    {data && <>
      <p><strong>Cartão:</strong> {data.card.displayCode} · {data.card.status === 'ACTIVE' ? 'Vinculado' : 'Disponível'}</p>
      {!data.comanda ? <p role="status">Não existe comanda atual vinculada a este cartão.</p> : <>
        {data.customer && <p><strong>Cliente:</strong> {data.customer.name}</p>}
        <p><strong>Comanda:</strong> {data.comanda.id.slice(0, 8).toUpperCase()} {data.comanda.tableNumber ? ' · Mesa ' + data.comanda.tableNumber : ''}</p>
        <p><strong>Situação:</strong> {data.comanda.status === 'PAID' ? 'Quitada' : data.comanda.status === 'UNPAID' ? 'Pendente' : 'Em atendimento'}</p>
        <h2>Itens consumidos</h2>
        {data.comanda.items.length ? data.comanda.items.map(item =>
          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span>{item.quantity}× {item.description}</span><strong>{money(item.totalCents)}</strong>
          </div>) : <p>Nenhum item registrado.</p>}
        <h2>Pedidos</h2>
        {data.comanda.orders.length ? data.comanda.orders.map(order =>
          <p key={order.id}>Pedido #{order.id} · {order.status}</p>) : <p>Nenhum pedido registrado.</p>}
        <h2>Valores da visita</h2>
        <p>Total: {money(data.comanda.totalCents)}</p>
        <p>Pago: {money(data.comanda.paidCents)}</p>
        <p><strong>Saldo: {money(data.comanda.outstandingCents)}</strong></p>
        {data.comanda.payments.length > 0 && <><h2>Pagamentos</h2>
          {data.comanda.payments.map(payment => <p key={payment.id}>
            {payment.status === 'CONFIRMED' ? 'Recebido' : payment.status === 'REVERSED' ? 'Estornado' : 'Pendente'} · {money(payment.amountCents)}
          </p>)}
        </>}
      </>}
      <button type="button" disabled={loading} onClick={() => {
        setLoading(true);
        void load().catch(() => setError('Não foi possível atualizar a comanda.'))
          .finally(() => setLoading(false));
      }}>Atualizar consulta</button>
    </>}
    <small>Consulta exclusiva da equipe autenticada. Nenhuma edição ou cobrança é realizada nesta tela.</small>
  </section>;
}
