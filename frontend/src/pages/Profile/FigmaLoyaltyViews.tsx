import { useMemo, useState, type CSSProperties } from 'react';
import { Award, Gift, Info, ShoppingBag, Stamp } from 'lucide-react';
import type { LoyaltyRewardProgress, LoyaltySummary } from '../Home/types';
import type { ProfileOrder } from './types';
import * as S from './FigmaLoyaltyViews.styles';

const money = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function rewardValue(reward: LoyaltyRewardProgress) {
  if (reward.coupon.discountType === 'PERCENTAGE') {
    return `${reward.coupon.discount}% OFF`;
  }
  return money(reward.coupon.discount);
}

function dateLabel(value?: string | null) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('pt-BR');
}

function bestReward(summary: LoyaltySummary | null) {
  if (!summary?.rewards.length) return null;
  return [...summary.rewards].sort((left, right) => {
    if (left.canRedeem !== right.canRedeem) return left.canRedeem ? -1 : 1;
    if (left.progressPercent !== right.progressPercent) {
      return right.progressPercent - left.progressPercent;
    }
    return left.remaining - right.remaining;
  })[0];
}

function progressStyle(percent: number) {
  return {
    '--progress': `${Math.max(0, Math.min(100, percent)) * 3.6}deg`,
  } as CSSProperties;
}

type LoyaltyProgramProps = {
  summary: LoyaltySummary | null;
  loading?: boolean;
  error?: string;
  recentOrders: ProfileOrder[];
  redeemingCouponId?: number | null;
  onRetry?: () => void;
  onRedeem: (couponId: number) => Promise<void>;
  onOpenCoupons: () => void;
};

export function FigmaLoyaltyProgram({
  summary,
  loading = false,
  error = '',
  recentOrders,
  redeemingCouponId = null,
  onRetry,
  onRedeem,
  onOpenCoupons,
}: LoyaltyProgramProps) {
  const reward = bestReward(summary);
  const history = useMemo(
    () => recentOrders.filter((order) => order.loyaltyQualified).slice(0, 6),
    [recentOrders],
  );

  if (loading && !summary) return <S.Empty>Carregando seu programa de fidelidade...</S.Empty>;

  if (error && !summary) {
    return (
      <S.Empty>
        <p>{error}</p>
        {onRetry ? <button type="button" onClick={onRetry}>Tentar novamente</button> : null}
      </S.Empty>
    );
  }

  if (!reward) {
    return (
      <S.LoyaltyStack>
        <S.Empty>O restaurante ainda não possui uma recompensa de fidelidade ativa.</S.Empty>
      </S.LoyaltyStack>
    );
  }

  const completed = Math.min(reward.purchasesCompleted, reward.purchasesRequired);
  const remaining = Math.max(0, reward.remaining);
  const claimed = reward.redemptions.find(
    (redemption) => redemption.status === 'CLAIMED' || redemption.status === 'RESERVED',
  );

  return (
    <S.LoyaltyStack>
      <S.ProgressCard>
        <div className="ring" style={progressStyle(reward.progressPercent)}>
          <div className="ring-copy">
            <strong>{completed} / {reward.purchasesRequired}</strong>
            <span>selos</span>
          </div>
        </div>
        <div className="copy">
          <h2>Você tem {completed} {completed === 1 ? 'selo acumulado' : 'selos acumulados'}!</h2>
          <p>
            {remaining > 0 ? (
              <>Faltam apenas <b>{remaining} {remaining === 1 ? 'pedido' : 'pedidos'}</b> para desbloquear sua recompensa.</>
            ) : claimed ? (
              <>Sua recompensa <b>{reward.coupon.title}</b> já está disponível.</>
            ) : (
              <>Você já pode resgatar <b>{reward.coupon.title}</b>.</>
            )}
          </p>
        </div>
      </S.ProgressCard>

      <S.Block>
        <h2>Como Funciona?</h2>
        <S.Steps>
          <S.Step>
            <span className="icon"><ShoppingBag /></span>
            <div className="copy">
              <h3>1. Faça um pedido</h3>
              <p>
                Cada compra concluída que cumprir as regras da promoção conta para sua fidelidade.
              </p>
            </div>
          </S.Step>
          <S.Step>
            <span className="icon"><Stamp /></span>
            <div className="copy">
              <h3>2. Acumule selos</h3>
              <p>Complete {reward.purchasesRequired} selos válidos para desbloquear sua recompensa.</p>
            </div>
          </S.Step>
          <S.Step>
            <span className="icon"><Award /></span>
            <div className="copy">
              <h3>3. Resgate o prêmio</h3>
              <p>Ao completar a meta, resgate o benefício configurado pelo restaurante.</p>
            </div>
          </S.Step>
        </S.Steps>
      </S.Block>

      <S.Block>
        <h2>Histórico de Selos</h2>
        {history.length ? (
          <S.History>
            <div className="head">
              <span>Data</span>
              <span>Pedido</span>
              <span style={{ textAlign: 'right' }}>Status</span>
            </div>
            {history.map((order) => (
              <div className="row" key={order.id}>
                <span className="date">{order.date.split(' · ')[0]}</span>
                <span className="order">Pedido {order.id}</span>
                <span className="stamp">+1 selo</span>
              </div>
            ))}
            {reward.redemptions
              .filter((redemption) => redemption.status === 'USED')
              .slice(0, 2)
              .map((redemption) => (
                <div className="row" key={`redemption-${redemption.id}`}>
                  <span className="date">{dateLabel(redemption.usedAt || redemption.createdAt)}</span>
                  <span className="order">
                    {redemption.orderId ? `Pedido #${redemption.orderId}` : reward.coupon.title}
                  </span>
                  <span className="stamp used">Resgate usado ★</span>
                </div>
              ))}
          </S.History>
        ) : (
          <S.Empty>Seu histórico de selos aparecerá aqui após pedidos concluídos elegíveis.</S.Empty>
        )}
      </S.Block>

      <S.Block>
        <h2>Recompensas Disponíveis</h2>
        <S.RewardCard $locked={!reward.canRedeem && !claimed}>
          <span className="visual">{reward.canRedeem || claimed ? <Gift /> : <Award />}</span>
          <div className="copy">
            <h3>{reward.coupon.title}</h3>
            <span className="tag">
              {claimed
                ? `Código ${reward.coupon.code}`
                : reward.canRedeem
                  ? 'Pronto para resgatar'
                  : `Disponível com ${reward.purchasesRequired} selos`}
            </span>
          </div>
          {claimed ? (
            <button type="button" onClick={onOpenCoupons}>Ver cupom</button>
          ) : (
            <button
              type="button"
              disabled={!reward.canRedeem || redeemingCouponId === reward.coupon.id}
              onClick={() => void onRedeem(reward.coupon.id)}
            >
              {redeemingCouponId === reward.coupon.id ? 'Resgatando...' : 'Resgatar'}
            </button>
          )}
        </S.RewardCard>
      </S.Block>
    </S.LoyaltyStack>
  );
}

type CouponRedemptionProps = {
  summary: LoyaltySummary | null;
  loading?: boolean;
  error?: string;
  redeemingCouponId?: number | null;
  onRetry?: () => void;
  onRedeem: (couponId: number) => Promise<void>;
  onUseCoupon?: (redemptionId: number) => void;
};

export function FigmaCouponRedemption({
  summary,
  loading = false,
  error = '',
  redeemingCouponId = null,
  onRetry,
  onRedeem,
  onUseCoupon,
}: CouponRedemptionProps) {
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [messageError, setMessageError] = useState(false);

  const wallet = useMemo(() => {
    const entries = summary?.rewards.flatMap((reward) =>
      reward.redemptions.map((redemption) => ({ reward, redemption })),
    ) || [];
    return entries.sort((left, right) => right.redemption.id - left.redemption.id);
  }, [summary]);

  const redeemByCode = async () => {
    const normalized = code.trim().toLocaleUpperCase('pt-BR');
    if (!normalized) return;

    const reward = summary?.rewards.find(
      (candidate) => candidate.coupon.code.trim().toLocaleUpperCase('pt-BR') === normalized,
    );

    if (!reward) {
      setMessage('Este código não está disponível no programa de fidelidade deste restaurante.');
      setMessageError(true);
      return;
    }

    const active = reward.redemptions.find(
      (redemption) => redemption.status === 'CLAIMED' || redemption.status === 'RESERVED',
    );

    if (active) {
      setMessage(`O cupom ${reward.coupon.code} já está na sua carteira.`);
      setMessageError(false);
      return;
    }

    if (!reward.canRedeem) {
      setMessage('Você ainda não atingiu a meta necessária para resgatar este cupom.');
      setMessageError(true);
      return;
    }

    try {
      await onRedeem(reward.coupon.id);
      setMessage(`Cupom ${reward.coupon.code} resgatado com sucesso.`);
      setMessageError(false);
      setCode('');
    } catch {
      setMessage('Não foi possível resgatar este cupom agora.');
      setMessageError(true);
    }
  };

  if (loading && !summary) return <S.Empty>Carregando seus cupons...</S.Empty>;

  if (error && !summary) {
    return (
      <S.Empty>
        <p>{error}</p>
        {onRetry ? <button type="button" onClick={onRetry}>Tentar novamente</button> : null}
      </S.Empty>
    );
  }

  return (
    <S.LoyaltyStack>
      <S.RedeemCard>
        <h2>Resgatar Novo Cupom</h2>
        <div className="row">
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="Digite o código do cupom"
            aria-label="Código do cupom"
          />
          <button type="button" disabled={!code.trim()} onClick={() => void redeemByCode()}>
            Resgatar
          </button>
        </div>
        {message ? <p className={`message ${messageError ? 'error' : ''}`}>{message}</p> : null}
      </S.RedeemCard>

      <S.Block>
        <h2>Meus Cupons Disponíveis</h2>
        {wallet.length ? (
          <S.CouponGrid>
            {wallet.map(({ reward, redemption }) => {
              const inactive = redemption.status === 'USED' || redemption.status === 'EXPIRED';
              const state =
                redemption.status === 'CLAIMED'
                  ? 'Ativo'
                  : redemption.status === 'RESERVED'
                    ? 'Em uso'
                    : redemption.status === 'USED'
                      ? 'Usado'
                      : 'Expirado';
              const expiry = dateLabel(redemption.expiresAt);
              const usedAt = dateLabel(redemption.usedAt);

              return (
                <S.CouponCard key={redemption.id} $inactive={inactive}>
                  <div className="value">{rewardValue(reward)}</div>
                  <div className="content">
                    <div className="head">
                      <h3>{reward.coupon.title}</h3>
                      <span className="state">{state}</span>
                    </div>
                    {reward.coupon.description ? <p>{reward.coupon.description}</p> : null}
                    <small>
                      {redemption.status === 'USED' && usedAt
                        ? `Usado em ${usedAt}`
                        : expiry
                          ? `Válido até ${expiry}`
                          : reward.coupon.minimumSubtotal > 0
                            ? `Pedido mínimo de ${money(reward.coupon.minimumSubtotal)}`
                            : `Código ${reward.coupon.code}`}
                    </small>
                    {!inactive && onUseCoupon ? (
                      <button
                        type="button"
                        onClick={() => onUseCoupon(redemption.id)}
                        style={{
                          justifySelf: 'start',
                          minHeight: 32,
                          padding: '0 12px',
                          border: 0,
                          borderRadius: 999,
                          background: 'var(--p)',
                          color: '#fff',
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        Usar Cupom
                      </button>
                    ) : null}
                  </div>
                </S.CouponCard>
              );
            })}
          </S.CouponGrid>
        ) : (
          <S.Empty>Nenhum cupom resgatado está disponível na sua carteira.</S.Empty>
        )}
      </S.Block>

      <S.Info>
        <Info />
        <span>
          Os cupons exibidos aqui pertencem ao restaurante ativo e seguem validade, limites e regras configurados pelo administrador.
        </span>
      </S.Info>
    </S.LoyaltyStack>
  );
}
