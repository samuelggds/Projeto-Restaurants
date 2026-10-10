import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Bike, CheckCircle2, ChevronDown, Clock3, Info, LoaderCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import { useAppDialog } from '../../../components/AppDialog/context';
import { QuoteSection } from './LalamoveFreightQuote.styles';
import restaurantSettingsService from '../../../Services/restaurantSettingsService';

type Quote = {
  id: string; status: string; version: number; total: string | null; currency: string | null;
  expiresAt: string; serviceType: string | null; thermalBagRequired: boolean;
  canDispatch: false; environment: 'sandbox';
};
import { safeQuoteError } from './lalamoveQuoteError';

export function LalamoveFreightQuote({ orderId }: { orderId: number }) {
  const { confirmDialog } = useAppDialog();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const pending = useRef(false);
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [open]);
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
        const accepted = await confirmDialog({
          title: 'Aprovar cotação sandbox?',
          description: 'Confirmar custo de R$ ' + quote!.total + '. Nenhum entregador será contratado e nenhuma cobrança será feita.',
          confirmLabel: 'Aprovar valor',
          cancelLabel: 'Voltar',
        });
        if (!accepted) return;
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
  const valid = Boolean(quote && quote.expiresAt && new Date(quote.expiresAt).getTime() > now);
  const canRequest = !loading && !(valid && quote &&
    ['REQUESTING', 'AVAILABLE', 'APPROVED'].includes(quote.status));
  const canApprove = !loading && valid && quote?.status === 'AVAILABLE' && Boolean(quote.total);
  const approved = Boolean(valid && quote?.status === 'APPROVED');
  const available = Boolean(valid && quote?.status === 'AVAILABLE');
  const price = quote?.total ? Number(quote.total).toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL',
  }) : null;
  const statusLabel = loading ? 'Consultando' : approved ? 'Valor aprovado' :
    available ? 'Cotação disponível' : quote?.status === 'REQUESTING' && valid
      ? 'Em processamento' : quote && (!valid || quote.status === 'EXPIRED')
        ? 'Cotação expirada' : quote?.status === 'FAILED' ? 'Indisponível' : 'Aguardando consulta';
  return (
    <QuoteSection aria-label={'Frete Lalamove pedido ' + orderId}>
      <button type="button" className="quote-toggle" aria-expanded={open}
        aria-controls={'lalamove-panel-' + orderId} onClick={() => setOpen(value => !value)}>
        <span className="toggle-leading">
          <span className="toggle-icon"><Bike aria-hidden="true" /></span>
          <span className="toggle-copy">
            <strong>Entrega parceira · Lalamove</strong>
            <small>Consultar frete com bolsa térmica</small>
          </span>
        </span>
        <span className="toggle-trailing">
          <span className="sandbox-badge">Sandbox</span>
          <ChevronDown className="chevron" aria-hidden="true" />
        </span>
      </button>
      {open && <div id={'lalamove-panel-' + orderId} className="quote-panel">
        <div className="quote-overview">
          <div>
            <strong>Simule o valor da entrega</strong>
            <p>Preço calculado para este pedido, utilizando a conta sandbox do seu restaurante.</p>
          </div>
          <span className="thermal-pill"><ShieldCheck aria-hidden="true" /> Bolsa térmica obrigatória</span>
        </div>
        {loading && <div className="quote-loading" role="status">
          <LoaderCircle aria-hidden="true" /> Consultando informações do frete...
        </div>}
        <div className={'quote-result' + (approved ? ' quote-result--approved' :
          available ? ' quote-result--ready' : '')}>
          <div className="result-heading">
            <span className="status-badge">
              {approved || available ? <CheckCircle2 aria-hidden="true" /> : <Clock3 aria-hidden="true" />}
              {statusLabel}
            </span>
            <small>Valor estimado do parceiro</small>
          </div>
          {valid && price && (available || approved) ? (
            <div className="price-grid">
              <div className="price-value"><span>Custo do frete</span><strong>{price}</strong></div>
              <div className="price-meta">
                <span><Bike aria-hidden="true" /> {quote?.serviceType === 'LALAPRO' ? 'LalaPro' : 'LalaGo'}</span>
                <span><Clock3 aria-hidden="true" /> Até {new Date(quote!.expiresAt).toLocaleTimeString('pt-BR', {
                  hour: '2-digit', minute: '2-digit',
                })}</span>
              </div>
            </div>
          ) : <p className="quote-status-copy">
            {quote?.status === 'REQUESTING' && valid
              ? 'A consulta está em processamento. Aguarde um instante e atualize o painel.'
              : quote && (!valid || quote.status === 'EXPIRED')
                ? 'O valor anterior perdeu a validade. Faça uma nova consulta antes de aprovar.'
                : quote?.status === 'FAILED'
                  ? 'A consulta não foi concluída. Confira a mensagem abaixo e tente novamente.'
                  : 'Faça a primeira consulta para conhecer o valor e a validade do frete.'}
          </p>}
        </div>
        {error && <div className="quote-alert" role="alert">
          <AlertCircle aria-hidden="true" />
          <div><strong>Não foi possível consultar o frete</strong><p>{error}</p></div>
        </div>}
        {notice && <div className="quote-alert quote-alert--success" role="status">
          <CheckCircle2 aria-hidden="true" />
          <div><strong>Solicitação concluída</strong><p>{notice}</p></div>
        </div>}
        <div className="quote-actions">
          <button type="button" className="quote-action quote-action--primary"
            disabled={!canRequest} onClick={() => void mutate('quote')}>
            {loading ? <LoaderCircle className="quote-action-loading" aria-hidden="true" /> :
              <RefreshCw aria-hidden="true" />}
            {quote ? 'Consultar novamente' : 'Consultar valor do frete'}
          </button>
          {canApprove && <button type="button" className="quote-action quote-action--approve"
            onClick={() => void mutate('approve')}>
            <CheckCircle2 aria-hidden="true" /> Aprovar valor sandbox
          </button>}
        </div>
        <div className="quote-disclaimer">
          <Info aria-hidden="true" />
          <span>Ambiente de testes: a aprovação não contrata um motoboy, não realiza cobrança
            e não altera o valor da entrega pago pelo cliente.</span>
        </div>
      </div>}
    </QuoteSection>
  );
}
