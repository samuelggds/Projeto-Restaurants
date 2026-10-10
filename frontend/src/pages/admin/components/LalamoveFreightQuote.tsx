import { useEffect, useRef, useState } from 'react';
import restaurantSettingsService from '../../../Services/restaurantSettingsService';

type Quote = {
  id: string; status: string; version: number; total: string | null; currency: string | null;
  expiresAt: string; serviceType: string | null; thermalBagRequired: boolean;
  canDispatch: false; environment: 'sandbox';
};
const SAFE_ERRORS = new Set([
  'Somente o ADMIN do restaurante pode consultar fretes.',
  'Pedido indisponível para cotação de frete parceiro.',
  'Restaurante indisponível.',
  'Endereço incompleto para cotação.',
  'Conexão sandbox Lalamove não validada.',
  'Geocodificação não configurada no servidor. Contate o suporte.',
  'Confirme os endereços no mapa antes de consultar o frete.',
  'Cotação térmica indisponível. Verifique o endereço e a cobertura.',
  'Cotação concorrente. Atualize.',
  'Endereço ou conta modificados. Aguarde a cotação expirar.',
  'Pedido ou conta alterados durante a cotação.',
  'Valor, validade ou versão da cotação divergente. Consulte novamente.',
]);
export function safeQuoteError(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { error?: unknown } } }).response;
    const message = response?.data?.error;
    if (typeof message === 'string' && SAFE_ERRORS.has(message)) return message;
  }
  return 'Não foi possível consultar a cotação Lalamove. Tente novamente ou contate o suporte.';
}
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
      .catch((reason: unknown) => { if (active) setError(safeQuoteError(reason)); })
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
    } catch (reason: unknown) {
      setError(safeQuoteError(reason));
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
