import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Gift,
  LockKeyhole,
  ShoppingBag,
  Sparkles,
  X,
} from 'lucide-react';
import type { LoyaltyProgramProps, LoyaltyRewardProgress } from '../types';
import { isActiveLoyaltyRedemption, loyaltyRedemptionEntries } from '../domain/loyaltyRedemption';
import * as S from './LoyaltyProgramCard.styles';

function rewardLabel(discountType: 'PERCENTAGE' | 'FIXED', discount: number) {
  if (discountType === 'PERCENTAGE') return `${discount}% de desconto`;
  return discount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function expirationLabel(expiration?: string | null) {
  if (!expiration) return null;
  const date = new Date(expiration);
  if (!Number.isFinite(date.getTime())) return null;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function activeRedemption(reward: LoyaltyRewardProgress) {
  return reward.redemptions.find((item) => isActiveLoyaltyRedemption(item));
}

function remainingLabel(reward: LoyaltyRewardProgress) {
  if (reward.limitReached) return 'Use o cupom guardado antes de resgatar outro.';
  if (reward.canRedeem) return 'Meta concluída. Resgate agora.';
  if (reward.remaining > 0) {
    return `Faltam ${reward.remaining} ${reward.remaining === 1 ? 'pedido pago e entregue' : 'pedidos pagos e entregues'}`;
  }
  return 'Meta concluída. Seu benefício está sendo preparado.';
}

function RewardCard({
  reward,
  loyalty,
}: {
  reward: LoyaltyRewardProgress;
  loyalty: LoyaltyProgramProps;
}) {
  const claimed = activeRedemption(reward);
  const expiration = claimed
    ? expirationLabel(claimed.expiresAt || reward.coupon.expiration)
    : null;
  const status = claimed ? 'available' : reward.canRedeem ? 'earned' : 'locked';
  const progress = reward.progressPercent;

  return (
    <S.Reward $status={status}>
      <div className="reward-heading">
        <span>{claimed ? <CheckCircle2 /> : reward.canRedeem ? <Gift /> : <LockKeyhole />}</span>
        <div>
          <small>
            {claimed
              ? claimed.status === 'RESERVED'
                ? 'Cupom aplicado'
                : 'Cupom disponível'
              : reward.limitReached
                ? 'Benefício concluído'
                : 'Próxima recompensa'}
          </small>
          <h3>{reward.coupon.title}</h3>
        </div>
      </div>

      <strong>{rewardLabel(reward.coupon.discountType, reward.coupon.discount)}</strong>
      {reward.coupon.description && <p>{reward.coupon.description}</p>}

      <div className="cycle-copy">
        <span>Progresso do ciclo atual</span>
        <b>
          {Math.min(reward.purchasesCompleted, reward.purchasesRequired)}/{reward.purchasesRequired}
        </b>
      </div>
      <S.Progress
        $value={progress}
        role="progressbar"
        aria-label={`${Math.round(progress)}% concluído`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
      >
        <i />
      </S.Progress>

      <div className="reward-footer">
        <div className="reward-status">
          <span>
            {claimed
              ? claimed.status === 'RESERVED'
                ? 'Aplicado ao pedido em andamento'
                : `Código ${reward.coupon.code}`
              : remainingLabel(reward)}
          </span>
          {expiration && <em>Válido até {expiration}</em>}
        </div>
        {reward.canRedeem && !reward.limitReached && (
          <button
            type="button"
            disabled={loyalty.redeemingCouponId === reward.coupon.id}
            onClick={() => loyalty.onRedeem(reward.coupon.id)}
          >
            {loyalty.redeemingCouponId === reward.coupon.id ? 'Resgatando…' : 'Resgatar cupom'}
          </button>
        )}
      </div>
    </S.Reward>
  );
}

export function LoyaltyProgramCard({ loyalty }: { loyalty: LoyaltyProgramProps }) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const activeRewards = loyalty.summary?.rewards || [];
  const activeCouponIds = new Set(activeRewards.map((reward) => reward.coupon.id));
  const storedGroups = new Map<number, LoyaltyRewardProgress>();
  for (const { coupon, redemption } of loyaltyRedemptionEntries(loyalty.summary)) {
    if (activeCouponIds.has(coupon.id) || !isActiveLoyaltyRedemption(redemption)) continue;
    const stored = storedGroups.get(coupon.id);
    if (stored) {
      stored.redemptions.push(redemption);
      stored.activeRedemptions = stored.redemptions.length;
      continue;
    }
    const purchasesRequired = coupon.loyaltyPurchasesRequired || 1;
    storedGroups.set(coupon.id, {
      coupon,
      purchasesCompleted: 0,
      purchasesRequired,
      remaining: purchasesRequired,
      progressPercent: 0,
      canRedeem: false,
      limitReached: true,
      activeRedemptions: 1,
      walletLimit: coupon.perCustomerLimit || 1,
      redemptions: [redemption],
    });
  }
  const rewards = [...activeRewards, ...storedGroups.values()];
  const highlightedReward =
    rewards.find((reward) => activeRedemption(reward)) ||
    rewards.find((reward) => reward.canRedeem && !reward.limitReached) ||
    rewards.find((reward) => !reward.limitReached) ||
    rewards[0];

  useEffect(() => {
    if (!isOpen) return undefined;
    const trigger = triggerRef.current;
    const focusTimer = window.setTimeout(() => closeRef.current?.focus(), 0);
    const handleDialogKeyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleDialogKeyboard);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleDialogKeyboard);
      trigger?.focus();
    };
  }, [isOpen]);

  const claimed = highlightedReward ? activeRedemption(highlightedReward) : undefined;
  const discount = highlightedReward
    ? rewardLabel(highlightedReward.coupon.discountType, highlightedReward.coupon.discount)
    : '';

  let title = 'Ganhe descontos';
  let description = 'Entre para acompanhar sua fidelidade';
  let badge = 'Entrar';

  if (loyalty.loading) {
    title = 'Consultando seus benefícios';
    description = 'Só um instante…';
    badge = '•••';
  } else if (loyalty.error) {
    title = 'Fidelidade indisponível';
    description = 'Toque para tentar novamente';
    badge = 'Tentar';
  } else if (loyalty.loggedIn && !highlightedReward) {
    title = 'Clube de vantagens';
    description = 'Toque para verificar novos cupons';
    badge = 'Atualizar';
  } else if (highlightedReward && claimed) {
    title = claimed.status === 'RESERVED' ? 'Cupom aplicado' : 'Cupom disponível';
    description =
      claimed.status === 'RESERVED'
        ? 'Aguardando a conclusão do pedido'
        : `${discount} · toque para ver o código`;
    badge = claimed.status === 'RESERVED' ? 'Em uso' : 'Usar';
  } else if (highlightedReward?.canRedeem && !highlightedReward.limitReached) {
    title = 'Você ganhou um cupom';
    description = `${discount} · resgate agora`;
    badge = 'Resgatar';
  } else if (highlightedReward?.limitReached) {
    title = 'Cupom já guardado';
    description = 'Use ou aguarde o vencimento para resgatar outro';
    badge = 'Aguardar';
  } else if (highlightedReward) {
    const remaining = highlightedReward.remaining;
    title =
      remaining > 0
        ? `Faltam ${remaining} ${remaining === 1 ? 'pedido' : 'pedidos'}`
        : 'Meta concluída';
    description = `${discount} na próxima recompensa`;
    badge = `${Math.round(highlightedReward.progressPercent)}%`;
  }

  return (
    <>
      <S.CompactNotice
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-busy={loyalty.loading}
        aria-label={`${title}. ${description}`}
      >
        <i className="icon">{claimed || highlightedReward?.canRedeem ? <Sparkles /> : <Gift />}</i>
        <span>
          <strong>{title}</strong>
          <small>{description}</small>
        </span>
        <b className="notice-badge">{badge}</b>
        <ChevronRight className="chevron" size={18} />
      </S.CompactNotice>

      {isOpen &&
        createPortal(
          <S.Backdrop
            $primary={loyalty.primaryColor}
            role="presentation"
            onClick={() => setIsOpen(false)}
          >
            <S.Dialog
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="loyalty-program-title"
              onClick={(event) => event.stopPropagation()}
            >
              <S.DialogHeader>
                <i>
                  <Gift />
                </i>
                <div>
                  <small>Clube de vantagens</small>
                  <h2 id="loyalty-program-title">Seus pedidos viram descontos</h2>
                  <p>Benefícios válidos somente neste restaurante.</p>
                </div>
                <button
                  ref={closeRef}
                  type="button"
                  aria-label="Fechar fidelidade"
                  onClick={() => setIsOpen(false)}
                >
                  <X />
                </button>
              </S.DialogHeader>

              {!loyalty.loggedIn ? (
                <S.LoginState>
                  <div>
                    <ShoppingBag />
                    <span>
                      <strong>Acompanhe cada compra</strong>
                      <small>Entre para consultar seu progresso e resgatar cupons.</small>
                    </span>
                  </div>
                  <S.LoginButton type="button" onClick={loyalty.onLogin}>
                    Entrar e acompanhar <ArrowRight />
                  </S.LoginButton>
                </S.LoginState>
              ) : loyalty.loading ? (
                <S.LoadingState aria-busy="true">
                  <i />
                  <span>
                    <strong>Consultando seus benefícios…</strong>
                    <small>Estamos conferindo seus pedidos pagos e entregues.</small>
                  </span>
                </S.LoadingState>
              ) : loyalty.error ? (
                <S.LoginState role="alert">
                  <div>
                    <Gift />
                    <span>
                      <strong>Não foi possível carregar seus benefícios</strong>
                      <small>{loyalty.error}</small>
                    </span>
                  </div>
                  <S.LoginButton type="button" onClick={loyalty.onRetry}>
                    Tentar novamente <ArrowRight />
                  </S.LoginButton>
                </S.LoginState>
              ) : !rewards.length ? (
                <S.LoginState>
                  <div>
                    <Gift />
                    <span>
                      <strong>Nenhum benefício ativo agora</strong>
                      <small>
                        Assim que o restaurante liberar uma recompensa, ela aparecerá aqui.
                      </small>
                    </span>
                  </div>
                  <S.LoginButton type="button" onClick={loyalty.onRetry}>
                    Atualizar benefícios <ArrowRight />
                  </S.LoginButton>
                </S.LoginState>
              ) : (
                <>
                  <S.PurchaseCount>
                    <ShoppingBag />
                    <span>
                      <b>{loyalty.summary?.purchasesCompleted || 0}</b>
                      pedidos pagos e entregues
                    </span>
                  </S.PurchaseCount>
                  <S.RewardList>
                    {rewards.map((reward) => (
                      <RewardCard key={reward.coupon.id} reward={reward} loyalty={loyalty} />
                    ))}
                  </S.RewardList>
                </>
              )}
            </S.Dialog>
          </S.Backdrop>,
          document.body,
        )}
    </>
  );
}
