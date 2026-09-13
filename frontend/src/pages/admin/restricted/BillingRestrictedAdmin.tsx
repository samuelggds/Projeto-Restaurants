import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  CircleAlert,
  Copy,
  LockKeyhole,
  LogOut,
  QrCode,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { useAuth } from '../../../contexts/authContext';
import { getSystemBlockState, isBillingInvoiceBlocking } from '../../../Services/systemBlock';
import { useBillingRecovery } from './useBillingRecovery';
import { BillingPixValidity } from '../components/BillingPixValidity';
import { getBillingPixExpiry, useBillingPixExpiry } from '../components/useBillingPixExpiry';
import { gastroNexaGPath, gastroNexaXPath } from '../../Login/components/gastroNexaMark';
import * as S from './BillingRestrictedAdmin.styles';

const money = (value: number | string) =>
  Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const date = (value?: string | null, time = false) => {
  if (!value || Number.isNaN(new Date(value).getTime())) return 'Não informado';
  return new Intl.DateTimeFormat(
    'pt-BR',
    time
      ? { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }
      : { day: '2-digit', month: 'short', year: 'numeric' },
  ).format(new Date(value));
};

export default function BillingRestrictedAdmin() {
  const { user, logout } = useAuth();
  const restaurantId = Number(
    user?.restaurantId || user?.restaurant?.id || getSystemBlockState()?.restaurantId || 0,
  );
  const {
    invoice,
    invoices,
    planName,
    pix,
    loading,
    loadError,
    checking,
    generatingPix,
    feedback,
    load,
    generatePix,
    verifyRelease,
  } = useBillingRecovery(restaurantId);
  const [copyResult, setCopyResult] = useState<{
    code: string;
    status: 'idle' | 'copied' | 'error';
  }>({ code: '', status: 'idle' });
  const copyState = copyResult.code === pix?.qrCode ? copyResult.status : 'idle';

  const code = useRef<HTMLTextAreaElement>(null);
  const codeDetails = useRef<HTMLDetailsElement>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const validity = useBillingPixExpiry(pix?.expiresAt ?? invoice?.pixExpiresAt);
  const expired = validity.status === 'expired';
  const overdueCount = invoices.filter((item) => isBillingInvoiceBlocking(item)).length;
  const reference = invoice ? String(invoice.month).padStart(2, '0') + '/' + invoice.year : '';

  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    },
    [],
  );

  async function copyPix() {
    if (!pix || getBillingPixExpiry(pix.expiresAt).status !== 'valid') {
      validity.refresh();
      return;
    }
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    try {
      await navigator.clipboard.writeText(pix.qrCode);
      setCopyResult({ code: pix.qrCode, status: 'copied' });
      copiedTimer.current = setTimeout(() => setCopyResult({ code: '', status: 'idle' }), 2500);
    } catch {
      setCopyResult({ code: pix.qrCode, status: 'error' });
      if (codeDetails.current) codeDetails.current.open = true;
      code.current?.focus();
      code.current?.select();
    }
  }

  const requestPix = () => {
    setCopyResult({ code: '', status: 'idle' });

    void generatePix();
  };

  return (
    <S.Root>
      <S.Header>
        <S.Brand aria-label="GastroNexa">
          <svg
            viewBox="0 0 600 470"
            width="40"
            height="36"
            fill="currentColor"
            aria-hidden="true"
            focusable="false"
          >
            <path d={gastroNexaGPath} fillRule="evenodd" />
            <path d={gastroNexaXPath} fillRule="evenodd" />
          </svg>
          <span>
            Gastro<em>Nexa</em>
            <small>CONTA DO RESTAURANTE</small>
          </span>
        </S.Brand>
        <div className="header-actions">
          <span className="secure">
            <ShieldCheck size={15} /> Área financeira protegida
          </span>
          <button type="button" onClick={logout}>
            <LogOut size={16} />
            <span>Sair da conta</span>
          </button>
        </div>
      </S.Header>
      <S.Main>
        <S.Heading>
          <span className="eyebrow">
            MENSALIDADES <span>/</span> REGULARIZAÇÃO
          </span>
          <div className="title-row">
            <div>
              <h1>Regularize sua assinatura</h1>
              <p>
                Um passo para voltar à sua operação. Pague a fatura por aqui e acompanhe a
                confirmação.
              </p>
            </div>
            <span className="status">
              <span />{' '}
              {loading || loadError || invoice ? 'Assinatura em atraso' : 'Conferindo liberação'}
            </span>
          </div>
        </S.Heading>
        {loading ? (
          <S.State role="status" aria-live="polite">
            <RefreshCw className="spin" />
            <h2>Carregando mensalidade...</h2>
            <p>Estamos consultando os dados da sua fatura.</p>
          </S.State>
        ) : loadError ? (
          <S.State role="alert">
            <CircleAlert />
            <h2>Vamos tentar mais uma vez?</h2>
            <p>{loadError}</p>
            <S.Primary type="button" onClick={() => void load()}>
              <RefreshCw size={17} /> Recarregar fatura
            </S.Primary>
          </S.State>
        ) : !invoice ? (
          <S.State role="status">
            <ReceiptText />
            <h2>Conferindo a regularização</h2>
            <p>
              Não encontramos uma fatura em atraso nesta consulta. Vamos confirmar a disponibilidade
              do restaurante antes de retomar o acesso.
            </p>
            <S.Primary type="button" disabled={checking} onClick={() => void verifyRelease()}>
              <RefreshCw size={17} className={checking ? 'spin' : ''} /> Verificar pagamento
            </S.Primary>
            {feedback && (
              <S.Feedback
                $tone={feedback.tone}
                role={feedback.tone === 'error' ? 'alert' : 'status'}
              >
                {feedback.message}
              </S.Feedback>
            )}
          </S.State>
        ) : (
          <S.Layout>
            <S.Receipt aria-labelledby="recovery-invoice-title">
              <div className="receipt-top">
                <span className="receipt-icon">
                  <ReceiptText size={23} />
                </span>
                <span>
                  FATURA EM ABERTO<small>Referência {reference}</small>
                </span>
              </div>
              <h2 id="recovery-invoice-title">Sua mensalidade</h2>
              <strong className="amount">{money(invoice.total ?? invoice.monthlyFee)}</strong>
              <p className="plan">{planName === 'Plano atual' ? planName : `Plano ${planName}`}</p>
              <dl>
                <div>
                  <dt>Vencimento</dt>
                  <dd>{date(invoice.dueDate)}</dd>
                </div>
                <div>
                  <dt>Fatura</dt>
                  <dd>#{invoice.id}</dd>
                </div>
                {Number(invoice.systemFees) > 0 && (
                  <>
                    <div>
                      <dt>Mensalidade</dt>
                      <dd>{money(invoice.monthlyFee)}</dd>
                    </div>
                    <div>
                      <dt>Taxas do sistema</dt>
                      <dd>{money(invoice.systemFees)}</dd>
                    </div>
                  </>
                )}
                <div className="receipt-total">
                  <dt>Total a pagar</dt>
                  <dd>{money(invoice.total ?? invoice.monthlyFee)}</dd>
                </div>
              </dl>
              <div className="receipt-note">
                <LockKeyhole size={17} />
                <span>O acesso às áreas operacionais fica pausado até a regularização.</span>
              </div>
              {overdueCount > 1 && (
                <p className="other-invoices">
                  Há {overdueCount} faturas em atraso. Após confirmar esta, mostraremos a próxima.
                </p>
              )}
              <div className="receipt-bottom">
                <span /> GastroNexa <span />
              </div>
            </S.Receipt>
            <S.PaymentCard aria-labelledby="recovery-pix-title">
              <div className="payment-heading">
                <span className="pix-icon">
                  <QrCode size={22} />
                </span>
                <div>
                  <h2 id="recovery-pix-title">Pague com Pix</h2>
                  <p>Use a câmera do banco ou o Pix copia e cola.</p>
                </div>
              </div>
              {pix && validity.status === 'valid' ? (
                <>
                  <S.PixGrid>
                    <div className="qr-column">
                      <div className="qr" role="img" aria-label="QR Code Pix da fatura">
                        <QRCode value={pix.qrCode} size={204} level="M" />
                      </div>
                      <small>Escaneie no aplicativo do seu banco</small>
                    </div>
                    <div className="copy-column">
                      <span className="mini-label">PREFERE PAGAR NESTE CELULAR?</span>
                      <h3>Copie, cole e pronto.</h3>
                      <p>
                        Copie o código e, no aplicativo do banco, escolha{' '}
                        <strong>Pix copia e cola</strong>. Confira os dados antes de confirmar.
                      </p>
                      <S.Primary type="button" onClick={() => void copyPix()}>
                        {copyState === 'copied' ? <Check size={18} /> : <Copy size={18} />}
                        {copyState === 'copied' ? 'Código copiado' : 'Copiar código Pix'}
                      </S.Primary>
                      <span className="copy-feedback" role="status">
                        {copyState === 'copied'
                          ? 'Agora cole no aplicativo do seu banco.'
                          : copyState === 'error'
                            ? 'Selecione e copie o código abaixo manualmente.'
                            : ''}
                      </span>
                      <details ref={codeDetails}>
                        <summary>Ver código Pix</summary>
                        <label htmlFor="recovery-pix-code" className="sr-only">
                          Código Pix copia e cola
                        </label>
                        <textarea
                          ref={code}
                          id="recovery-pix-code"
                          value={pix.qrCode}
                          readOnly
                          rows={3}
                          onFocus={(event) => event.currentTarget.select()}
                        />
                      </details>
                    </div>
                  </S.PixGrid>
                  <BillingPixValidity validity={validity} />
                </>
              ) : (
                <S.Generate>
                  <div className="qr-placeholder" aria-hidden="true">
                    <QrCode size={52} strokeWidth={1.2} />
                    <span>
                      <LockKeyhole size={13} />
                    </span>
                  </div>
                  <div>
                    <h3>{expired ? 'Este código Pix expirou' : 'Seu Pix, em um clique.'}</h3>
                    <p>
                      {expired
                        ? 'Gere outro código para a mesma fatura. Se já pagou, consulte a confirmação antes de pagar novamente.'
                        : 'Gere um QR Code vinculado à sua mensalidade. O valor e a fatura permanecem os mesmos.'}
                    </p>
                    <S.Primary
                      type="button"
                      disabled={generatingPix || checking}
                      onClick={requestPix}
                    >
                      {generatingPix ? (
                        <RefreshCw size={18} className="spin" />
                      ) : (
                        <QrCode size={18} />
                      )}
                      {generatingPix
                        ? 'Preparando seu Pix...'
                        : expired
                          ? 'Gerar novo Pix'
                          : 'Gerar Pix da fatura'}
                      {!generatingPix && <ArrowRight size={17} />}
                    </S.Primary>
                  </div>
                </S.Generate>
              )}
              <S.Confirmation>
                <div>
                  <span className="confirm-icon">
                    <ShieldCheck size={20} />
                  </span>
                  <span>
                    <strong>Já fez o pagamento?</strong>
                    <small>
                      A liberação acontece após a confirmação do pagamento pelo sistema.
                    </small>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => void verifyRelease()}
                  disabled={checking || generatingPix}
                >
                  <RefreshCw size={16} className={checking ? 'spin' : ''} />
                  {checking ? 'Conferindo...' : 'Verificar pagamento'}
                </button>
              </S.Confirmation>
              {feedback && (
                <S.Feedback
                  $tone={feedback.tone}
                  role={feedback.tone === 'error' ? 'alert' : 'status'}
                >
                  {feedback.tone === 'error' ? (
                    <CircleAlert size={17} />
                  ) : (
                    <ShieldCheck size={17} />
                  )}
                  <span>{feedback.message}</span>
                </S.Feedback>
              )}
            </S.PaymentCard>
          </S.Layout>
        )}
        <S.Footer>
          <ShieldCheck size={17} />
          <span>Seus cadastros e configurações continuam preservados durante a pausa.</span>
          <span className="signature">TECNOLOGIA QUE MOVE SABORES</span>
        </S.Footer>
      </S.Main>
    </S.Root>
  );
}
