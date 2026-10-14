import { useEffect, useState } from 'react';
import api from '../../../Services/api';
import * as S from './PromotionsSettings.styles';

type Customer = { id: number; name: string; email: string };

export function CouponRecipientSelector({
  selected,
  onChange,
}: {
  selected: number[];
  onChange: (ids: number[]) => void;
}) {
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    const handle = window.setTimeout(() => {
      void api.get('/coupons/eligible-customers', { params: { search: query.trim() } })
        .then(({ data }) => { if (active) setCustomers(Array.isArray(data) ? data : []); })
        .catch(() => { if (active) { setCustomers([]); setError('Não foi possível carregar os clientes cadastrados.'); } })
        .finally(() => { if (active) setLoading(false); });
    }, 200);
    return () => { active = false; window.clearTimeout(handle); };
  }, [query]);

  const toggle = (id: number) => onChange(
    selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id],
  );

  return (
    <S.Field className="full">
      <span>Destinatários do cupom ({selected.length} selecionados)</span>
      <input aria-label="Buscar clientes cadastrados" placeholder="Buscar cliente por nome ou e-mail"
        value={query} onChange={(event) => setQuery(event.target.value)} />
      {loading ? <small>Buscando clientes...</small> : null}
      {error ? <small role="alert">{error}</small> : null}
      <div role="group" aria-label="Clientes destinatários" style={{ maxHeight: 210, overflowY: 'auto', display: 'grid', gap: 6 }}>
        {customers.map((customer) => (
          <label key={customer.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: 7, border: '1px solid #eee', borderRadius: 8 }}>
            <input type="checkbox" checked={selected.includes(customer.id)} onChange={() => toggle(customer.id)} />
            <span>{customer.name} — {customer.email}</span>
          </label>
        ))}
        {!loading && !error && customers.length === 0 ? <small>Nenhum cliente autenticado encontrado.</small> : null}
      </div>
    </S.Field>
  );
}
