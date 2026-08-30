import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Gift,
  LockKeyhole,
  PanelBottomClose,
  PanelBottomOpen,
  ShoppingBag,
  Sparkles,
  X,
} from 'lucide-react';
import type { LoyaltyProgramProps, LoyaltyRewardProgress } from '../types';
import { isActiveLoyaltyRedemption, loyaltyRedemptionEntries } from '../domain/loyaltyRedemption';
import * as S from './LoyaltyProgramCard.styles';

const FloatingGroup = styled.div`
  width: min(350px, calc(100vw - 32px));
  display: grid;
  gap: 7px;

  &[data-collapsed='true'] {
    width: min(290px, calc(100vw - 24px));
  }

  &[data-collapsed='true'] ~ * {
    display: none !important;
  }

  @media (max-width: 700px) {
    width: 100%;

    &[data-collapsed='true'] {
      width: min(290px, 100%);
    }
  }
`;

const GroupControl = styled.button`
  width: min(290px, 100%);
  justify-self: end;
  min-height: 48px;
  padding: 6px 7px 6px 10px;
  border: 1px solid color-mix(in srgb, var(--home-primary, #d64d08) 32%, #eadfd3);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: #302923;
  background: linear-gradient(
    130deg,
    color-mix(in srgb, var(--home-primary, #d64d08) 7%, #fff),
    #fff 62%
  );
  box-shadow: 0 10px 26px rgba(55, 38, 26, 0.13);
  font: inherit;
  text-align: left;
  cursor: pointer;

  > span:first-child {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  strong,
  small {
    display: block;
  }

  strong {
    color: #26211d;
    font-size: 12px;
    line-height: 1.2;
    font-weight: 900;
  }

  small {
    color: #776d65;
    font-size: 9px;
    line-height: 1.3;
    font-weight: 700;
  }

  .action {
    flex: 0 0 auto;
    min-height: 32px;
    padding: 5px 7px;
    border-radius: 9px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    color: color-mix(in srgb, var(--home-primary, #d64d08) 88%, #2b211b);
    background: color-mix(in srgb, var(--home-primary, #d64d08) 10%, #fff);
    font-size: 9px;
    font-weight: 900;
  }

  .action svg {
    width: 14px;
    height: 14px;
  }

  &:hover {
    border-color: color-mix(in srgb, var(--home-primary, #d64d08) 52%, #eadfd3);
  }

  &:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--home-primary, #d64d08) 24%, transparent);
    outline-offset: 2px;
  }

  @media (max-width: 350px) {
    padding-left: 9px;

    .action span {
      display: none;
    }
  }
`;

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
  const [floatingCollapsed, setFloatingCollapsed] = useState(false);
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
    <FloatingGroup data-collapsed={loyalty.loggedIn && floatingCollapsed ? 'true' : 'false'}>
      {loyalty.loggedIn && (
        <GroupControl
          type="button"
          data-floating-drag-handle="true"
          title="Clique para mostrar ou arraste para mover"
          data-testid="customer-coupon-status-toggle"
          aria-expanded={!floatingCollapsed}
          aria-label={`${floatingCollapsed ? 'Mostrar' : 'Minimizar'} cupom, fidelidade e status do pedido`}
          onClick={() => setFloatingCollapsed((collapsed) => !collapsed)}
        >
          <span>
            <strong>Cupom e status</strong>
            <small>Fidelidade • Pedido em andamento</small>
          </span>
          <span className="action" aria-hidden="true">
            {floatingCollapsed ? <PanelBottomOpen /> : <PanelBottomClose />}
            <span>{floatingCollapsed ? 'Mostrar' : 'Minimizar'}</span>
          </span>
        </GroupControl>
      )}

      {!floatingCollapsed && (
        <S.CompactNotice
          ref={triggerRef}
          type="button"
          data-floating-drag-handle="true"
          title="Clique para abrir ou arraste para mover"
          onClick={() => setIsOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-busy={loyalty.loading}
          aria-label={`${title}. ${description}`}
        >
          <i className="icon">
            {claimed || highlightedReward?.canRedeem ? <Sparkles /> : <Gift />}
          </i>
          <span>
            <strong>{title}</strong>
            <small>{description}</small>
          </span>
          <b className="notice-badge">{badge}</b>
          <ChevronRight className="chevron" size={18} />
        </S.CompactNotice>
      )}

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
    </FloatingGroup>
  );
}
