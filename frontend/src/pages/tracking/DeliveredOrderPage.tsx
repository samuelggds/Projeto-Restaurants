import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Headphones,
  Home,
  ReceiptText,
  Star,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import ordersService, { getGuestOrderTrackingToken } from '../../Services/ordersService';
import { normalizeDeliveryTrackingData, type DeliveryTrackingData } from './deliveryTracking';
import * as S from './DeliveredOrderPage.styles';

function money(value: unknown) {
  const amount = Number(value || 0);
  return Number.isFinite(amount)
    ? amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : 'R$ 0,00';
}

function paymentLabel(order: DeliveryTrackingData['order']) {
  const attempt = order.paymentAttempts?.[0];
  const method = String(attempt?.method || order.payOnDeliveryMethod || order.paymentMethod || '').toUpperCase();
  const brand = String(attempt?.cardBrand || '').trim();
  const last4 = String(attempt?.cardLast4 || '').trim();
  if ((method === 'CARD' || method === 'CARTAO') && last4) {
    return `${brand || 'Cartão'} •••• ${last4}`;
  }
  if (method === 'PIX') return 'PIX';
  if (method === 'DINHEIRO') return 'Dinheiro';
  return method ? method.replaceAll('_', ' ') : 'Pagamento confirmado';
}

export default function DeliveredOrderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const orderId = Number(id || 0);
  const [data, setData] = useState<DeliveryTrackingData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [previewRating, setPreviewRating] = useState(0);
  const [savingRating, setSavingRating] = useState(false);
  const [ratingMessage, setRatingMessage] = useState('');

  useEffect(() => {
    let active = true;
    if (!Number.isInteger(orderId) || orderId <= 0) {
      setError('Pedido inválido.');
      setLoading(false);
      return () => { active = false; };
    }
    ordersService
      .getDeliveryTracking(orderId)
      .then((raw) => {
        const next = normalizeDeliveryTrackingData(raw);
        if (!next || next.order.status !== 'ENTREGUE' || !next.order.deliveryConfirmedAt) {
          throw new Error('Este pedido ainda não possui uma entrega confirmada.');
        }
        if (!active) return;
        setData(next);
        setRating(Number(next.order.deliveryRating || 0));
      })
      .catch((requestError) => {
        if (!active) return;
        setError(
          (requestError as { response?: { data?: { error?: string } }; message?: string })?.response
            ?.data?.error ||
            (requestError as Error)?.message ||
            'Não foi possível carregar o pedido entregue.',
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [orderId]);

  const order = data?.order;
  const restaurant = order?.restaurant;
  const isGuest = Boolean(orderId && getGuestOrderTrackingToken(orderId));
  const homePath = restaurant?.slug ? `/${restaurant.slug}` : '/';
  const ordersPath = restaurant?.slug ? `/${restaurant.slug}/pedidos` : isGuest ? '/' : '/profile';
  const deliveredAt = useMemo(() => {
    if (!order?.deliveryConfirmedAt) return '';
    return new Date(order.deliveryConfirmedAt).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [order?.deliveryConfirmedAt]);

  const displayedRating = previewRating || rating;

  async function saveRating(value: number) {
    if (!order || savingRating || value < 1 || value > 5) return;
    setSavingRating(true);
    setRatingMessage('');
    try {
      const result = await ordersService.rateDeliveredOrder(order.id, value);
      setRating(Number(result?.deliveryRating || value));
      setRatingMessage('Avaliação enviada. Obrigado!');
    } catch (requestError) {
      setRatingMessage(
        (requestError as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          'Não foi possível enviar sua avaliação.',
      );
    } finally {
      setSavingRating(false);
    }
  }

  if (loading) return <S.State aria-busy="true">Carregando pedido entregue...</S.State>;
  if (error || !order) return <S.State role="alert">{error || 'Pedido não encontrado.'}</S.State>;

  return (
    <S.Page>
      <S.Header>
        <button type="button" onClick={() => navigate(ordersPath)} aria-label="Voltar">
          <ArrowLeft aria-hidden="true" />
          <span>Início</span>
        </button>
        <S.Brand>
          <S.BrandLogo>
            {restaurant?.logo ? <img src={restaurant.logo} alt="" /> : String(restaurant?.name || 'R').slice(0, 1)}
          </S.BrandLogo>
          <span>
            <strong>{restaurant?.name || 'Restaurante'}</strong>
            <small>Pedido concluído</small>
          </span>
        </S.Brand>
        <nav aria-label="Navegação do pedido entregue">
          <button type="button" onClick={() => navigate(homePath)}>
            <Home aria-hidden="true" /> Início
          </button>
          <button type="button" onClick={() => navigate(ordersPath)}>Meus pedidos</button>
        </nav>
      </S.Header>

      <S.Main>
        <S.SuccessCard>
          <div>
            <S.SuccessPill><CheckCircle2 aria-hidden="true" /> Entrega concluída</S.SuccessPill>
            <h1>Pedido entregue!</h1>
            <p>Tudo certo por aí? Seu pedido foi entregue com sucesso. Esperamos que cada mordida deixe seu dia ainda mais gostoso.</p>
            <S.Meta>
              <span>Pedido #{order.id}</span>
              {deliveredAt ? <span><Clock3 aria-hidden="true" /> Entregue às {deliveredAt}</span> : null}
            </S.Meta>
          </div>
          <S.SuccessIcon><CheckCircle2 aria-hidden="true" /></S.SuccessIcon>
        </S.SuccessCard>

        <S.ContentGrid>
          <S.OrderCard>
            <S.SectionTitle>
              <span>
                <strong>Resumo do pedido</strong>
                <small>{restaurant?.name || 'Restaurante'}</small>
              </span>
              <ReceiptText aria-hidden="true" />
            </S.SectionTitle>
            <S.ItemList>
              {(order.items || []).map((item) => (
                <li key={item.id}>
                  <span>{item.quantity}× {item.product?.name || 'Item do pedido'}</span>
                  <strong>{money(Number(item.price || 0) * Number(item.quantity || 0))}</strong>
                </li>
              ))}
              {Number(order.deliveryFeeAmount || 0) > 0 ? (
                <li><span>Taxa de entrega</span><strong>{money(order.deliveryFeeAmount)}</strong></li>
              ) : null}
              {Number(order.productDiscountTotal || 0) + Number(order.couponDiscount || 0) > 0 ? (
                <li className="discount">
                  <span>Descontos</span>
                  <strong>- {money(Number(order.productDiscountTotal || 0) + Number(order.couponDiscount || 0))}</strong>
                </li>
              ) : null}
            </S.ItemList>
            <S.Total><span>Total</span><strong>{money(order.total)}</strong></S.Total>
            <S.Payment>{paymentLabel(order)}</S.Payment>
          </S.OrderCard>

          <S.Side>
            {order.assignedCourier ? (
              <S.CourierCard>
                <S.CourierAvatar>
                  {order.assignedCourier.avatar ? (
                    <img src={order.assignedCourier.avatar} alt="" />
                  ) : (
                    String(order.assignedCourier.name || 'M').split(/\s+/u).slice(0,2).map((part) => part[0]).join('').toUpperCase()
                  )}
                </S.CourierAvatar>
                <span>
                  <strong>{order.assignedCourier.name || 'Motoqueiro'}</strong>
                  <small>Entrega concluída</small>
                </span>
                <S.Done><CheckCircle2 aria-hidden="true" /> Entrega concluída</S.Done>
              </S.CourierCard>
            ) : null}

            <S.RatingCard className={ratingMessage.startsWith('Avaliação enviada') ? 'rating-saved' : undefined}>
              <h2>Como foi sua experiência?</h2>
              <p>Sua opinião ajuda o restaurante a continuar melhorando.</p>
              <S.Stars
                aria-label="Avaliação do pedido"
                onPointerLeave={() => setPreviewRating(0)}
              >
                {[1, 2, 3, 4, 5].map((value) => (
                  <S.StarButton
                    key={value}
                    type="button"
                    disabled={savingRating}
                    aria-label={`Avaliar com ${value} estrela${value > 1 ? 's' : ''}`}
                    aria-pressed={rating === value}
                    $active={value <= displayedRating}
                    $selected={value === rating}
                    $delay={value * 22}
                    onPointerEnter={() => setPreviewRating(value)}
                    onFocus={() => setPreviewRating(value)}
                    onBlur={() => setPreviewRating(0)}
                    onClick={() => {
                      setRating(value);
                      setPreviewRating(0);
                      setRatingMessage('');
                    }}
                  >
                    <Star aria-hidden="true" fill={value <= displayedRating ? 'currentColor' : 'none'} />
                  </S.StarButton>
                ))}
              </S.Stars>
              <S.RatingHint aria-live="polite">
                {displayedRating
                  ? `${displayedRating} de 5 estrelas`
                  : 'Toque nas estrelas para escolher sua nota'}
              </S.RatingHint>
              {ratingMessage ? <S.RatingMessage role="status">{ratingMessage}</S.RatingMessage> : null}
              <S.Primary
                type="button"
                disabled={!rating || savingRating}
                onClick={() => rating && void saveRating(rating)}
              >
                {savingRating ? 'Enviando...' : 'Avaliar pedido'} <ChevronRight aria-hidden="true" />
              </S.Primary>
              <S.Secondary type="button" onClick={() => navigate(homePath)}>Voltar ao início</S.Secondary>
            </S.RatingCard>
          </S.Side>
        </S.ContentGrid>

        <S.Help type="button" onClick={() => navigate(ordersPath)}>
          <Headphones aria-hidden="true" /> Preciso de ajuda com este pedido
        </S.Help>
      </S.Main>
    </S.Page>
  );
}
