import { type FormEvent, type KeyboardEvent, useMemo, useState } from 'react';
import {
  BadgePercent,
  CalendarClock,
  Gift,
  Image as ImageIcon,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Tag,
  TicketPercent,
  Trash2,
} from 'lucide-react';
import { useAppDialog } from '../../../components/AppDialog/context';
import type {
  AdminCoupon,
  AdminProduct,
  CouponPayload,
  DiscountType,
  ProductDiscountPayload,
} from '../types';
import {
  calculateDiscountedPrice,
  couponPayload,
  couponToDraft,
  normalizeCouponCode,
  productDiscountPayload,
  toDateTimeLocal,
  validateCouponDraft,
  validateProductDiscountDraft,
  type CouponDraft,
  type ProductDiscountDraft,
} from '../domain/promotionValidation';
import * as S from './PromotionsSettings.styles';

type Feedback = { tone: 'success' | 'error'; message: string } | null;
type PromotionTab = 'discounts' | 'loyalty';
type StatusTone = 'active' | 'scheduled' | 'inactive' | 'expired';

type Props = {
  products: AdminProduct[];
  coupons: AdminCoupon[];
  loading?: boolean;
  error?: string;
  onApplyProductDiscount?: (
    productId: string,
    payload: ProductDiscountPayload,
  ) => void | Promise<void>;
  onDeleteProductDiscount?: (productId: string) => void | Promise<void>;
  onCreateCoupon?: (payload: CouponPayload) => void | Promise<void>;
  onUpdateCoupon?: (id: string, payload: CouponPayload) => void | Promise<void>;
  onDeleteCoupon?: (id: string) => void | Promise<void>;
  onReload?: () => void | Promise<void>;
};

const emptyDiscountDraft = (): ProductDiscountDraft => ({
  productId: '',
  type: 'PERCENTAGE',
  value: '10',
  badgeLabel: 'Oferta especial',
  active: true,
  startsAt: '',
  endsAt: '',
});

const emptyCouponDraft = (): CouponDraft => ({
  code: '',
  title: '',
  description: '',
  discountType: 'PERCENTAGE',
  discount: '10',
  minimumSubtotal: '0',
  maxDiscount: '',
  loyaltyPurchasesRequired: '5',
  perCustomerLimit: '1',
  redemptionValidityDays: '30',
  active: true,
  expiration: '',
});

const money = (value: number) =>
  Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function technicalMessage(error: unknown, fallback: string) {
  if (!error || typeof error !== 'object') return fallback;
  const response = (error as { response?: { data?: Record<string, unknown> } }).response;
  return String(response?.data?.error || response?.data?.message || fallback);
}

function dateLabel(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function discountStatus(product: AdminProduct): { tone: StatusTone; label: string } {
  const discount = product.discount;
  if (!discount?.active) return { tone: 'inactive', label: 'Pausado' };
  const now = Date.now();
  if (discount.endsAt && new Date(discount.endsAt).getTime() < now)
    return { tone: 'expired', label: 'Encerrado' };
  if (discount.startsAt && new Date(discount.startsAt).getTime() > now)
    return { tone: 'scheduled', label: 'Agendado' };
  return { tone: 'active', label: 'Ativo na Home' };
}

function couponStatus(coupon: AdminCoupon): { tone: StatusTone; label: string } {
  if (coupon.expiration && new Date(coupon.expiration).getTime() < Date.now())
    return { tone: 'expired', label: 'Expirado' };
  return coupon.active
    ? { tone: 'active', label: 'Ativo' }
    : { tone: 'inactive', label: 'Pausado' };
}

function discountPayloadFromProduct(product: AdminProduct, active: boolean) {
  const discount = product.discount;
  if (!discount) return null;
  return {
    type: discount.type,
    value: discount.value,
    badgeLabel: discount.badgeLabel,
    active,
    ...(discount.startsAt ? { startsAt: discount.startsAt } : {}),
    ...(discount.endsAt ? { endsAt: discount.endsAt } : {}),
  } satisfies ProductDiscountPayload;
}

function discountValueLabel(type: DiscountType, value: number) {
  return type === 'PERCENTAGE' ? `${value}%` : money(value);
}

export function PromotionsSettings({
  products,
  coupons,
  loading = false,
  error = '',
  onApplyProductDiscount,
  onDeleteProductDiscount,
  onCreateCoupon,
  onUpdateCoupon,
  onDeleteCoupon,
  onReload,
}: Props) {
  const { confirmDialog } = useAppDialog();
  const [tab, setTab] = useState<PromotionTab>('discounts');
  const [discountDraft, setDiscountDraft] = useState<ProductDiscountDraft>(emptyDiscountDraft);
  const [discountFeedback, setDiscountFeedback] = useState<Feedback>(null);
  const [discountBusy, setDiscountBusy] = useState<string | null>(null);
  const [discountSearch, setDiscountSearch] = useState('');
  const [discountFilter, setDiscountFilter] = useState<'all' | StatusTone>('all');
  const [couponDraft, setCouponDraft] = useState<CouponDraft>(emptyCouponDraft);
  const [couponFeedback, setCouponFeedback] = useState<Feedback>(null);
  const [couponBusy, setCouponBusy] = useState<string | null>(null);
  const [couponSearch, setCouponSearch] = useState('');
  const [couponFilter, setCouponFilter] = useState<'all' | 'active' | 'inactive' | 'expired'>(
    'all',
  );

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const nextTab: PromotionTab = tab === 'discounts' ? 'loyalty' : 'discounts';
    setTab(nextTab);
    window.requestAnimationFrame(() =>
      document.getElementById(`promotions-tab-${nextTab}`)?.focus(),
    );
  }

  const selectedProduct = products.find((product) => product.id === discountDraft.productId);
  const previewValue = Number(discountDraft.value || 0);
  const previewPrice = selectedProduct
    ? calculateDiscountedPrice(selectedProduct.price, discountDraft.type, previewValue)
    : 0;
  const discountedProducts = useMemo(
    () => products.filter((product) => Boolean(product.discount)),
    [products],
  );
  const activeDiscounts = discountedProducts.filter(
    (product) => discountStatus(product).tone === 'active',
  ).length;
  const activeCoupons = coupons.filter((coupon) => couponStatus(coupon).tone === 'active').length;

  const visibleDiscounts = useMemo(() => {
    const search = discountSearch.trim().toLocaleLowerCase('pt-BR');
    return discountedProducts.filter((product) => {
      const status = discountStatus(product).tone;
      if (discountFilter !== 'all' && status !== discountFilter) return false;
      return (
        !search ||
        product.name.toLocaleLowerCase('pt-BR').includes(search) ||
        product.category.toLocaleLowerCase('pt-BR').includes(search) ||
        product.discount?.badgeLabel.toLocaleLowerCase('pt-BR').includes(search)
      );
    });
  }, [discountFilter, discountSearch, discountedProducts]);

  const visibleCoupons = useMemo(() => {
    const search = couponSearch.trim().toLocaleLowerCase('pt-BR');
    return coupons.filter((coupon) => {
      const status = couponStatus(coupon).tone;
      if (couponFilter !== 'all' && status !== couponFilter) return false;
      return (
        !search ||
        coupon.code.toLocaleLowerCase('pt-BR').includes(search) ||
        coupon.title.toLocaleLowerCase('pt-BR').includes(search)
      );
    });
  }, [couponFilter, couponSearch, coupons]);

  const submitDiscount = async (event: FormEvent) => {
    event.preventDefault();
    const validation = validateProductDiscountDraft(discountDraft, selectedProduct);
    if (validation.length) {
      setDiscountFeedback({ tone: 'error', message: validation[0] });
      return;
    }
    setDiscountBusy('save');
    setDiscountFeedback(null);
    try {
      await onApplyProductDiscount?.(
        discountDraft.productId,
        productDiscountPayload(discountDraft),
      );
      setDiscountDraft(emptyDiscountDraft());
      setDiscountFeedback({
        tone: 'success',
        message: 'Oferta salva. A Home usará o desconto durante o período configurado.',
      });
    } catch (saveError) {
      setDiscountFeedback({
        tone: 'error',
        message: technicalMessage(saveError, 'Não foi possível salvar o desconto.'),
      });
    } finally {
      setDiscountBusy(null);
    }
  };

  const editDiscount = (product: AdminProduct) => {
    const discount = product.discount;
    if (!discount) return;
    setDiscountDraft({
      productId: product.id,
      type: discount.type,
      value: String(discount.value),
      badgeLabel: discount.badgeLabel,
      active: discount.active,
      startsAt: toDateTimeLocal(discount.startsAt),
      endsAt: toDateTimeLocal(discount.endsAt),
    });
    setDiscountFeedback(null);
    document
      .getElementById('discount-editor')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggleDiscount = async (product: AdminProduct) => {
    const payload = discountPayloadFromProduct(product, !product.discount?.active);
    if (!payload) return;
    setDiscountBusy(`toggle-${product.id}`);
    setDiscountFeedback(null);
    try {
      await onApplyProductDiscount?.(product.id, payload);
      setDiscountFeedback({
        tone: 'success',
        message: product.discount?.active ? 'Oferta pausada.' : 'Oferta reativada.',
      });
    } catch (toggleError) {
      setDiscountFeedback({
        tone: 'error',
        message: technicalMessage(toggleError, 'Não foi possível alterar o status da oferta.'),
      });
    } finally {
      setDiscountBusy(null);
    }
  };

  const removeDiscount = async (product: AdminProduct) => {
    const confirmed = await confirmDialog({
      title: 'Remover desconto do produto?',
      description: `${product.name} voltará a exibir apenas o preço base na Home. O produto não será excluído.`,
      confirmLabel: 'Remover desconto',
      tone: 'danger',
    });
    if (!confirmed) return;
    setDiscountBusy(`delete-${product.id}`);
    setDiscountFeedback(null);
    try {
      await onDeleteProductDiscount?.(product.id);
      if (discountDraft.productId === product.id) setDiscountDraft(emptyDiscountDraft());
      setDiscountFeedback({ tone: 'success', message: 'Desconto removido do produto.' });
    } catch (deleteError) {
      setDiscountFeedback({
        tone: 'error',
        message: technicalMessage(deleteError, 'Não foi possível remover o desconto.'),
      });
    } finally {
      setDiscountBusy(null);
    }
  };

  const submitCoupon = async (event: FormEvent) => {
    event.preventDefault();
    const validation = validateCouponDraft(couponDraft);
    if (validation.length) {
      setCouponFeedback({ tone: 'error', message: validation[0] });
      return;
    }
    setCouponBusy('save');
    setCouponFeedback(null);
    try {
      const payload = couponPayload(couponDraft);
      if (couponDraft.id) await onUpdateCoupon?.(couponDraft.id, payload);
      else await onCreateCoupon?.(payload);
      setCouponDraft(emptyCouponDraft());
      setCouponFeedback({
        tone: 'success',
        message: 'Benefício de fidelidade salvo e pronto para acompanhar as compras dos clientes.',
      });
    } catch (saveError) {
      setCouponFeedback({
        tone: 'error',
        message: technicalMessage(saveError, 'Não foi possível salvar o cupom de fidelidade.'),
      });
    } finally {
      setCouponBusy(null);
    }
  };

  const toggleCoupon = async (coupon: AdminCoupon) => {
    setCouponBusy(`toggle-${coupon.id}`);
    setCouponFeedback(null);
    try {
      await onUpdateCoupon?.(
        coupon.id,
        couponPayload({ ...couponToDraft(coupon), active: !coupon.active }),
      );
      setCouponFeedback({
        tone: 'success',
        message: coupon.active ? 'Cupom pausado.' : 'Cupom reativado.',
      });
    } catch (toggleError) {
      setCouponFeedback({
        tone: 'error',
        message: technicalMessage(toggleError, 'Não foi possível alterar o status do cupom.'),
      });
    } finally {
      setCouponBusy(null);
    }
  };

  const removeCoupon = async (coupon: AdminCoupon) => {
    const confirmed = await confirmDialog({
      title: 'Excluir benefício de fidelidade?',
      description: `A regra “${coupon.title}” só será excluída se ainda não tiver nenhum cupom emitido. Se clientes já resgataram, pause a campanha para preservar a carteira e o histórico.`,
      confirmLabel: 'Excluir benefício',
      tone: 'danger',
    });
    if (!confirmed) return;
    setCouponBusy(`delete-${coupon.id}`);
    setCouponFeedback(null);
    try {
      await onDeleteCoupon?.(coupon.id);
      if (couponDraft.id === coupon.id) setCouponDraft(emptyCouponDraft());
      setCouponFeedback({ tone: 'success', message: 'Benefício excluído.' });
    } catch (deleteError) {
      setCouponFeedback({
        tone: 'error',
        message: technicalMessage(deleteError, 'Não foi possível excluir o benefício.'),
      });
    } finally {
      setCouponBusy(null);
    }
  };

  return (
    <S.Workspace>
      <S.Hero>
        <div className="hero-icon">
          <BadgePercent />
        </div>
        <div>
          <span className="eyebrow">OPERAÇÃO COMERCIAL</span>
          <h2>Descontos que vendem e fidelizam</h2>
          <p>
            Destaque ofertas na Home e recompense clientes frequentes com regras simples,
            transparentes e exclusivas deste restaurante.
          </p>
        </div>
        <dl aria-label="Resumo de descontos e fidelidade">
          <div>
            <dt>OFERTAS ATIVAS</dt>
            <dd>{activeDiscounts}</dd>
          </div>
          <div>
            <dt>PRODUTOS EM OFERTA</dt>
            <dd>{discountedProducts.length}</dd>
          </div>
          <div>
            <dt>CUPONS ATIVOS</dt>
            <dd>{activeCoupons}</dd>
          </div>
        </dl>
      </S.Hero>

      <S.Tabs role="tablist" aria-label="Tipos de campanha">
        <button
          id="promotions-tab-discounts"
          className={tab === 'discounts' ? 'active' : ''}
          type="button"
          role="tab"
          aria-selected={tab === 'discounts'}
          aria-controls="promotions-panel-discounts"
          tabIndex={tab === 'discounts' ? 0 : -1}
          onKeyDown={handleTabKeyDown}
          onClick={() => setTab('discounts')}
        >
          <Tag /> Descontos nos produtos
        </button>
        <button
          id="promotions-tab-loyalty"
          className={tab === 'loyalty' ? 'active' : ''}
          type="button"
          role="tab"
          aria-selected={tab === 'loyalty'}
          aria-controls="promotions-panel-loyalty"
          tabIndex={tab === 'loyalty' ? 0 : -1}
          onKeyDown={handleTabKeyDown}
          onClick={() => setTab('loyalty')}
        >
          <Gift /> Cupons de fidelidade
        </button>
      </S.Tabs>

      {loading && (
        <S.LoadState $tone="loading" role="status">
          <LoaderCircle className="spin" /> Carregando campanhas deste restaurante...
        </S.LoadState>
      )}
      {error && (
        <S.LoadState $tone="error" role="alert">
          <RefreshCw />
          <span>{error}</span>
          {onReload && (
            <button type="button" onClick={() => void onReload()}>
              Tentar novamente
            </button>
          )}
        </S.LoadState>
      )}

      {tab === 'discounts' ? (
        <S.TabPanel
          id="promotions-panel-discounts"
          role="tabpanel"
          aria-labelledby="promotions-tab-discounts"
        >
          <S.Panel id="discount-editor">
            <S.PanelHeader>
              <div>
                <span className="heading-icon">
                  <BadgePercent />
                </span>
                <div>
                  <h3>Criar ou editar uma oferta</h3>
                  <p>Escolha um produto, configure o desconto e confira como ele será destacado.</p>
                </div>
              </div>
            </S.PanelHeader>
            {discountFeedback && (
              <S.Feedback $tone={discountFeedback.tone} role="status">
                {discountFeedback.message}
              </S.Feedback>
            )}
            <S.EditorGrid onSubmit={submitDiscount}>
              <div className="fields">
                <S.Field className="full">
                  <span>Produto</span>
                  <select
                    aria-label="Produto que receberá o desconto"
                    value={discountDraft.productId}
                    onChange={(event) =>
                      setDiscountDraft((current) => ({
                        ...current,
                        productId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Selecione um produto cadastrado</option>
                    {products.map((product) => (
                      <option
                        key={product.id}
                        value={product.id}
                        disabled={product.active === false}
                      >
                        {product.name} · {money(product.price)}
                        {product.active === false ? ' · indisponível' : ''}
                      </option>
                    ))}
                  </select>
                </S.Field>
                <div className="inline-fields full">
                  <S.Field>
                    <span>Tipo de desconto</span>
                    <select
                      value={discountDraft.type}
                      onChange={(event) =>
                        setDiscountDraft((current) => ({
                          ...current,
                          type: event.target.value as ProductDiscountDraft['type'],
                        }))
                      }
                    >
                      <option value="PERCENTAGE">Porcentagem (%)</option>
                      <option value="FIXED">Valor em reais (R$)</option>
                    </select>
                  </S.Field>
                  <S.Field>
                    <span>Valor do desconto</span>
                    <input
                      aria-label="Valor do desconto"
                      type="number"
                      min="0.01"
                      max={discountDraft.type === 'PERCENTAGE' ? '100' : undefined}
                      step="0.01"
                      value={discountDraft.value}
                      onChange={(event) =>
                        setDiscountDraft((current) => ({ ...current, value: event.target.value }))
                      }
                    />
                  </S.Field>
                </div>
                <S.Field className="full">
                  <span>
                    Texto do selo <small>{discountDraft.badgeLabel.length}/32</small>
                  </span>
                  <input
                    maxLength={32}
                    placeholder="Ex.: Oferta especial ou 20% OFF"
                    value={discountDraft.badgeLabel}
                    onChange={(event) =>
                      setDiscountDraft((current) => ({
                        ...current,
                        badgeLabel: event.target.value,
                      }))
                    }
                  />
                </S.Field>
                <S.Field>
                  <span>
                    Início <small>Opcional</small>
                  </span>
                  <input
                    type="datetime-local"
                    value={discountDraft.startsAt}
                    onChange={(event) =>
                      setDiscountDraft((current) => ({
                        ...current,
                        startsAt: event.target.value,
                      }))
                    }
                  />
                </S.Field>
                <S.Field>
                  <span>
                    Término <small>Opcional</small>
                  </span>
                  <input
                    type="datetime-local"
                    value={discountDraft.endsAt}
                    onChange={(event) =>
                      setDiscountDraft((current) => ({ ...current, endsAt: event.target.value }))
                    }
                  />
                </S.Field>
                <S.SwitchRow className="full">
                  Publicar esta oferta
                  <input
                    type="checkbox"
                    checked={discountDraft.active}
                    onChange={(event) =>
                      setDiscountDraft((current) => ({
                        ...current,
                        active: event.target.checked,
                      }))
                    }
                  />
                </S.SwitchRow>
                <S.FormActions>
                  <button
                    className="secondary"
                    type="button"
                    onClick={() => {
                      setDiscountDraft(emptyDiscountDraft());
                      setDiscountFeedback(null);
                    }}
                  >
                    Limpar
                  </button>
                  <button className="primary" disabled={discountBusy === 'save'} type="submit">
                    <Plus /> {discountBusy === 'save' ? 'Salvando...' : 'Salvar oferta'}
                  </button>
                </S.FormActions>
              </div>

              <S.PreviewCard aria-label="Prévia da oferta na Home">
                <small>PRÉVIA NA HOME</small>
                <div className="product-preview">
                  <div className="preview-image">
                    {selectedProduct?.image ? (
                      <img src={selectedProduct.image} alt="" />
                    ) : (
                      <ImageIcon />
                    )}
                    <span className="preview-badge">
                      {discountDraft.badgeLabel.trim() || 'Oferta especial'}
                    </span>
                  </div>
                  <div className="preview-copy">
                    <b>{selectedProduct?.name || 'Produto selecionado'}</b>
                    <div className="prices">
                      <span className="old-price">
                        {selectedProduct ? money(selectedProduct.price) : 'R$ —'}
                      </span>
                      <span className="new-price">
                        {selectedProduct ? money(previewPrice) : 'R$ —'}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="preview-help">
                  O cliente verá o selo, o preço original riscado e o novo preço antes de montar o
                  produto.
                </p>
              </S.PreviewCard>
            </S.EditorGrid>
          </S.Panel>

          <S.Panel>
            <S.ListHeader>
              <div>
                <h3>Ofertas cadastradas</h3>
                <p>Edite, pause ou remova o desconto sem apagar o produto.</p>
              </div>
              <div className="filters">
                <input
                  aria-label="Buscar oferta"
                  placeholder="Buscar produto ou selo"
                  value={discountSearch}
                  onChange={(event) => setDiscountSearch(event.target.value)}
                />
                <select
                  aria-label="Filtrar ofertas por status"
                  value={discountFilter}
                  onChange={(event) =>
                    setDiscountFilter(event.target.value as typeof discountFilter)
                  }
                >
                  <option value="all">Todos os status</option>
                  <option value="active">Ativos</option>
                  <option value="scheduled">Agendados</option>
                  <option value="inactive">Pausados</option>
                  <option value="expired">Encerrados</option>
                </select>
              </div>
            </S.ListHeader>
            <S.CampaignList>
              {visibleDiscounts.map((product) => {
                const discount = product.discount!;
                const status = discountStatus(product);
                const finalPrice =
                  product.pricing?.hasDiscount && Number.isFinite(product.pricing.finalPrice)
                    ? product.pricing.finalPrice
                    : calculateDiscountedPrice(product.price, discount.type, discount.value);
                const busy = discountBusy?.endsWith(product.id);
                return (
                  <S.CampaignCard key={product.id}>
                    <div className="campaign-image">
                      {product.image ? <img src={product.image} alt="" /> : <Tag />}
                    </div>
                    <div className="campaign-copy">
                      <div className="campaign-title">
                        <b>{product.name}</b>
                        <S.Status $tone={status.tone}>{status.label}</S.Status>
                      </div>
                      <div className="campaign-meta">
                        <strong>{discount.badgeLabel}</strong>
                        <span>Desconto de {discountValueLabel(discount.type, discount.value)}</span>
                        <span>
                          {money(product.price)} → {money(finalPrice)}
                        </span>
                        {discount.startsAt && <span>Início {dateLabel(discount.startsAt)}</span>}
                        {discount.endsAt && <span>Até {dateLabel(discount.endsAt)}</span>}
                      </div>
                    </div>
                    <div className="actions">
                      <button
                        aria-label={`Editar desconto de ${product.name}`}
                        disabled={busy}
                        onClick={() => editDiscount(product)}
                        type="button"
                      >
                        <Pencil />
                      </button>
                      <button
                        className="action-label"
                        disabled={busy}
                        onClick={() => void toggleDiscount(product)}
                        type="button"
                      >
                        {discount.active ? 'Pausar' : 'Ativar'}
                      </button>
                      <button
                        aria-label={`Remover desconto de ${product.name}`}
                        className="danger"
                        disabled={busy}
                        onClick={() => void removeDiscount(product)}
                        type="button"
                      >
                        <Trash2 />
                      </button>
                    </div>
                  </S.CampaignCard>
                );
              })}
              {!visibleDiscounts.length && !loading && (
                <S.EmptyState>
                  <BadgePercent />
                  <b>
                    {discountedProducts.length
                      ? 'Nenhuma oferta encontrada'
                      : 'Nenhuma oferta cadastrada'}
                  </b>
                  <p>
                    {discountedProducts.length
                      ? 'Altere os filtros para encontrar outra campanha.'
                      : 'Use o formulário acima para destacar o primeiro produto com desconto.'}
                  </p>
                </S.EmptyState>
              )}
            </S.CampaignList>
          </S.Panel>
        </S.TabPanel>
      ) : (
        <S.TabPanel
          id="promotions-panel-loyalty"
          role="tabpanel"
          aria-labelledby="promotions-tab-loyalty"
        >
          <S.LoyaltyFlow aria-label="Como funciona a fidelidade">
            <article>
              <span>1</span>
              <b>Pedido é entregue</b>
              <p>Somente pedidos pagos e entregues neste restaurante contam para a meta.</p>
            </article>
            <article>
              <span>2</span>
              <b>Atinge a meta</b>
              <p>O sistema acompanha automaticamente a quantidade definida pelo admin.</p>
            </article>
            <article>
              <span>3</span>
              <b>Resgata o cupom</b>
              <p>O benefício fica disponível ao cliente elegível no plano fidelidade.</p>
            </article>
            <article>
              <span>4</span>
              <b>Usa no checkout</b>
              <p>O desconto é validado antes da confirmação do próximo pedido.</p>
            </article>
          </S.LoyaltyFlow>

          <S.Panel id="coupon-editor">
            <S.PanelHeader>
              <div>
                <span className="heading-icon">
                  <TicketPercent />
                </span>
                <div>
                  <h3>{couponDraft.id ? 'Editar benefício' : 'Novo benefício de fidelidade'}</h3>
                  <p>Defina quantos pedidos pagos e entregues liberam o cupom.</p>
                </div>
              </div>
            </S.PanelHeader>
            {couponFeedback && (
              <S.Feedback $tone={couponFeedback.tone} role="status">
                {couponFeedback.message}
              </S.Feedback>
            )}
            <S.EditorGrid onSubmit={submitCoupon}>
              <div className="fields">
                <S.Field>
                  <span>Código de identificação</span>
                  <input
                    maxLength={30}
                    placeholder="Ex.: CLIENTE-FIEL"
                    value={couponDraft.code}
                    onChange={(event) =>
                      setCouponDraft((current) => ({
                        ...current,
                        code: normalizeCouponCode(event.target.value),
                      }))
                    }
                  />
                </S.Field>
                <S.Field>
                  <span>Título do benefício</span>
                  <input
                    maxLength={80}
                    placeholder="Ex.: Recompensa cliente fiel"
                    value={couponDraft.title}
                    onChange={(event) =>
                      setCouponDraft((current) => ({ ...current, title: event.target.value }))
                    }
                  />
                </S.Field>
                <S.Field className="full">
                  <span>
                    Explicação para o cliente <small>{couponDraft.description.length}/240</small>
                  </span>
                  <textarea
                    maxLength={240}
                    placeholder="Ex.: Complete 5 pedidos pagos e entregues e ganhe 15%."
                    value={couponDraft.description}
                    onChange={(event) =>
                      setCouponDraft((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                  />
                </S.Field>
                <S.Field>
                  <span>Pedidos pagos e entregues para liberar</span>
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={couponDraft.loyaltyPurchasesRequired}
                    onChange={(event) =>
                      setCouponDraft((current) => ({
                        ...current,
                        loyaltyPurchasesRequired: event.target.value,
                      }))
                    }
                  />
                </S.Field>
                <S.Field>
                  <span>
                    Cupons guardados ao mesmo tempo <small>Por benefício</small>
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={couponDraft.perCustomerLimit}
                    onChange={(event) =>
                      setCouponDraft((current) => ({
                        ...current,
                        perCustomerLimit: event.target.value,
                      }))
                    }
                  />
                </S.Field>
                <S.Field>
                  <span>Validade após o resgate (dias)</span>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={couponDraft.redemptionValidityDays}
                    onChange={(event) =>
                      setCouponDraft((current) => ({
                        ...current,
                        redemptionValidityDays: event.target.value,
                      }))
                    }
                  />
                </S.Field>
                <div className="inline-fields full">
                  <S.Field>
                    <span>Tipo de recompensa</span>
                    <select
                      value={couponDraft.discountType}
                      onChange={(event) =>
                        setCouponDraft((current) => ({
                          ...current,
                          discountType: event.target.value as CouponDraft['discountType'],
                        }))
                      }
                    >
                      <option value="PERCENTAGE">Porcentagem (%)</option>
                      <option value="FIXED">Valor em reais (R$)</option>
                    </select>
                  </S.Field>
                  <S.Field>
                    <span>Valor do desconto</span>
                    <input
                      type="number"
                      min="0.01"
                      max={couponDraft.discountType === 'PERCENTAGE' ? '99.99' : undefined}
                      step="0.01"
                      value={couponDraft.discount}
                      onChange={(event) =>
                        setCouponDraft((current) => ({ ...current, discount: event.target.value }))
                      }
                    />
                  </S.Field>
                </div>
                <S.Field>
                  <span>Pedido mínimo (R$)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={couponDraft.minimumSubtotal}
                    onChange={(event) =>
                      setCouponDraft((current) => ({
                        ...current,
                        minimumSubtotal: event.target.value,
                      }))
                    }
                  />
                </S.Field>
                <S.Field>
                  <span>
                    Limite do desconto (R$) <small>Opcional</small>
                  </span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="Sem limite"
                    value={couponDraft.maxDiscount}
                    onChange={(event) =>
                      setCouponDraft((current) => ({
                        ...current,
                        maxDiscount: event.target.value,
                      }))
                    }
                  />
                </S.Field>
                <S.Field>
                  <span>
                    Encerrar campanha em <small>Opcional</small>
                  </span>
                  <input
                    type="datetime-local"
                    value={couponDraft.expiration}
                    onChange={(event) =>
                      setCouponDraft((current) => ({
                        ...current,
                        expiration: event.target.value,
                      }))
                    }
                  />
                </S.Field>
                <S.SwitchRow>
                  Benefício ativo
                  <input
                    type="checkbox"
                    checked={couponDraft.active}
                    onChange={(event) =>
                      setCouponDraft((current) => ({
                        ...current,
                        active: event.target.checked,
                      }))
                    }
                  />
                </S.SwitchRow>
                <S.FormActions>
                  <button
                    className="secondary"
                    type="button"
                    onClick={() => {
                      setCouponDraft(emptyCouponDraft());
                      setCouponFeedback(null);
                    }}
                  >
                    {couponDraft.id ? 'Cancelar edição' : 'Limpar'}
                  </button>
                  <button className="primary" disabled={couponBusy === 'save'} type="submit">
                    <Plus /> {couponBusy === 'save' ? 'Salvando...' : 'Salvar benefício'}
                  </button>
                </S.FormActions>
              </div>

              <S.CouponPreview aria-label="Prévia do cupom de fidelidade">
                <small>PRÉVIA DO BENEFÍCIO</small>
                <div className="coupon-ticket">
                  <div className="coupon-top">
                    <span className="coupon-code">{couponDraft.code || 'SEU-CUPOM'}</span>
                    <Gift size={18} />
                  </div>
                  <b>{couponDraft.title || 'Recompensa cliente fiel'}</b>
                  <div className="coupon-value">
                    <span>Você ganhou</span>
                    <strong>
                      {couponDraft.discountType === 'PERCENTAGE'
                        ? `${Number(couponDraft.discount || 0)}%`
                        : money(Number(couponDraft.discount || 0))}
                    </strong>
                  </div>
                  <p>
                    Liberado após {Number(couponDraft.loyaltyPurchasesRequired || 0)} pedidos pagos
                    e entregues neste restaurante.
                  </p>
                  <p>
                    Depois do resgate, fica salvo por até{' '}
                    {Number(couponDraft.redemptionValidityDays || 0)} dias.
                  </p>
                </div>
                <p className="preview-help">
                  Ao resgatar, a contagem reinicia em zero. O cliente guarda o cupom no perfil e usa
                  somente um por pedido. Se a campanha já tiver data final, o prazo emitido respeita
                  esse encerramento.
                </p>
              </S.CouponPreview>
            </S.EditorGrid>
          </S.Panel>

          <S.Panel>
            <S.ListHeader>
              <div>
                <h3>Benefícios cadastrados</h3>
                <p>Acompanhe as metas disponíveis e ajuste as regras quando necessário.</p>
              </div>
              <div className="filters">
                <input
                  aria-label="Buscar benefício"
                  placeholder="Buscar código ou benefício"
                  value={couponSearch}
                  onChange={(event) => setCouponSearch(event.target.value)}
                />
                <select
                  aria-label="Filtrar benefícios por status"
                  value={couponFilter}
                  onChange={(event) => setCouponFilter(event.target.value as typeof couponFilter)}
                >
                  <option value="all">Todos os status</option>
                  <option value="active">Ativos</option>
                  <option value="inactive">Pausados</option>
                  <option value="expired">Expirados</option>
                </select>
              </div>
            </S.ListHeader>
            <S.CampaignList>
              {visibleCoupons.map((coupon) => {
                const status = couponStatus(coupon);
                const busy = couponBusy?.endsWith(coupon.id);
                return (
                  <S.CampaignCard key={coupon.id}>
                    <div className="campaign-icon">
                      <TicketPercent />
                    </div>
                    <div className="campaign-copy">
                      <div className="campaign-title">
                        <b>{coupon.title}</b>
                        <S.Status $tone={status.tone}>{status.label}</S.Status>
                      </div>
                      <div className="campaign-meta">
                        <strong>{coupon.code}</strong>
                        <span>
                          {discountValueLabel(coupon.discountType, coupon.discount)} de desconto
                        </span>
                        <span>
                          Após {coupon.loyaltyPurchasesRequired} pedidos pagos e entregues
                        </span>
                        <span>Até {coupon.perCustomerLimit} cupom(ns) guardado(s)</span>
                        <span>Válido por {coupon.redemptionValidityDays || 30} dias</span>
                        {coupon.expiration && (
                          <span>Campanha até {dateLabel(coupon.expiration)}</span>
                        )}
                      </div>
                    </div>
                    <div className="actions">
                      <button
                        aria-label={`Editar ${coupon.title}`}
                        disabled={busy}
                        onClick={() => {
                          setCouponDraft(couponToDraft(coupon));
                          setCouponFeedback(null);
                          document
                            .getElementById('coupon-editor')
                            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                        type="button"
                      >
                        <Pencil />
                      </button>
                      <button
                        className="action-label"
                        disabled={busy}
                        onClick={() => void toggleCoupon(coupon)}
                        type="button"
                      >
                        {coupon.active ? 'Pausar' : 'Ativar'}
                      </button>
                      <button
                        aria-label={`Excluir ${coupon.title}`}
                        className="danger"
                        disabled={busy}
                        onClick={() => void removeCoupon(coupon)}
                        type="button"
                      >
                        <Trash2 />
                      </button>
                    </div>
                  </S.CampaignCard>
                );
              })}
              {!visibleCoupons.length && !loading && (
                <S.EmptyState>
                  <CalendarClock />
                  <b>
                    {coupons.length ? 'Nenhum benefício encontrado' : 'Nenhum benefício cadastrado'}
                  </b>
                  <p>
                    {coupons.length
                      ? 'Altere os filtros para encontrar outra regra.'
                      : 'Crie a primeira meta para começar a recompensar clientes frequentes.'}
                  </p>
                </S.EmptyState>
              )}
            </S.CampaignList>
          </S.Panel>
        </S.TabPanel>
      )}
    </S.Workspace>
  );
}
