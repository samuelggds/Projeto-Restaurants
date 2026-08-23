import { Check, Gift, LockKeyhole, TicketPercent } from 'lucide-react';
import type { LoyaltySummary } from '../types';
import { isUsableLoyaltyRedemption, loyaltyRedemptionEntries } from '../domain/loyaltyRedemption';
import * as S from './LoyaltyCouponPanel.styles';

type Props = {
  loggedIn: boolean;
  loading: boolean;
  summary: LoyaltySummary | null;
  selectedRedemptionId: number | null;
  redeemingCouponId: number | null;
  onSelect: (redemptionId: number | null) => void;
  onLogin: () => void;
  onRedeem: (couponId: number) => void;
};

function benefitLabel(type: 'PERCENTAGE' | 'FIXED', value: number) {
  return type === 'PERCENTAGE'
    ? `${value}% OFF`
    : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function LoyaltyCouponPanel({
  loggedIn,
  loading,
  summary,
  selectedRedemptionId,
  redeemingCouponId,
  onSelect,
  onLogin,
  onRedeem,
}: Props) {
  const claimed = loyaltyRedemptionEntries(summary).filter(({ redemption }) =>
    isUsableLoyaltyRedemption(redemption),
  );
  const redeemable = summary?.rewards.filter((reward) => reward.canRedeem) || [];
  const nextReward = summary?.rewards
    .filter((reward) => !reward.canRedeem && reward.remaining > 0)
    .sort((left, right) => left.remaining - right.remaining)[0];

  return (
    <S.Panel aria-label="Cupom de fidelidade">
      <S.Heading>
        <i>
          <TicketPercent />
        </i>
        <div>
          <strong>Cupom de fidelidade</strong>
          <small>Use um benefício resgatado neste restaurante</small>
        </div>
      </S.Heading>

      {!loggedIn ? (
        <S.Empty>
          <LockKeyhole />
          <span>Entre para consultar seus cupons e progresso.</span>
          <button type="button" onClick={onLogin}>
            Entrar
          </button>
        </S.Empty>
      ) : loading ? (
        <S.Empty aria-busy="true">
          <span>Consultando seus benefícios…</span>
        </S.Empty>
      ) : claimed.length > 0 ? (
        <S.CouponList>
          {claimed.map(({ coupon, redemption }) => {
            const selected = selectedRedemptionId === redemption.id;
            return (
              <button
                type="button"
                key={redemption.id}
                className={selected ? 'selected' : ''}
                aria-pressed={selected}
                onClick={() => onSelect(selected ? null : redemption.id)}
              >
                <span className="coupon-icon">{selected ? <Check /> : <Gift />}</span>
                <span>
                  <b>{coupon.title}</b>
                  <small>
                    {benefitLabel(coupon.discountType, coupon.discount)} • código {coupon.code}
                  </small>
                </span>
                <em>{selected ? 'Aplicado' : 'Aplicar'}</em>
              </button>
            );
          })}
        </S.CouponList>
      ) : redeemable.length > 0 ? (
        <S.Earned>
          <Gift />
          <div>
            <b>Você completou a meta!</b>
            <small>Resgate o cupom para aplicá-lo neste pedido.</small>
          </div>
          <button
            type="button"
            disabled={redeemingCouponId === redeemable[0].coupon.id}
            onClick={() => onRedeem(redeemable[0].coupon.id)}
          >
            {redeemingCouponId === redeemable[0].coupon.id ? 'Resgatando…' : 'Resgatar'}
          </button>
        </S.Earned>
      ) : (
        <S.Empty>
          <Gift />
          <span>
            {nextReward
              ? `Faltam ${nextReward.remaining} ${nextReward.remaining === 1 ? 'pedido pago e entregue' : 'pedidos pagos e entregues'} para ${nextReward.coupon.title}.`
              : 'Nenhum cupom de fidelidade disponível agora.'}
          </span>
        </S.Empty>
      )}
    </S.Panel>
  );
}
