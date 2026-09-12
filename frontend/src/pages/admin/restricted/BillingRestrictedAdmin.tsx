import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CalendarDays,
  CircleAlert,
  Copy,
  Crown,
  HelpCircle,
  LockKeyhole,
  LogOut,
  PackageOpen,
  QrCode,
  RefreshCw,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Users,
  WalletCards,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../../../contexts/authContext';
import monthlyBillingService, {
  type BillingPlan,
  type Invoice,
  type Subscription,
} from '../../../Services/monthlyBillingService';
import {
  clearSystemBlockState,
  findBlockingInvoice,
  getSystemBlockState,
} from '../../../Services/systemBlock';
import * as S from './BillingRestrictedAdmin.styles';

const lockedSections = [
  ['Visão geral', BarChart3],
  ['Pedidos', ShoppingBag],
  ['Produtos', PackageOpen],
  ['Clientes', Users],
  ['Configurações', Settings2],
] as const;

type PixState = {
  qrCode: string;
  qrCodeBase64: string;
  expiresAt?: string | null;
};

const money = (value?: number | string | null) =>
  Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

const date = (value?: string | null) => {
  if (!value) return 'Não informado';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Não informado';
  return new Intl.DateTimeFormat('pt-BR').format(parsed);
};

const dateTime = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
};

export default function BillingRestrictedAdmin() {
  const { user, logout } = useAuth();
  const blockState = getSystemBlockState();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [pix, setPix] = useState<PixState | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [generatingPix, setGeneratingPix] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadBilling = useCallback(async () => {
    setLoading(true);
    try {
      const [overview, currentSubscription, availablePlans] = await Promise.all([
        monthlyBillingService.getOverview(),
        monthlyBillingService.getSubscription(),
        monthlyBillingService.getPlans(),
      ]);
      const blockingInvoice = findBlockingInvoice(overview.invoices || []) as Invoice | null;

      setInvoice(blockingInvoice);
      setSubscription(currentSubscription);
      setPlans(availablePlans);

      if (!blockingInvoice) {
        clearSystemBlockState();
        return;
      }

      if (blockingInvoice.pixQrCode && blockingInvoice.pixQrCodeBase64) {
        setPix({
          qrCode: blockingInvoice.pixQrCode,
          qrCodeBase64: blockingInvoice.pixQrCodeBase64,
          expiresAt: blockingInvoice.pixExpiresAt,
        });
      }
    } catch {
      toast.error('Não foi possível carregar a mensalidade agora. Tente novamente em instantes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadBilling(), 0);
    return () => window.clearTimeout(timer);
  }, [loadBilling]);

  const verifyRelease = async () => {
    setChecking(true);
    try {
      const overview = await monthlyBillingService.getOverview();
      const blockingInvoice = findBlockingInvoice(overview.invoices || []) as Invoice | null;
      if (blockingInvoice) {
        setInvoice(blockingInvoice);
        toast.info('O pagamento ainda não foi confirmado. A liberação é automática após a baixa.');
        return;
      }
      clearSystemBlockState();
      toast.success('Pagamento confirmado. Todas as áreas do restaurante foram liberadas.');
    } catch {
      toast.error('Não foi possível consultar a liberação agora. Tente novamente em instantes.');
    } finally {
      setChecking(false);
    }
  };

  const generatePix = async () => {
    if (!invoice) return;
    setGeneratingPix(true);
    try {
      const result = await monthlyBillingService.generatePix(invoice.id);
      setPix({
        qrCode: result.pixQrCode,
        qrCodeBase64: result.pixQrCodeBase64,
        expiresAt: result.pixExpiresAt,
      });
      setInvoice((current) =>
        current
          ? {
              ...current,
              pixQrCode: result.pixQrCode,
              pixQrCodeBase64: result.pixQrCodeBase64,
              pixExpiresAt: result.pixExpiresAt,
            }
          : current,
      );
      setCopied(false);
    } catch {
      toast.error('Não foi possível gerar o Pix agora. Tente novamente em instantes.');
    } finally {
      setGeneratingPix(false);
    }
  };

  const copyPix = async () => {
    if (!pix?.qrCode) return;
    try {
      await navigator.clipboard.writeText(pix.qrCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      toast.error('Não foi possível copiar o código Pix.');
    }
  };

  const initials = String(user?.name || 'Administrador')
    .split(/\s+/u)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  const currentPlan = useMemo(
    () => plans.find((plan) => plan.plan === subscription?.plan),
    [plans, subscription?.plan],
  );
  const planName = currentPlan?.name || subscription?.plan || 'Plano atual';
  const invoiceTotal = invoice ? invoice.total || invoice.monthlyFee : null;
  const dueDate = blockState?.dueDate || invoice?.dueDate || null;
  const pixExpiry = dateTime(pix?.expiresAt);

  return (
    <S.Root>
      <S.Sidebar>
        <S.Brand>
          <span>
            <img src="/gastronexa-logo.svg" alt="" width="44" height="40" />
          </span>
          <div>
            <strong>
              Gastro<span>Nexa</span>
            </strong>
            <small>Tecnologia para Restaurantes</small>
          </div>
        </S.Brand>

        <S.RestrictionLabel>
          <LockKeyhole size={14} /> Acesso temporariamente restrito
        </S.RestrictionLabel>
        <S.Navigation aria-label="Áreas administrativas bloqueadas">
          {lockedSections.map(([label, Icon]) => (
            <button key={label} type="button" disabled title="Disponível após a regularização">
              <Icon size={18} />
              <span>{label}</span>
              <LockKeyhole className="lock" size={13} />
            </button>
          ))}
          <button type="button" className="active" aria-current="page">
            <WalletCards size={19} />
            <span>Mensalidades</span>
          </button>
        </S.Navigation>

        <S.SidebarFooter>
          <div className="identity">
            <b>{initials || 'AD'}</b>
            <span>
              <strong>{user?.name || 'Administrador'}</strong>
              <small>Administrador</small>
            </span>
          </div>
          <button type="button" onClick={logout}>
            <LogOut size={17} /> Sair
          </button>
        </S.SidebarFooter>
      </S.Sidebar>

      <S.Main>
        <S.Topbar>
          <S.TopbarBrand>
            <img src="/gastronexa-logo.svg" alt="" width="36" height="32" />
            <span>
              <strong>
                Gastro<em>Nexa</em>
              </strong>
              <small>Tecnologia para Restaurantes</small>
            </span>
          </S.TopbarBrand>
          <S.VerifyButton type="button" onClick={() => void verifyRelease()} disabled={checking}>
            <RefreshCw size={16} className={checking ? 'spin' : ''} />
            {checking ? 'Verificando...' : 'Verificar pagamento'}
          </S.VerifyButton>
        </S.Topbar>

        <S.Content>
          <S.Hero>
            <span className="eyebrow">
              <CircleAlert size={15} /> Assinatura em atraso
            </span>
            <h1>Regularize sua assinatura</h1>
            <p>
              Seus módulos operacionais estão temporariamente restritos até a confirmação do
              pagamento. Resolva por aqui e o acesso volta automaticamente.
            </p>
          </S.Hero>

          {loading ? (
            <S.LoadingCard role="status" aria-live="polite">
              <span className="spinner" />
              <div>
                <strong>Carregando mensalidade...</strong>
                <small>Buscando a cobrança que precisa ser regularizada.</small>
              </div>
            </S.LoadingCard>
          ) : (
            <>
              <S.SummaryGrid aria-label="Resumo da assinatura">
                <S.SummaryItem>
                  <span className="icon danger">
                    <CircleAlert size={19} />
                  </span>
                  <div>
                    <small>Status</small>
                    <strong className="danger-text">Em atraso</strong>
                  </div>
                </S.SummaryItem>
                <S.SummaryItem>
                  <span className="icon">
                    <Crown size={19} />
                  </span>
                  <div>
                    <small>Plano</small>
                    <strong>{planName}</strong>
                  </div>
                </S.SummaryItem>
                <S.SummaryItem>
                  <span className="icon">
                    <WalletCards size={19} />
                  </span>
                  <div>
                    <small>Mensalidade</small>
                    <strong>{invoiceTotal ? money(invoiceTotal) : 'Não informado'}</strong>
                  </div>
                </S.SummaryItem>
                <S.SummaryItem>
                  <span className="icon">
                    <CalendarDays size={19} />
                  </span>
                  <div>
                    <small>Vencimento</small>
                    <strong>{date(dueDate)}</strong>
                  </div>
                </S.SummaryItem>
              </S.SummaryGrid>

              <S.PaymentLayout>
                <S.PixCard>
                  <S.SectionHeading>
                    <span className="section-icon">
                      <QrCode size={21} />
                    </span>
                    <div>
                      <h2>Pague com Pix</h2>
                      <p>Use o QR Code ou copie o código Pix para regularizar a mensalidade.</p>
                    </div>
                  </S.SectionHeading>

                  {pix?.qrCode && pix.qrCodeBase64 ? (
                    <S.PixArea>
                      <S.QrWrap>
                        <img src={`data:image/png;base64,${pix.qrCodeBase64}`} alt="QR Code Pix" />
                      </S.QrWrap>
                      <S.PixDetails>
                        <label htmlFor="billing-pix-code">Código Pix (copia e cola)</label>
                        <div className="copy-row">
                          <input id="billing-pix-code" value={pix.qrCode} readOnly />
                          <button type="button" onClick={() => void copyPix()}>
                            <Copy size={16} /> {copied ? 'Copiado' : 'Copiar código'}
                          </button>
                        </div>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => void generatePix()}
                          disabled={generatingPix}
                        >
                          <RefreshCw size={16} className={generatingPix ? 'spin' : ''} />
                          {generatingPix ? 'Gerando...' : 'Gerar novo QR Code'}
                        </button>
                        <small>
                          {pixExpiry
                            ? `QR Code válido até ${pixExpiry}. Se expirar, gere outro código.`
                            : 'Se este QR Code expirar, gere outro código sem perder a fatura.'}
                        </small>
                      </S.PixDetails>
                    </S.PixArea>
                  ) : (
                    <S.EmptyPix>
                      <span>
                        <QrCode size={30} />
                      </span>
                      <div>
                        <strong>Gere o QR Code para pagar</strong>
                        <p>O código é criado na hora e fica vinculado a esta mensalidade.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void generatePix()}
                        disabled={!invoice || generatingPix}
                      >
                        <QrCode size={17} />
                        {generatingPix ? 'Gerando...' : 'Gerar QR Code'}
                      </button>
                    </S.EmptyPix>
                  )}
                </S.PixCard>

                <S.HelpCard>
                  <S.SectionHeading>
                    <span className="section-icon soft">
                      <HelpCircle size={21} />
                    </span>
                    <div>
                      <h2>Como liberar o acesso</h2>
                      <p>São só três passos.</p>
                    </div>
                  </S.SectionHeading>
                  <ol>
                    <li>
                      <b>1</b>
                      <span>
                        <strong>Gere ou use o Pix</strong>
                        <small>Escaneie o QR Code ou copie o código.</small>
                      </span>
                    </li>
                    <li>
                      <b>2</b>
                      <span>
                        <strong>Faça o pagamento</strong>
                        <small>Conclua normalmente no aplicativo do seu banco.</small>
                      </span>
                    </li>
                    <li>
                      <b>3</b>
                      <span>
                        <strong>Aguarde a confirmação</strong>
                        <small>O sistema é liberado automaticamente após a baixa.</small>
                      </span>
                    </li>
                  </ol>
                  <S.Assurance>
                    <ShieldCheck size={18} />
                    <span>
                      <strong>Seus dados continuam seguros</strong>
                      <small>Nenhuma informação do restaurante é perdida durante o bloqueio.</small>
                    </span>
                  </S.Assurance>
                </S.HelpCard>
              </S.PaymentLayout>

              <S.ReleaseButton
                type="button"
                onClick={() => void verifyRelease()}
                disabled={checking}
              >
                <ShieldCheck size={18} />
                {checking ? 'Verificando pagamento...' : 'Verificar pagamento e liberar sistema'}
              </S.ReleaseButton>
              <S.ReleaseNote>
                A liberação também acontece automaticamente assim que o pagamento for confirmado.
              </S.ReleaseNote>
            </>
          )}
        </S.Content>
      </S.Main>
    </S.Root>
  );
}
