import { useEffect, useRef, useState } from 'react';
import restaurantSettingsService from '../../../Services/restaurantSettingsService';

type Quote = {
  id: string; status: string; version: number; total: string | null; currency: string | null;
  expiresAt: string; serviceType: string | null; thermalBagRequired: boolean;
  canDispatch: false; environment: 'sandbox';
};
export function LalamoveFreightQuote({ orderId }: { orderId: number }) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const pending = useRef(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    let active = true;
    void restaurantSettingsService.getLalamoveDeliveryQuote(orderId)
      .then(data => { if (active) { setQuote(data as Quote | null); setError(''); } })
      .catch(() => { if (active) setError('Não foi possível consultar o frete Lalamove.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [orderId, open]);

  async function mutate(action: 'quote' | 'approve') {
    if (pending.current || loading) return;
    if (action === 'approve' && (!quote || quote.status !== 'AVAILABLE' || !quote.total ||
      new Date(quote.expiresAt).getTime() <= Date.now())) return;
    pending.current = true;
    setLoading(true);
    setError('');
    setNotice('');
    try {
      let result: Quote;
      if (action === 'quote') {
        result = await restaurantSettingsService.requestLalamoveDeliveryQuote(orderId, crypto.randomUUID()) as Quote;
      } else {
        if (!window.confirm('Aprovar o custo de frete sandbox de R$ ' + quote!.total + '? Isso NÃO contratará um entregador.')) return;
        result = await restaurantSettingsService.approveLalamoveDeliveryQuote(orderId, quote!.version, quote!.total!) as Quote;
      }
      setQuote(result);
      setNotice(action === 'quote' ? 'Cotação sandbox registrada com bolsa térmica.' :
        'Valor sandbox aprovado. Nenhuma entrega foi contratada.');
    } catch {
      setError('Não foi possível concluir. Verifique o pedido, a conexão sandbox e a validade do valor.');
    } finally {
      pending.current = false;
      setLoading(false);
    }
  }
  const valid = quote && quote.status !== 'EXPIRED';
  return <section aria-label={'Frete Lalamove pedido ' + orderId}>
    <button type="button" disabled={loading} onClick={() => setOpen(v => !v)}>
      {open ? 'Fechar cotação Lalamove' : 'Cotação Lalamove (sandbox)'}
    </button>
    {open && <>
      <p>Somente simulação sandbox, com motoboy e bolsa térmica obrigatória. Não contrata entrega nem altera o frete do cliente.</p>
      {loading && <p role="status">Consultando frete...</p>}
      {quote && <p role="status">
        {quote.status === 'REQUESTING' ? 'Consulta em processamento' :
          quote.status === 'FAILED' ? 'Cotação indisponível' :
          valid ? 'Status: ' + quote.status : 'Cotação expirada'}.
        {valid && quote.total ? ' Total: R$ ' + quote.total + ' · ' + quote.serviceType +
          ' · válida até ' + new Date(quote.expiresAt).toLocaleTimeString('pt-BR') : ''}
      </p>}
      <button type="button" disabled={loading || (Boolean(valid) &&
        ['REQUESTING','AVAILABLE','APPROVED'].includes(quote?.status ?? ''))}
        onClick={() => void mutate('quote')}>Consultar novo frete</button>
      {valid && quote?.status === 'AVAILABLE' && <button type="button"
        disabled={loading} onClick={() => void mutate('approve')}>Aprovar valor sandbox</button>}
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}
    </>}
  </section>;
}
