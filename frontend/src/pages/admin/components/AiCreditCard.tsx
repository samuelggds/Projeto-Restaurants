import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { QrCode, RefreshCw, X } from 'lucide-react';
import aiGuideService, {
  type AiCreditBalance,
  type AiCreditTopUp,
  type AiCreditTopUpQuote,
} from '../../../Services/aiGuideService';
import { ChatGptLogo } from '../../../components/ChatGptLogo';

function usd(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(Math.max(0, value));
}

function brl(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(Math.max(0, value));
}

function requestMessage(error: unknown, fallback: string) {
  if (!error || typeof error !== 'object') return fallback;
  const response = 'response' in error ? (error as { response?: { data?: { error?: unknown } } }).response : undefined;
  const providerMessage = response?.data?.error;
  if (typeof providerMessage === 'string' && providerMessage.trim()) return providerMessage;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function AiCreditCard({ balance }: { balance: AiCreditBalance | null }) {
  const [balanceOverride, setBalanceOverride] = useState<AiCreditBalance | null>(null);
  const [open, setOpen] = useState(false);
  const currentBalance = balanceOverride ?? balance;
  const remaining = currentBalance?.remainingUsd ?? 0;
  const exhausted = currentBalance?.exhausted === true;

  return (
    <>
      <Card data-tour="ai-credits" $exhausted={exhausted}>
        <div className="topline">
          <span className="icon" aria-hidden="true"><ChatGptLogo /></span>
          <span className="title-copy">
            <b>Créditos OpenAI</b>
            <small>Saldo da sua carteira</small>
          </span>
        </div>
        <div className="balance-row">
          <strong>{usd(remaining)}</strong>
          <span className="available">
            {exhausted ? 'Saldo esgotado' : 'disponíveis para usar com IA'}
          </span>
        </div>
        <button className="topup" type="button" onClick={() => setOpen(true)}>
          Recarregar créditos
        </button>
        <p>
          O Premium concede US$ 2 uma única vez por ADMIN. Depois disso, o saldo só aumenta por
          recargas pagas.
        </p>
      </Card>
      {open ? (
        <TopUpDialog onClose={() => setOpen(false)} onBalance={setBalanceOverride} />
      ) : null}
    </>
  );
}

function TopUpDialog({
  onClose,
  onBalance,
}: {
  onClose: () => void;
  onBalance: (balance: AiCreditBalance) => void;
}) {
  const [amountText, setAmountText] = useState('5.00');
  const amountUsd = useMemo(() => Number(amountText.replace(',', '.')), [amountText]);
  const [quote, setQuote] = useState<AiCreditTopUpQuote | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [topUp, setTopUp] = useState<AiCreditTopUp | null>(null);
  const [confirmedBalance, setConfirmedBalance] = useState<AiCreditBalance | null>(null);

  useEffect(() => {
    if (!Number.isFinite(amountUsd) || amountUsd <= 0) return;
    const timeout = window.setTimeout(() => {
      setLoadingQuote(true);
      setError('');
      void aiGuideService
        .getTopUpQuote(amountUsd)
        .then((next) => {
          setQuote(next);
        })
        .catch((requestError: unknown) => {
          setQuote(null);
          setError(requestMessage(requestError, 'Não foi possível consultar a cotação.'));
        })
        .finally(() => setLoadingQuote(false));
    }, 450);
    return () => window.clearTimeout(timeout);
  }, [amountUsd]);

  useEffect(() => {
    const publicId = topUp?.publicId;
    if (!publicId || !['PENDING', 'PROCESSING'].includes(topUp.status)) return;

    let cancelled = false;
    let timeoutId: number | undefined;

    const poll = async () => {
      let finalState = false;
      try {
        const topUps = await aiGuideService.listTopUps();
        const latest = topUps.find((item) => item.publicId === publicId);
        if (cancelled || !latest) return;

        setTopUp(latest);
        finalState = ['PAID', 'FAILED', 'CANCELED', 'EXPIRED'].includes(latest.status);

        if (latest.status === 'PAID') {
          const nextBalance = await aiGuideService.getCredits();
          if (cancelled) return;
          onBalance(nextBalance);
          setConfirmedBalance(nextBalance);
        }
      } catch {
        // A confirmação continua sendo processada pelo webhook; uma falha temporária
        // de consulta não deve transformar um Pix pendente em erro para o usuário.
      }

      if (!cancelled && !finalState) {
        timeoutId = window.setTimeout(() => void poll(), 2000);
      }
    };

    timeoutId = window.setTimeout(() => void poll(), 1200);
    return () => {
      cancelled = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [topUp?.publicId, topUp?.status, onBalance]);

  async function refreshBalance() {
    const next = await aiGuideService.getCredits();
    onBalance(next);
    setConfirmedBalance(next);
    return next;
  }

  async function payPix() {
    if (!quote) return;
    setPaying(true);
    setError('');
    try {
      const result = await aiGuideService.createPixTopUp(quote.creditUsd);
      setTopUp(result);
      if (result.status === 'PAID') await refreshBalance();
    } catch (requestError: unknown) {
      setError(requestMessage(requestError, 'Não foi possível gerar o Pix.'));
    } finally {
      setPaying(false);
    }
  }

  return (
    <Overlay onMouseDown={(event) => event.target === event.currentTarget && !paying && onClose()}>
      <Modal role="dialog" aria-modal="true" aria-labelledby="ai-credit-topup-title">
        <header>
          <div>
            <span className="eyebrow">CRÉDITOS DE IA</span>
            <h2 id="ai-credit-topup-title">Recarregar carteira</h2>
          </div>
          <button type="button" className="close" onClick={onClose} disabled={paying}>
            <X size={20} />
          </button>
        </header>

        <label>
          Valor da recarga em dólar (USD)
          <input
            inputMode="decimal"
            value={amountText}
            onChange={(event) => {
              setAmountText(event.target.value.replace(/[^0-9.,]/g, ''));
              setQuote(null);
            }}
            placeholder="10.00"
            disabled={paying || Boolean(topUp)}
          />
        </label>

        <div className="quote" aria-live="polite">
          {loadingQuote ? (
            <span><RefreshCw size={15} className="spin" /> Atualizando cotação em tempo real...</span>
          ) : quote ? (
            <>
              <strong>{usd(quote.creditUsd)} em créditos</strong>
              <span>US$ 1 = {brl(quote.exchangeRateBrlPerUsd)}</span>
              <span>Conversão: {brl(quote.baseAmountBrl)}</span>
              {quote.markupPercent > 0 ? <span>Taxa de serviço: {quote.markupPercent}%</span> : null}
              <b>Você paga {brl(quote.amountBrl)}</b>
              <small>Cotação consultada automaticamente no momento da recarga.</small>
            </>
          ) : (
            <span>Informe um valor para consultar a cotação.</span>
          )}
        </div>

        {quote ? (
          <div className="pix-only" aria-label="Forma de pagamento">
            <QrCode size={20} />
            <span>
              <b>Pagamento por Pix</b>
              <small>Gere o QR Code ou use o código copia e cola. A confirmação é automática.</small>
            </span>
          </div>
        ) : null}

        {topUp?.paymentMethod === 'PIX' &&
        topUp.pixQrCode &&
        ['PENDING', 'PROCESSING'].includes(topUp.status) ? (
          <div className="pix-result">
            {topUp.pixQrCodeBase64 ? (
              <img src={`data:image/png;base64,${topUp.pixQrCodeBase64}`} alt="QR Code Pix da recarga" />
            ) : null}
            <label>
              Pix copia e cola
              <textarea readOnly value={topUp.pixQrCode} rows={3} />
            </label>
            <button type="button" onClick={() => void navigator.clipboard.writeText(topUp.pixQrCode || '')}>
              Copiar código Pix
            </button>
          </div>
        ) : null}

        {topUp?.status === 'PAID' ? (
          <p className="success" role="status" aria-live="polite">
            Pagamento confirmado! {usd(topUp.creditUsd)} foram adicionados à sua carteira.
            {confirmedBalance ? ` Novo saldo: ${usd(confirmedBalance.remainingUsd)}.` : ''}
          </p>
        ) : null}
        {topUp && ['PENDING', 'PROCESSING'].includes(topUp.status) ? (
          <p className="pending" role="status" aria-live="polite">
            Aguardando confirmação do Mercado Pago. Esta tela atualiza automaticamente após o pagamento.
          </p>
        ) : null}
        {topUp && ['FAILED', 'CANCELED', 'EXPIRED'].includes(topUp.status) ? (
          <p className="error">{topUp.failureReason || 'A cobrança não foi concluída.'}</p>
        ) : null}
        {error ? <p className="error" role="alert">{error}</p> : null}

        <footer>
          {quote && !topUp?.pixQrCode ? (
            <button
              type="button"
              className="primary"
              disabled={paying || loadingQuote}
              onClick={() => void payPix()}
            >
              {paying ? 'Processando...' : 'Gerar QR Code Pix'}
            </button>
          ) : null}
        </footer>
      </Modal>
    </Overlay>
  );
}

const Card = styled.aside<{ $exhausted: boolean }>`
  margin: 2px 4px 10px;
  padding: 10px 8px 12px;
  border: 0;
  border-radius: 0;
  color: #fff;
  background: transparent;
  box-shadow: none;
  .topline { display: flex; align-items: center; gap: 9px; }
  .topline .icon { width: 24px; height: 24px; flex: 0 0 24px; display: grid; place-items: center; color: ${({ $exhausted }) => ($exhausted ? '#fca5a5' : '#f4efeb')}; }
  .topline svg { width: 18px; height: 18px; }
  .title-copy { min-width: 0; display: grid; gap: 1px; }
  .topline b { color: #f7f2ee; font-size: 11px; font-weight: 760; }
  .topline small { color: #8f8781; font-size: 8px; font-weight: 700; text-transform: uppercase; }
  .balance-row { margin-top: 10px; display: grid; gap: 3px; }
  .balance-row > strong { font-family: 'Sora', sans-serif; font-size: 21px; line-height: 1; }
  .available { color: ${({ $exhausted }) => ($exhausted ? '#fca5a5' : '#a9a19b')}; font-size: 9px; }
  .topup { margin-top: 10px; width: 100%; border: 1px solid rgba(255,255,255,.16); border-radius: 8px; padding: 7px 9px; color: #f7f2ee; background: rgba(255,255,255,.06); font: inherit; font-size: 9px; font-weight: 750; cursor: pointer; }
  p { margin: 8px 0 0; color: #776f6a; font-size: 8px; line-height: 1.45; }
  @media (max-width: 820px) { margin-inline: 0; }
`;

const Overlay = styled.div`
  position: fixed; inset: 0; z-index: 1800; display: grid; place-items: center; padding: 20px; background: rgba(10, 15, 13, .58); backdrop-filter: blur(5px);
`;

const Modal = styled.div`
  width: min(520px, 100%); max-height: min(760px, 92vh); overflow: auto; border-radius: 18px; padding: 22px; color: #1e2925; background: #fffdf9; box-shadow: 0 28px 80px rgba(10,20,16,.24);
  header { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; }
  h2 { margin: 4px 0 0; font-size: 24px; }
  .eyebrow { font-size: 10px; font-weight: 800; letter-spacing:.12em; color:#6b746f; }
  .close { border:0; background:transparent; cursor:pointer; color:#44504b; }
  > label { display:grid; gap:7px; margin-top:18px; font-size:12px; font-weight:750; }
  input, textarea { width:100%; box-sizing:border-box; border:1px solid #d9dedb; border-radius:10px; padding:11px 12px; background:#fff; color:#1e2925; font:inherit; }
  .quote { margin-top:14px; padding:13px; border-radius:12px; background:#f1f5f2; display:grid; gap:4px; font-size:12px; }
  .quote > span { display:flex; align-items:center; gap:7px; }
  .quote b { font-size:16px; }
  .quote small { color:#65706b; }
  .spin { animation: spin .9s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .pix-only { margin-top:14px; display:flex; align-items:center; gap:10px; border:1px solid #bfd4ca; border-radius:12px; padding:12px; background:#f2f7f4; color:#24302b; }
  .pix-only > span { display:grid; gap:2px; }
  .pix-only small { font-size:10px; color:#5f6d66; }
  .pix-result { margin-top:16px; display:grid; gap:10px; }
  .pix-result img { width:190px; max-width:100%; margin:auto; border-radius:10px; }
  .pix-result label { display:grid; gap:6px; font-size:11px; font-weight:750; }
  .pix-result button { justify-self:start; border:1px solid #d3d9d6; border-radius:9px; padding:8px 10px; background:#fff; cursor:pointer; }
  .error, .success, .pending { margin:12px 0 0; padding:10px 12px; border-radius:10px; font-size:11px; }
  .error { background:#fff0f0; color:#9d2525; }
  .success { background:#edf8f0; color:#176c38; }
  .pending { background:#fff8e8; color:#7c5b13; }
  footer { margin-top:18px; display:flex; justify-content:flex-end; gap:9px; }
  footer button { border:1px solid #d5dbd8; border-radius:10px; padding:10px 13px; background:#fff; cursor:pointer; font-weight:750; }
  footer .primary { border-color:#244d3c; background:#244d3c; color:#fff; }
  footer button:disabled { opacity:.55; cursor:not-allowed; }
  @media (max-width: 520px) { padding:18px; }
`;