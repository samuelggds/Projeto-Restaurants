import { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronDown,
  CreditCard,
  QrCode,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import monthlyBillingService, {
  type PlatformBillingProfile,
} from '../../../Services/monthlyBillingService';
import { RecurringCardDialog } from './RecurringCardDialog';
import * as S from './RecurringBillingPayment.styles';

function billingDate(value?: string | null) {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat('pt-BR').format(date)
    : 'A definir';
}

export function RecurringBillingPayment({ onViewCharges }: { onViewCharges?: () => void }) {
  const [profile, setProfile] = useState<PlatformBillingProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [pixExpanded, setPixExpanded] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setProfile(await monthlyBillingService.getRecurringProfile());
    } catch {
      setError('Não foi possível consultar sua forma de pagamento. Tente novamente em instantes.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  async function switchToPix() {
    if (changing || !profile) return;
    setChanging(true);
    setError('');
    setNotice('');
    try {
      setProfile(await monthlyBillingService.usePixBilling());
      setNotice(
        'Pagamento por Pix selecionado. As próximas mensalidades devem ser pagas manualmente.',
      );
      setPixExpanded(false);
    } catch {
      setError(
        'Não foi possível mudar para Pix. Sua forma de pagamento foi mantida. Tente novamente.',
      );
    } finally {
      setChanging(false);
    }
  }
  const cardSelected = profile?.billingMethod === 'CARD' && profile.autoRenew;
  const cardActive = cardSelected && profile?.status === 'AUTHORIZED';
  const pixSelected = profile?.billingMethod === 'PIX' && !profile.autoRenew;
  return (
    <S.Card aria-labelledby="billing-payment-method-title" aria-busy={loading}>
      <header className="section-heading">
        <span className="eyebrow">SUA MENSALIDADE, SEM COMPLICAÇÃO</span>
        <h2 id="billing-payment-method-title">Como você prefere pagar?</h2>
        <p>Gerencie a renovação do seu plano em um só lugar.</p>
      </header>
      {loading ? (
        <div className="loading" role="status">
          <RefreshCw size={18} aria-hidden="true" /> Consultando sua forma de pagamento...
        </div>
      ) : null}
      {notice ? (
        <p className="notice" role="status">
          <Check size={18} aria-hidden="true" />
          {notice}
        </p>
      ) : null}
      {error ? (
        <div className="error" role="alert">
          <p>{error}</p>
          <button type="button" disabled={loading || changing} onClick={() => void load()}>
            <RefreshCw size={15} aria-hidden="true" /> Tentar novamente
          </button>
        </div>
      ) : null}
      <div className="card-option">
        <div className="card-copy">
          <div className="option-top">
            <span className="option-icon">
              <CreditCard size={23} aria-hidden="true" />
            </span>
            <span className="recommended">
              {cardActive ? 'Renovação automática ativa' : 'Recomendado'}
            </span>
          </div>
          <h3>{cardActive ? 'Seu cartão cuida da renovação' : 'Menos uma tarefa na sua rotina'}</h3>
          <p>
            Cadastre um cartão para renovar sua mensalidade automaticamente. Você acompanha cada
            cobrança e pode mudar a forma de pagamento quando precisar.
          </p>
          <ul className="benefits">
            <li>
              <Check aria-hidden="true" /> Sem copiar códigos a cada mês
            </li>
            <li>
              <Check aria-hidden="true" /> Histórico disponível na aba Cobranças
            </li>
          </ul>
          <button
            className="primary"
            type="button"
            onClick={() => {
              setNotice('');
              setModalOpen(true);
            }}
            disabled={loading || changing || !profile}
          >
            {cardSelected ? 'Atualizar cartão' : 'Cadastrar cartão automático'}{' '}
            <ArrowRight size={17} aria-hidden="true" />
          </button>
          <span className="security">
            <ShieldCheck aria-hidden="true" /> Cadastro protegido pelo Mercado Pago
          </span>
        </div>
        <aside className="payment-preview" aria-label="Forma de pagamento atual">
          <small>FORMA ATUAL</small>
          <div className="preview-card">
            <CreditCard size={25} aria-hidden="true" />
            <span>
              {cardSelected ? profile?.cardBrand || 'Cartão cadastrado' : 'Cartão automático'}
            </span>
            <strong>
              {cardSelected && profile?.cardLast4 ? `•••• ${profile.cardLast4}` : '•••• •••• ••••'}
            </strong>
            <small>
              {cardActive
                ? 'Renovação ativada'
                : cardSelected
                  ? 'Aguardando autorização'
                  : 'Seu cartão aparece aqui'}
            </small>
          </div>
          <p className="current-method">
            {loading
              ? 'Consultando...'
              : !profile
                ? 'Consulta indisponível'
                : cardActive
                  ? `Próxima cobrança: ${billingDate(profile.nextBillingAt)}`
                  : cardSelected
                    ? 'A renovação ainda não está ativa. Confira a situação das suas cobranças.'
                    : pixSelected
                      ? 'Você está usando Pix manual.'
                      : 'Renovação automática desativada.'}
          </p>
          {onViewCharges ? (
            <button type="button" className="text-button" onClick={onViewCharges}>
              Ver minhas cobranças <ArrowRight size={14} aria-hidden="true" />
            </button>
          ) : null}
        </aside>
      </div>
      {profile?.lastFailureReason ? (
        <p className="warning" role="status">
          A última tentativa de cobrança não foi concluída. Confira seu cartão e a situação da
          mensalidade na aba Cobranças.
        </p>
      ) : null}
      <div className="pix-alternative">
        <button
          type="button"
          className="pix-toggle"
          aria-expanded={pixExpanded}
          aria-controls="billing-pix-details"
          onClick={() => setPixExpanded(!pixExpanded)}
        >
          <QrCode size={19} aria-hidden="true" />
          <span>
            <strong>Prefere pagar por Pix?</strong>
            <small>Pagamento manual a cada mensalidade</small>
          </span>
          <ChevronDown className={pixExpanded ? 'expanded' : ''} size={18} aria-hidden="true" />
        </button>
        {pixExpanded ? (
          <div id="billing-pix-details" className="pix-details">
            <p>
              Na aba Cobranças, você gera o QR Code ou copia o código Pix quando a mensalidade
              estiver disponível. O pagamento precisa ser feito por você a cada mês.
            </p>
            {pixSelected ? (
              <>
                <span className="pix-current">
                  <Check size={16} aria-hidden="true" /> Pix já é sua forma de pagamento
                </span>
                {onViewCharges ? (
                  <button type="button" className="secondary" onClick={onViewCharges}>
                    Ir para Cobranças
                  </button>
                ) : null}
              </>
            ) : (
              <>
                {cardSelected ? (
                  <p className="warning">
                    Ao confirmar, a renovação automática no cartão será desativada. As mensalidades
                    em aberto continuam na aba Cobranças.
                  </p>
                ) : null}
                <button
                  type="button"
                  className="secondary"
                  disabled={changing || loading || !profile}
                  onClick={() => void switchToPix()}
                >
                  {changing
                    ? 'Alterando...'
                    : cardSelected
                      ? 'Desativar renovação e usar Pix'
                      : 'Usar Pix manual'}
                </button>
              </>
            )}
          </div>
        ) : null}
      </div>
      {modalOpen ? (
        <RecurringCardDialog
          onClose={() => setModalOpen(false)}
          onSaved={(next) => {
            setProfile(next);
            setModalOpen(false);
            setError('');
            setNotice(
              next.autoRenew && next.status === 'AUTHORIZED'
                ? 'Cartão cadastrado. Renovação automática ativada.'
                : 'Cartão cadastrado. Acompanhe a confirmação da renovação.',
            );
          }}
        />
      ) : null}
    </S.Card>
  );
}
