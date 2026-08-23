import { CalendarClock, CheckCircle2, Gift, ShoppingBag, Store, TicketPercent } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { LoyaltySummary } from '../../Home/types';
import { useLoyaltyExpirationClock } from '../../Home/hooks/useLoyaltyExpirationClock';
import {
  buildLoyaltyWalletEntries,
  type LoyaltyWalletEntry,
  type WalletEntryStatus,
} from '../domain/loyaltyWallet';
import * as S from './LoyaltyWallet.styles';

type Props = {
  summary?: LoyaltySummary | null;
  restaurantName: string;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  onUseCoupon?: (redemptionId: number) => void;
};

const money = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function expirationLabel(expiration: string | null) {
  if (!expiration) return 'Sem vencimento definido';
  const date = new Date(expiration);
  if (Number.isNaN(date.getTime())) return 'Validade indisponível';
  return `Válido até ${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

const statusCopy: Record<WalletEntryStatus, string> = {
  available: 'Disponível',
  reserved: 'Em uso',
  used: 'Utilizado',
  expired: 'Expirado',
};

function CouponCard({
  entry,
  onUseCoupon,
}: {
  entry: LoyaltyWalletEntry;
  onUseCoupon?: (redemptionId: number) => void;
}) {
  const inactive = entry.status === 'used' || entry.status === 'expired';

  return (
    <S.Coupon $muted={inactive} data-status={entry.status}>
      <div className="top">
        <span className="restaurant">
          <Store size={15} aria-hidden="true" />
          <span>{entry.restaurantName}</span>
        </span>
        <S.Status $tone={entry.status}>{statusCopy[entry.status]}</S.Status>
      </div>
      <h4>{entry.title}</h4>
      <p>{entry.description || 'Benefício conquistado por pedidos pagos e entregues.'}</p>
      <strong className="value">{entry.discountLabel}</strong>
      <div className="code-row">
        <span>Código</span>
        <code>{entry.code}</code>
      </div>
      <ul className="meta">
        <li>
          <CalendarClock size={14} aria-hidden="true" /> {expirationLabel(entry.expiration)}
        </li>
        <li>
          <ShoppingBag size={14} aria-hidden="true" />
          {entry.minimumSubtotal > 0
            ? `Pedido mínimo de ${money(entry.minimumSubtotal)}`
            : 'Sem valor mínimo de pedido'}
        </li>
        <li>
          <CheckCircle2 size={14} aria-hidden="true" /> Uso único • ciclo {entry.cycle}
        </li>
      </ul>
      {!inactive && (
        <button
          className="action"
          type="button"
          disabled={entry.status === 'reserved'}
          aria-label={
            entry.status === 'reserved'
              ? `${entry.title}, código ${entry.code}, aplicado a um pedido`
              : `Usar ${entry.title}, código ${entry.code}, no próximo pedido`
          }
          onClick={() => onUseCoupon?.(entry.id)}
        >
          {entry.status === 'reserved' ? 'Aplicado a um pedido' : 'Usar no próximo pedido'}
        </button>
      )}
    </S.Coupon>
  );
}

export function LoyaltyWallet({
  summary,
  restaurantName,
  loading = false,
  error = '',
  onRetry,
  onUseCoupon,
}: Props) {
  const [section, setSection] = useState<'active' | 'history'>('active');
  const loyaltyClock = useLoyaltyExpirationClock(summary || null);
  const entries = useMemo(
    () => buildLoyaltyWalletEntries(summary, restaurantName, loyaltyClock),
    [loyaltyClock, restaurantName, summary],
  );
  const active = entries.filter(
    (entry) => entry.status === 'available' || entry.status === 'reserved',
  );
  const history = entries.filter((entry) => entry.status === 'used' || entry.status === 'expired');
  const visible = section === 'active' ? active : history;

  return (
    <>
      <S.Hero>
        <div>
          <p className="eyebrow">
            <TicketPercent size={15} aria-hidden="true" /> Carteira de benefícios
          </p>
          <h2>Seus cupons, sempre à mão</h2>
          <p>
            Cada resgate fica guardado aqui até ser usado ou vencer. Você pode usar apenas um cupom
            por pedido.
          </p>
        </div>
        <aside aria-label="Resumo dos cupons">
          <div>
            <strong>{active.filter((entry) => entry.status === 'available').length}</strong>
            <span>disponíveis</span>
          </div>
          <div>
            <strong>{history.length}</strong>
            <span>no histórico</span>
          </div>
        </aside>
      </S.Hero>

      {!loading && !error && Boolean(summary?.rewards.length) && (
        <S.ProgressSection aria-label="Progresso das próximas recompensas">
          <header>
            <h3>Próximas recompensas</h3>
            <span>O contador reinicia após cada resgate</span>
          </header>
          <S.ProgressGrid>
            {summary!.rewards.map((reward) => {
              const completed = Math.min(reward.purchasesCompleted, reward.purchasesRequired);
              const percent = Math.max(0, Math.min(100, reward.progressPercent));
              return (
                <S.ProgressCard key={reward.coupon.id}>
                  <div>
                    <b>{reward.coupon.title}</b>
                    <small>
                      {completed}/{reward.purchasesRequired}
                    </small>
                  </div>
                  <div
                    className="track"
                    role="progressbar"
                    aria-label={`Progresso para ${reward.coupon.title}`}
                    aria-valuemin={0}
                    aria-valuemax={reward.purchasesRequired}
                    aria-valuenow={completed}
                  >
                    <span style={{ width: `${percent}%` }} />
                  </div>
                  <span>
                    {reward.remaining > 0
                      ? `Faltam ${reward.remaining} ${reward.remaining === 1 ? 'pedido pago e entregue' : 'pedidos pagos e entregues'}.`
                      : 'Meta concluída. Seu benefício já pode ser resgatado.'}
                  </span>
                </S.ProgressCard>
              );
            })}
          </S.ProgressGrid>
        </S.ProgressSection>
      )}

      <S.Wallet aria-label="Carteira de cupons">
        <S.WalletHeader>
          <div>
            <h3>Cupons resgatados</h3>
            <p>Cupons vencidos deixam de funcionar automaticamente.</p>
          </div>
          <S.Segments aria-label="Filtrar cupons">
            <button
              type="button"
              className={section === 'active' ? 'active' : ''}
              aria-pressed={section === 'active'}
              onClick={() => setSection('active')}
            >
              Válidos ({active.length})
            </button>
            <button
              type="button"
              className={section === 'history' ? 'active' : ''}
              aria-pressed={section === 'history'}
              onClick={() => setSection('history')}
            >
              Histórico ({history.length})
            </button>
          </S.Segments>
        </S.WalletHeader>
        <S.CouponGrid aria-live="polite" aria-busy={loading}>
          {loading ? (
            <>
              <S.Skeleton aria-label="Carregando cupons" />
              <S.Skeleton aria-hidden="true" />
            </>
          ) : error ? (
            <S.State role="alert">
              <i>
                <TicketPercent />
              </i>
              <b>Não foi possível carregar seus cupons</b>
              <p>{error}</p>
              <button type="button" onClick={onRetry}>
                Tentar novamente
              </button>
            </S.State>
          ) : visible.length ? (
            visible.map((entry) => (
              <CouponCard key={entry.id} entry={entry} onUseCoupon={onUseCoupon} />
            ))
          ) : (
            <S.State>
              <i>
                <Gift />
              </i>
              <b>
                {section === 'active' ? 'Nenhum cupom válido agora' : 'Seu histórico está vazio'}
              </b>
              <p>
                {section === 'active'
                  ? 'Complete a meta de pedidos pagos e entregues, resgate o benefício e ele aparecerá guardado aqui.'
                  : 'Cupons utilizados ou vencidos aparecerão nesta área.'}
              </p>
            </S.State>
          )}
        </S.CouponGrid>
      </S.Wallet>
    </>
  );
}
