import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';
import {
  Boxes,
  Image,
  Loader2,
  PackagePlus,
  RefreshCw,
  Save,
  Settings2,
  Tags,
  X,
} from 'lucide-react';
import superAdminService from '../../../Services/superAdminService';
import { ProductDrawer } from '../../admin/components/ProductDrawer';
import { useCategoryCardReorder } from '../../admin/hooks/useCategoryCardReorder';
import { ManagedCustomProductWizard } from './ManagedCustomProductWizard';
import { ManagedImageEditor } from './ManagedImageEditor';
import type { ManagedImagePurpose } from '../../../Services/managedImageEnhancementService';
import { isManagedSimpleCustomProduct } from '../domain/managedCustomProductConfiguration';
import type {
  AdminCategory,
  AdminIngredient,
  AdminProduct,
  AdminProductOptionGroup,
  AdminProductCompositionItem,
  AdminProductPortionConfiguration,
} from '../../admin/types';
import * as S from './ManagedRestaurantWorkspace.styles';
import { ManagedPrinterSettings } from './ManagedPrinterSettings';

type Product = {
  id: number;
  name: string;
  description?: string | null;
  image?: string | null;
  price: number | string;
  preparationTime?: number | null;
  stock?: number | null;
  active?: boolean;
  featured?: boolean;
  kind?: string;
  saleMode?: string;
  pricingMode?: string;
  configurationVersion?: number;
  optionGroups?: AdminProductOptionGroup[];
  compositionItems?: AdminProductCompositionItem[];
  portionConfiguration?: AdminProductPortionConfiguration | null;
  categoryId?: number;
  category?: { id: number; name: string } | null;
  comboGroups?: Array<{
    options?: Array<{ componentProductId?: number; componentProduct?: { id: number } }>;
  }>;
};

type Category = {
  id: number;
  name: string;
  description?: string | null;
  active?: boolean;
  sortOrder?: number;
};

type Banner = {
  id: number;
  title: string;
  highlight?: string | null;
  description?: string | null;
  buttonLabel?: string | null;
  image?: string | null;
  active?: boolean;
  position?: number;
};

type Workspace = {
  restaurant: {
    id: number;
    name: string;
    slug: string;
    plan: string | null;
    subscriptionStatus: string | null;
    implementationStatus: string | null;
  };
  products: Product[];
  categories: Category[];
  ingredients: AdminIngredient[];
  combos: Product[];
  banners: Banner[];
  settings: Record<string, unknown> | null;
};

type Tab = 'products' | 'categories' | 'combos' | 'banners' | 'settings' | 'printing';

type ManagedBusinessHour = { id: string; enabled: boolean; openingTime: string; closingTime: string };

function requestError(error: unknown) {
  return (
    (error as { response?: { data?: { error?: string; message?: string } } })?.response?.data
      ?.error ||
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
    (error instanceof Error ? error.message : '') ||
    'Não foi possível concluir a alteração.'
  );
}

const toNumber = (value: unknown) => Number(value || 0);

type ManagedImageTarget = 'product' | 'combo' | 'banner' | 'logo' | 'cover';

const managedImageLabels: Record<ManagedImageTarget, string> = {
  product: 'Foto do produto',
  combo: 'Foto do combo',
  banner: 'Imagem do banner',
  logo: 'Logo do restaurante',
  cover: 'Capa do restaurante',
};
const managedImagePurposes: Record<ManagedImageTarget, ManagedImagePurpose> = {
  product: 'PRODUCT', combo: 'COMBO', banner: 'BANNER', logo: 'LOGO', cover: 'COVER',
};

type WorkspaceProps = { restaurantId: number; onClose: () => void };

export function ManagedRestaurantWorkspace(props: WorkspaceProps) {
  // A tenant change must discard every draft and pending image preview.
  return <ManagedRestaurantWorkspaceContent key={props.restaurantId} {...props} />;
}

function ManagedRestaurantWorkspaceContent({ restaurantId, onClose }: WorkspaceProps) {
  const [data, setData] = useState<Workspace | null>(null);
  const [tab, setTab] = useState<Tab>('products');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [customProductEditor, setCustomProductEditor] = useState<AdminProduct | null | 'NEW'>(null);

  const [product, setProduct] = useState({
    id: 0,
    name: '',
    description: '',
    image: '',
    price: '',
    categoryId: '',
    preparationTime: '',
    stock: '',
    active: true,
    featured: false,
  });
  const [category, setCategory] = useState({ id: 0, name: '', description: '', active: true });
  const [combo, setCombo] = useState({
    id: 0,
    name: '',
    description: '',
    price: '',
    image: '',
    productIds: [] as number[],
    active: true,
    featured: true,
  });
  const [banner, setBanner] = useState({
    id: 0,
    title: '',
    highlight: '',
    description: '',
    buttonLabel: 'Ver cardápio',
    image: '',
    active: true,
  });
  const [settings, setSettings] = useState({
    restaurantName: '',
    restaurantLogo: '',
    restaurantCoverImage: '',
    restaurantDescription: '',
    restaurantAddress: '',
    restaurantAddressNumber: '',
    restaurantAddressDistrict: '',
    restaurantCity: '',
    restaurantState: '',
    restaurantZipCode: '',
    deliveryTimeMin: '',
    deliveryTimeMax: '',
    deliveryFee: '',
    minimumOrder: '',
    freeShippingMinimum: '',
    whatsapp: '',
    instagram: '',
    primaryColor: '#FF4B4B',
    facebook: '',
    tiktok: '',
    youtube: '',
    fontFamily: 'Inter',
    seoTitle: '',
    seoDescription: '',
    isOpenForOrders: true,
    autoAcceptOrders: false,
    maxConcurrentOrders: '20',
    acceptsDelivery: true,
    acceptsPickup: true,
    businessHours: [] as ManagedBusinessHour[],
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const workspace = (await superAdminService.getManagedRestaurantWorkspace(
        restaurantId,
      )) as Workspace;
      setData(workspace);
      const raw = workspace.settings || {};
      setSettings({
        restaurantName: String(raw.restaurantName || workspace.restaurant.name || ''),
        restaurantLogo: String(raw.restaurantLogo || ''),
        restaurantCoverImage: String(raw.restaurantCoverImage || ''),
        restaurantDescription: String(raw.restaurantDescription || ''),
        restaurantAddress: String(raw.restaurantAddress || ''),
        restaurantAddressNumber: String(raw.restaurantAddressNumber || ''),
        restaurantAddressDistrict: String(raw.restaurantAddressDistrict || ''),
        restaurantCity: String(raw.restaurantCity || ''),
        restaurantState: String(raw.restaurantState || ''),
        restaurantZipCode: String(raw.restaurantZipCode || ''),
        deliveryTimeMin: String(raw.deliveryTimeMin || raw.averageDeliveryTime || ''),
        deliveryTimeMax: String(raw.deliveryTimeMax || raw.averageDeliveryTime || ''),
        deliveryFee: String(raw.deliveryFee ?? ''),
        minimumOrder: String(raw.minimumOrder ?? ''),
        freeShippingMinimum: String(raw.freeShippingMinimum ?? ''),
        whatsapp: String(raw.whatsapp || ''),
        instagram: String(raw.instagram || ''),
        primaryColor: String(raw.primaryColor || '#FF4B4B'),
        facebook: String(raw.facebook || ''),
        tiktok: String(raw.tiktok || ''),
        youtube: String(raw.youtube || ''),
        fontFamily: String(raw.fontFamily || 'Inter'),
        seoTitle: String(raw.seoTitle || ''),
        seoDescription: String(raw.seoDescription || ''),
        isOpenForOrders: raw.isOpenForOrders !== false,
        autoAcceptOrders: raw.autoAcceptOrders === true,
        maxConcurrentOrders: String(raw.maxConcurrentOrders ?? 20),
        acceptsDelivery: raw.acceptsDelivery !== false,
        acceptsPickup: raw.acceptsPickup !== false,
        businessHours: Array.isArray(raw.businessHours) ? (raw.businessHours as ManagedBusinessHour[]) : [],
      });
    } catch (requestFailure) {
      setError(requestError(requestFailure));
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const standardProducts = useMemo(
    () => (data?.products || []).filter((item) => item.kind !== 'COMBO'),
    [data?.products],
  );

  const managedCategories = useMemo<AdminCategory[]>(
    () =>
      (data?.categories || []).map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description ?? null,
        active: item.active !== false,
      })),
    [data?.categories],
  );

  const [categoryBusy, setCategoryBusy] = useState(false);
  const [categoryFeedback, setCategoryFeedback] = useState('');
  const {
    orderedCategories,
    draggingCategoryId,
    beginCategoryDrag,
    moveCategoryWithKeyboard,
    setCategoryCardRef,
  } = useCategoryCardReorder({
    categories: managedCategories,
    busy: categoryBusy || saving,
    onReorderCategories: async (categoryIds) => {
      await superAdminService.reorderManagedCategories(restaurantId, categoryIds);
      await load();
    },
    setBusy: setCategoryBusy,
    setFeedback: setCategoryFeedback,
  });

  const managedIngredients = useMemo<AdminIngredient[]>(
    () =>
      (data?.ingredients || []).map((item) => ({
        id: Number(item.id),
        name: String(item.name || ''),
        price: Number(item.price || 0),
        category: String(item.category || 'Geral'),
        active: item.active !== false,
        image: item.image || null,
      })),
    [data?.ingredients],
  );

  const mapManagedProduct = useCallback(
    (item: Product): AdminProduct => ({
      id: String(item.id),
      categoryId: Number(item.categoryId || item.category?.id || 0),
      name: item.name || '',
      category: item.category?.name || '',
      price: Number(item.price || 0),
      image: item.image || '',
      description: item.description || '',
      stock: item.stock ?? null,
      preparationTime: item.preparationTime ?? undefined,
      active: item.active !== false,
      featured: item.featured === true,
      kind: item.kind === 'COMBO' ? 'COMBO' : 'STANDARD',
      saleMode: item.saleMode === 'BUILDABLE' ? 'BUILDABLE' : 'COMPLETE',
      pricingMode: item.pricingMode === 'HIGHEST_OPTION' ? 'HIGHEST_OPTION' : 'BASE',
      configurationVersion: Math.max(1, Number(item.configurationVersion || 1)),
      optionGroups: item.optionGroups || [],
      compositionItems: item.compositionItems || [],
      portionConfiguration: item.portionConfiguration ?? null,
    }),
    [],
  );

  const managedProducts = useMemo<AdminProduct[]>(
    () => standardProducts.map(mapManagedProduct),
    [mapManagedProduct, standardProducts],
  );

  async function persist(action: () => Promise<unknown>, message: string) {
    if (saving || categoryBusy) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await action();
      setSuccess(message);
      await load();
    } catch (requestFailure) {
      setError(requestError(requestFailure));
    } finally {
      setSaving(false);
    }
  }

  const setManagedImage = useCallback((target: ManagedImageTarget, value: string) => {
    if (target === 'product') {
      setProduct((current) => ({ ...current, image: value }));
      return;
    }
    if (target === 'combo') {
      setCombo((current) => ({ ...current, image: value }));
      return;
    }
    if (target === 'banner') {
      setBanner((current) => ({ ...current, image: value }));
      return;
    }
    const field = target === 'logo' ? 'restaurantLogo' : 'restaurantCoverImage';
    setSettings((current) => ({ ...current, [field]: value }));
  }, []);

  function editProduct(item: Product) {
    if (item.saleMode === 'BUILDABLE') {
      setCustomProductEditor(mapManagedProduct(item));
      return;
    }
    setProduct({
      id: item.id,
      name: item.name || '',
      description: item.description || '',
      image: item.image || '',
      price: String(toNumber(item.price)),
      categoryId: String(item.categoryId || item.category?.id || ''),
      preparationTime: String(item.preparationTime || ''),
      stock: item.stock == null ? '' : String(item.stock),
      active: item.active !== false,
      featured: item.featured === true,
    });
  }

  function resetProduct() {
    setProduct({
      id: 0, name: '', description: '', image: '', price: '', categoryId: '',
      preparationTime: '', stock: '', active: true, featured: false,
    });
  }

  async function saveProduct(event: FormEvent) {
    event.preventDefault();
    const payload: Record<string, unknown> = {
      name: product.name.trim(),
      description: product.description.trim(),
      image: product.image.trim(),
      price: Number(product.price),
      categoryId: Number(product.categoryId),
      active: product.active,
      featured: product.featured,
      ...(product.preparationTime ? { preparationTime: Number(product.preparationTime) } : {}),
      stock: product.stock === '' ? null : Number(product.stock),
      ...(product.id ? {} : { saleMode: 'COMPLETE' }),
    };
    await persist(
      () =>
        product.id
          ? superAdminService.updateManagedProduct(restaurantId, product.id, payload)
          : superAdminService.createManagedProduct(restaurantId, payload),
      product.id ? 'Produto atualizado.' : 'Produto cadastrado.',
    );
    resetProduct();
  }

  async function saveCustomProduct(item: AdminProduct) {
    const payload: Record<string, unknown> = {
      name: item.name,
      description: item.description || '',
      image: item.image || '',
      price: item.price,
      categoryId: item.categoryId,
      active: item.active !== false,
      featured: item.featured === true,
      preparationTime: item.preparationTime,
      stock: item.stock ?? null,
      saleMode: item.saleMode ?? 'BUILDABLE',
      pricingMode: item.pricingMode ?? 'BASE',
      optionGroups: item.optionGroups || [],
      compositionItems: item.compositionItems || [],
      portionConfiguration: item.portionConfiguration ?? null,
      expectedConfigurationVersion: item.configurationVersion,
      confirmDiscardConfiguration: item.confirmDiscardConfiguration,
    };
    if (item.id) {
      await superAdminService.updateManagedProduct(restaurantId, Number(item.id), payload);
    } else {
      await superAdminService.createManagedProduct(restaurantId, payload);
    }
    setCustomProductEditor(null);
    setSuccess(item.id ? 'Produto personalizado atualizado.' : 'Produto personalizado cadastrado.');
    await load();
  }

  async function createManagedIngredient(
    ingredient: Omit<AdminIngredient, 'id'>,
  ): Promise<AdminIngredient> {
    const created = (await superAdminService.createManagedIngredient(restaurantId, {
      name: ingredient.name,
      category: ingredient.category,
      price: Number(ingredient.price || 0),
      active: ingredient.active !== false,
      image: ingredient.image ?? null,
    })) as AdminIngredient;
    await load();
    return {
      id: Number(created.id),
      name: String(created.name || ingredient.name),
      price: Number(created.price ?? ingredient.price ?? 0),
      category: String(created.category || ingredient.category || 'Geral'),
      active: created.active !== false,
      image: created.image ?? null,
    };
  }

  async function saveCategory(event: FormEvent) {
    event.preventDefault();
    const payload = {
      name: category.name.trim(),
      description: category.description.trim(),
      active: category.active,
    };
    await persist(
      () =>
        category.id
          ? superAdminService.updateManagedCategory(restaurantId, category.id, payload)
          : superAdminService.createManagedCategory(restaurantId, payload),
      category.id ? 'Categoria atualizada.' : 'Categoria cadastrada.',
    );
    setCategory({ id: 0, name: '', description: '', active: true });
  }

  function editCombo(item: Product) {
    const selected = (item.comboGroups || []).flatMap((group) =>
      (group.options || [])
        .map((option) => Number(option.componentProductId || option.componentProduct?.id || 0))
        .filter((id) => id > 0),
    );
    setCombo({
      id: item.id,
      name: item.name || '',
      description: item.description || '',
      price: String(toNumber(item.price)),
      image: item.image || '',
      productIds: [...new Set(selected)],
      active: item.active !== false,
      featured: item.featured !== false,
    });
  }

  async function saveCombo(event: FormEvent) {
    event.preventDefault();
    if (!combo.productIds.length) {
      setError('Selecione ao menos um produto para o combo.');
      return;
    }
    const payload = {
      name: combo.name.trim(),
      description: combo.description.trim(),
      image: combo.image.trim(),
      price: Number(combo.price),
      active: combo.active,
      featured: combo.featured,
      groups: [
        {
          name: 'Itens do combo',
          description: 'Produtos incluídos no combo.',
          minSelections: combo.productIds.length,
          maxSelections: combo.productIds.length,
          active: true,
          options: combo.productIds.map((componentProductId) => ({
            componentProductId,
            additionalPrice: 0,
            minQuantity: 1,
            maxQuantity: 1,
            defaultQuantity: 1,
            locked: true,
            active: true,
          })),
        },
      ],
    };
    await persist(
      () =>
        combo.id
          ? superAdminService.updateManagedCombo(restaurantId, combo.id, payload)
          : superAdminService.createManagedCombo(restaurantId, payload),
      combo.id ? 'Combo atualizado.' : 'Combo cadastrado.',
    );
    setCombo({ id: 0, name: '', description: '', price: '', image: '', productIds: [], active: true, featured: true });
  }

  async function saveBanner(event: FormEvent) {
    event.preventDefault();
    const payload = {
      title: banner.title.trim(),
      highlight: banner.highlight.trim(),
      description: banner.description.trim(),
      buttonLabel: banner.buttonLabel.trim(),
      image: banner.image.trim(),
      active: banner.active,
    };
    await persist(
      () =>
        banner.id
          ? superAdminService.updateManagedBanner(restaurantId, banner.id, payload)
          : superAdminService.createManagedBanner(restaurantId, payload),
      banner.id ? 'Banner atualizado.' : 'Banner cadastrado.',
    );
    setBanner({ id: 0, title: '', highlight: '', description: '', buttonLabel: 'Ver cardápio', image: '', active: true });
  }

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    const numeric = (value: string) => (value.trim() ? Number(value) : undefined);
    const payload: Record<string, unknown> = {
      restaurantName: settings.restaurantName.trim(),
      restaurantDescription: settings.restaurantDescription.trim() || null,
      restaurantAddress: settings.restaurantAddress.trim() || null,
      restaurantAddressNumber: settings.restaurantAddressNumber.trim() || null,
      restaurantAddressDistrict: settings.restaurantAddressDistrict.trim() || null,
      restaurantCity: settings.restaurantCity.trim() || null,
      restaurantState: settings.restaurantState.trim().toUpperCase() || null,
      restaurantZipCode: settings.restaurantZipCode.trim() || null,
      whatsapp: settings.whatsapp.trim() || null,
      instagram: settings.instagram.trim() || null,
      primaryColor: settings.primaryColor.trim(),
      facebook: settings.facebook.trim() || null,
      tiktok: settings.tiktok.trim() || null,
      youtube: settings.youtube.trim() || null,
      fontFamily: settings.fontFamily.trim(),
      seoTitle: settings.seoTitle.trim() || null,
      seoDescription: settings.seoDescription.trim() || null,
      isOpenForOrders: settings.isOpenForOrders,
      autoAcceptOrders: settings.autoAcceptOrders,
      maxConcurrentOrders: Number(settings.maxConcurrentOrders),
      acceptsDelivery: settings.acceptsDelivery,
      acceptsPickup: settings.acceptsPickup,
      ...(settings.businessHours.length === 7 ? { businessHours: settings.businessHours } : {}),
    };
    // Do not resend unchanged large images or overwrite them on unrelated saves.
    if (settings.restaurantLogo !== String(data?.settings?.restaurantLogo || '')) payload.restaurantLogo = settings.restaurantLogo.trim() || null;
    if (settings.restaurantCoverImage !== String(data?.settings?.restaurantCoverImage || '')) payload.restaurantCoverImage = settings.restaurantCoverImage.trim() || null;
    const deliveryTimeMin = numeric(settings.deliveryTimeMin);
    const deliveryTimeMax = numeric(settings.deliveryTimeMax);
    const deliveryFee = numeric(settings.deliveryFee);
    const minimumOrder = numeric(settings.minimumOrder);
    const freeShippingMinimum = numeric(settings.freeShippingMinimum);
    if (deliveryTimeMin !== undefined) payload.deliveryTimeMin = deliveryTimeMin;
    if (deliveryTimeMax !== undefined) payload.deliveryTimeMax = deliveryTimeMax;
    if (deliveryFee !== undefined) payload.deliveryFee = deliveryFee;
    if (minimumOrder !== undefined) payload.minimumOrder = minimumOrder;
    payload.freeShippingMinimum = freeShippingMinimum ?? null;
    await persist(
      () => superAdminService.updateManagedSafeSettings(restaurantId, payload),
      'Configurações atualizadas.',
    );
  }

  const renderImageInput = (target: ManagedImageTarget, value: string, required = false) => (
    <ManagedImageEditor
      key={`${restaurantId}:${target}:${target === 'product' ? product.id : target === 'combo' ? combo.id : target === 'banner' ? banner.id : 'settings'}`}
      restaurantId={restaurantId}
      purpose={managedImagePurposes[target]}
      label={managedImageLabels[target]}
      value={value}
      required={required}
      disabled={saving || loading}
      onChange={(image) => setManagedImage(target, image)}
    />
  );

  return (
    <S.Backdrop role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <S.Dialog role="dialog" aria-modal="true" aria-label="Gerenciar restaurante assistido">
        <S.Header>
          <div>
            <small>WORKSPACE ASSISTIDO</small>
            <h2>{data?.restaurant.name || `Restaurante #${restaurantId}`}</h2>
            <p>
              {data?.restaurant.plan === 'GESTAO_TOTAL'
                ? 'Gestão Total'
                : data?.restaurant.plan === 'PREMIUM'
                  ? 'Premium'
                  : data?.restaurant.plan === 'BASICO'
                    ? 'Básico'
                    : data?.restaurant.plan || 'Plano não identificado'} • alterações auditadas
            </p>
          </div>
          <div>
            <button type="button" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? 'spin' : undefined} /></button>
            <button type="button" aria-label="Fechar workspace" onClick={onClose}><X /></button>
          </div>
        </S.Header>

        <S.Tabs>
          <button className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}><PackagePlus />Produtos</button>
          <button className={tab === 'categories' ? 'active' : ''} onClick={() => setTab('categories')}><Tags />Categorias</button>
          <button className={tab === 'combos' ? 'active' : ''} onClick={() => setTab('combos')}><Boxes />Combos</button>
          <button className={tab === 'banners' ? 'active' : ''} onClick={() => setTab('banners')}><Image />Banners</button>
          <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}><Settings2 />Configurações</button>
          <button className={tab === 'printing' ? 'active' : ''} onClick={() => setTab('printing')}><Settings2 />Impressão</button>
        </S.Tabs>

        {error ? <S.Alert $error role="alert">{error}</S.Alert> : null}
        {success ? <S.Alert role="status">{success}</S.Alert> : null}

        {loading && !data ? (
          <S.Loading><Loader2 className="spin" /><strong>Carregando restaurante...</strong></S.Loading>
        ) : data ? (
          <S.Body>
            {tab === 'products' ? (
              <S.Split>
                <S.List>
                  <S.SectionTitle>
                    <div><small>CATÁLOGO</small><h3>Produtos</h3></div>
                    <span>{standardProducts.length}</span>
                  </S.SectionTitle>
                  <button
                    type="button"
                    onClick={() => setCustomProductEditor('NEW')}
                    style={{ marginBottom: 10, fontWeight: 700 }}
                  >
                    <PackagePlus size={16} /> Cadastrar produto personalizável
                  </button>
                  {standardProducts.map((item) => (
                    <button key={item.id} type="button" onClick={() => editProduct(item)}>
                      <span>
                        <b>{item.name}</b>
                        <small>
                          {item.category?.name || 'Sem categoria'} ·{' '}
                          {item.saleMode === 'BUILDABLE' ? 'Personalizável' : 'Produto pronto'}
                        </small>
                      </span>
                      <strong>{Number(item.price || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                    </button>
                  ))}
                </S.List>
                <S.Form onSubmit={saveProduct}>
                  <h3>{product.id ? 'Editar produto' : 'Cadastrar produto'}</h3>
                  <label>Nome<input required value={product.name} onChange={(e) => setProduct((x) => ({ ...x, name: e.target.value }))} /></label>
                  <label>Descrição<textarea rows={3} value={product.description} onChange={(e) => setProduct((x) => ({ ...x, description: e.target.value }))} /></label>
                  <S.Two>
                    <label>Preço<input required type="number" min="0" step="0.01" value={product.price} onChange={(e) => setProduct((x) => ({ ...x, price: e.target.value }))} /></label>
                    <label>Categoria<select required value={product.categoryId} onChange={(e) => setProduct((x) => ({ ...x, categoryId: e.target.value }))}><option value="">Selecione</option>{data.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                    <label>Preparo (min)<input type="number" min="1" max="240" value={product.preparationTime} onChange={(e) => setProduct((x) => ({ ...x, preparationTime: e.target.value }))} /></label>
                    <label>Estoque<input type="number" min="0" value={product.stock} onChange={(e) => setProduct((x) => ({ ...x, stock: e.target.value }))} /></label>
                  </S.Two>
                  {renderImageInput('product', product.image)}
                  <S.Checks><label><input type="checkbox" checked={product.active} onChange={(e) => setProduct((x) => ({ ...x, active: e.target.checked }))} />Ativo</label><label><input type="checkbox" checked={product.featured} onChange={(e) => setProduct((x) => ({ ...x, featured: e.target.checked }))} />Destaque</label></S.Checks>
                  <S.FormActions>{product.id ? <button type="button" onClick={resetProduct}>Novo</button> : null}<button className="primary" disabled={saving}><Save />{saving ? 'Salvando...' : 'Salvar produto'}</button></S.FormActions>
                </S.Form>
              </S.Split>
            ) : tab === 'categories' ? (
              <S.Split>
                <S.List>
                  <S.SectionTitle><div><small>ORGANIZAÇÃO</small><h3>Categorias</h3></div><span>{data.categories.length}</span></S.SectionTitle>
                  <S.CategoryHint>Arraste as categorias para definir a sequência do cardápio ou use as setas do teclado.</S.CategoryHint>
                  {categoryFeedback ? <S.CategoryFeedback role={categoryFeedback.startsWith('Categorias reorganizadas') ? 'status' : 'alert'}>{categoryFeedback}</S.CategoryFeedback> : null}
                  {orderedCategories.map((item) => (
                    <S.ReorderableCategory
                      key={item.id}
                      data-category-card
                      data-category-id={item.id}
                      data-drag-source={draggingCategoryId === item.id ? 'true' : undefined}
                      tabIndex={0}
                      aria-label={`Categoria ${item.name}. Arraste para reorganizar ou use as setas.`}
                      aria-disabled={categoryBusy || saving}
                      onPointerDown={(event) => beginCategoryDrag(event, item.id)}
                      onKeyDown={(event) => {
                        if (event.target !== event.currentTarget) return;
                        if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
                          event.preventDefault();
                          void moveCategoryWithKeyboard(item.id, -1);
                        }
                        if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
                          event.preventDefault();
                          void moveCategoryWithKeyboard(item.id, 1);
                        }
                      }}
                      onDragStart={(event) => event.preventDefault()}
                      ref={(element) => setCategoryCardRef(item.id, element)}
                    >
                      <span><b>{item.name}</b><small>{item.active === false ? 'Inativa' : 'Ativa'}</small></span>
                      <button
                        type="button"
                        data-no-category-drag
                        disabled={categoryBusy || saving}
                        onClick={() => setCategory({ id: item.id, name: item.name, description: item.description || '', active: item.active !== false })}
                      >Editar</button>
                    </S.ReorderableCategory>
                  ))}
                </S.List>
                <S.Form onSubmit={saveCategory}>
                  <h3>{category.id ? 'Editar categoria' : 'Nova categoria'}</h3>
                  <label>Nome<input required maxLength={50} value={category.name} onChange={(e) => setCategory((x) => ({ ...x, name: e.target.value }))} /></label>
                  <label>Descrição<textarea rows={4} maxLength={255} value={category.description} onChange={(e) => setCategory((x) => ({ ...x, description: e.target.value }))} /></label>
                  <S.Checks><label><input type="checkbox" checked={category.active} onChange={(e) => setCategory((x) => ({ ...x, active: e.target.checked }))} />Ativa</label></S.Checks>
                  <S.FormActions>{category.id ? <button type="button" onClick={() => setCategory({ id: 0, name: '', description: '', active: true })}>Nova</button> : null}<button className="primary" disabled={saving || categoryBusy}><Save />Salvar categoria</button></S.FormActions>
                </S.Form>
              </S.Split>
            ) : tab === 'combos' ? (
              <S.Split>
                <S.List>
                  <S.SectionTitle><div><small>OFERTAS</small><h3>Combos</h3></div><span>{data.combos.length}</span></S.SectionTitle>
                  {data.combos.map((item) => <button key={item.id} type="button" onClick={() => editCombo(item)}><span><b>{item.name}</b><small>{item.active === false ? 'Inativo' : 'Ativo'}</small></span><strong>{Number(item.price || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></button>)}
                </S.List>
                <S.Form onSubmit={saveCombo}>
                  <h3>{combo.id ? 'Editar combo' : 'Novo combo'}</h3>
                  <label>Nome<input required minLength={2} value={combo.name} onChange={(e) => setCombo((x) => ({ ...x, name: e.target.value }))} /></label>
                  <label>Descrição<textarea rows={3} value={combo.description} onChange={(e) => setCombo((x) => ({ ...x, description: e.target.value }))} /></label>
                  <label>Preço<input required type="number" min="0.01" step="0.01" value={combo.price} onChange={(e) => setCombo((x) => ({ ...x, price: e.target.value }))} /></label>
                  {renderImageInput('combo', combo.image)}
                  <fieldset><legend>Produtos incluídos</legend>{standardProducts.map((item) => <label key={item.id} className="choice"><input type="checkbox" checked={combo.productIds.includes(item.id)} onChange={(e) => setCombo((x) => ({ ...x, productIds: e.target.checked ? [...x.productIds, item.id] : x.productIds.filter((id) => id !== item.id) }))} />{item.name}</label>)}</fieldset>
                  <S.FormActions>{combo.id ? <button type="button" onClick={() => setCombo({ id: 0, name: '', description: '', price: '', image: '', productIds: [], active: true, featured: true })}>Novo</button> : null}<button className="primary" disabled={saving}><Save />Salvar combo</button></S.FormActions>
                </S.Form>
              </S.Split>
            ) : tab === 'banners' ? (
              <S.Split>
                <S.List>
                  <S.SectionTitle><div><small>HOME</small><h3>Banners</h3></div><span>{data.banners.length}</span></S.SectionTitle>
                  {data.banners.map((item) => <button key={item.id} type="button" onClick={() => setBanner({ id: item.id, title: item.title, highlight: item.highlight || '', description: item.description || '', buttonLabel: item.buttonLabel || 'Ver cardápio', image: item.image || '', active: item.active !== false })}><span><b>{item.title}</b><small>{item.active === false ? 'Inativo' : 'Ativo'}</small></span></button>)}
                </S.List>
                <S.Form onSubmit={saveBanner}>
                  <h3>{banner.id ? 'Editar banner' : 'Novo banner'}</h3>
                  <label>Título<input required value={banner.title} onChange={(e) => setBanner((x) => ({ ...x, title: e.target.value }))} /></label>
                  <label>Destaque<input value={banner.highlight} onChange={(e) => setBanner((x) => ({ ...x, highlight: e.target.value }))} /></label>
                  <label>Descrição<textarea rows={3} value={banner.description} onChange={(e) => setBanner((x) => ({ ...x, description: e.target.value }))} /></label>
                  <label>Texto do botão<input value={banner.buttonLabel} onChange={(e) => setBanner((x) => ({ ...x, buttonLabel: e.target.value }))} /></label>
                  {renderImageInput('banner', banner.image, true)}
                  <S.Checks><label><input type="checkbox" checked={banner.active} onChange={(e) => setBanner((x) => ({ ...x, active: e.target.checked }))} />Ativo</label></S.Checks>
                  <S.FormActions>{banner.id ? <button type="button" onClick={() => setBanner({ id: 0, title: '', highlight: '', description: '', buttonLabel: 'Ver cardápio', image: '', active: true })}>Novo</button> : null}<button className="primary" disabled={saving}><Save />Salvar banner</button></S.FormActions>
                </S.Form>
              </S.Split>
            ) : tab === 'printing' ? (
              <ManagedPrinterSettings restaurantId={restaurantId} />
            ) : (
              <S.Form className="settings" onSubmit={saveSettings}>
                <S.SectionTitle><div><small>DADOS SEGUROS</small><h3>Configurações do restaurante</h3></div></S.SectionTitle>
                <p className="security-note">Credenciais de pagamento, tokens, senhas, MFA e dados bancários não ficam disponíveis neste workspace.</p>
                <S.Two>
                  <label>Nome do restaurante<input required value={settings.restaurantName} onChange={(e) => setSettings((x) => ({ ...x, restaurantName: e.target.value }))} /></label>
                  <label>WhatsApp comercial<input value={settings.whatsapp} onChange={(e) => setSettings((x) => ({ ...x, whatsapp: e.target.value }))} /></label>
                </S.Two>
                {renderImageInput('logo', settings.restaurantLogo)}
                {renderImageInput('cover', settings.restaurantCoverImage)}
                <label>Descrição<textarea rows={3} value={settings.restaurantDescription} onChange={(e) => setSettings((x) => ({ ...x, restaurantDescription: e.target.value }))} /></label>
                <S.Two>
                  <label>Endereço<input value={settings.restaurantAddress} onChange={(e) => setSettings((x) => ({ ...x, restaurantAddress: e.target.value }))} /></label>
                  <label>Número<input value={settings.restaurantAddressNumber} onChange={(e) => setSettings((x) => ({ ...x, restaurantAddressNumber: e.target.value }))} /></label>
                  <label>Bairro<input value={settings.restaurantAddressDistrict} onChange={(e) => setSettings((x) => ({ ...x, restaurantAddressDistrict: e.target.value }))} /></label>
                  <label>Cidade<input value={settings.restaurantCity} onChange={(e) => setSettings((x) => ({ ...x, restaurantCity: e.target.value }))} /></label>
                  <label>UF<input maxLength={2} value={settings.restaurantState} onChange={(e) => setSettings((x) => ({ ...x, restaurantState: e.target.value }))} /></label>
                  <label>CEP<input value={settings.restaurantZipCode} onChange={(e) => setSettings((x) => ({ ...x, restaurantZipCode: e.target.value }))} /></label>
                  <label>Entrega mínima (min)<input type="number" min="1" max="240" value={settings.deliveryTimeMin} onChange={(e) => setSettings((x) => ({ ...x, deliveryTimeMin: e.target.value }))} /></label>
                  <label>Entrega máxima (min)<input type="number" min="1" max="240" value={settings.deliveryTimeMax} onChange={(e) => setSettings((x) => ({ ...x, deliveryTimeMax: e.target.value }))} /></label>
                  <label>Taxa de entrega<input type="number" min="0" step="0.01" value={settings.deliveryFee} onChange={(e) => setSettings((x) => ({ ...x, deliveryFee: e.target.value }))} /></label>
                  <label>Pedido mínimo<input type="number" min="0" step="0.01" value={settings.minimumOrder} onChange={(e) => setSettings((x) => ({ ...x, minimumOrder: e.target.value }))} /></label>
                  <label>Frete grátis acima de<input type="number" min="0" step="0.01" value={settings.freeShippingMinimum} onChange={(e) => setSettings((x) => ({ ...x, freeShippingMinimum: e.target.value }))} /></label>
                  <label>Cor principal<input type="color" value={settings.primaryColor} onChange={(e) => setSettings((x) => ({ ...x, primaryColor: e.target.value }))} /></label>
                </S.Two>
                <label>Instagram<input value={settings.instagram} onChange={(e) => setSettings((x) => ({ ...x, instagram: e.target.value }))} /></label>
                <S.SectionTitle><div><small>OPERAÇÃO</small><h3>Funcionamento e pedidos</h3></div></S.SectionTitle>
                <S.Checks>
                  <label><input type="checkbox" checked={settings.isOpenForOrders} onChange={(e) => setSettings((x) => ({ ...x, isOpenForOrders: e.target.checked }))} />Aberto para pedidos</label>
                  <label><input type="checkbox" checked={settings.autoAcceptOrders} onChange={(e) => setSettings((x) => ({ ...x, autoAcceptOrders: e.target.checked }))} />Aceitar pedidos automaticamente</label>
                  <label><input type="checkbox" checked={settings.acceptsDelivery} onChange={(e) => setSettings((x) => ({ ...x, acceptsDelivery: e.target.checked }))} />Permitir delivery</label>
                  <label><input type="checkbox" checked={settings.acceptsPickup} onChange={(e) => setSettings((x) => ({ ...x, acceptsPickup: e.target.checked }))} />Permitir retirada</label>
                </S.Checks>
                <label>Máximo de pedidos simultâneos<input type="number" min="1" max="500" required value={settings.maxConcurrentOrders} onChange={(e) => setSettings((x) => ({ ...x, maxConcurrentOrders: e.target.value }))} /></label>
                <S.SectionTitle><div><small>FUNCIONAMENTO</small><h3>Horários da semana</h3></div></S.SectionTitle>
                <p>Defina os horários de atendimento. Os dias desativados permanecerão fechados. Salvar os sete dias ativa a programação semanal.</p>
                {(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const).map((id, index) => {
                  const names = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
                  const entry = settings.businessHours.find((day) => day.id === id) || { id, enabled: false, openingTime: '08:00', closingTime: '22:00' };
                  const change = (update: Partial<typeof entry>) => setSettings((current) => ({
                    ...current,
                    businessHours: (['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const).map((key) => ({
                      ...(current.businessHours.find((day) => day.id === key) || { id: key, enabled: false, openingTime: '08:00', closingTime: '22:00' }),
                      ...(key === id ? update : {}),
                    })),
                  }));
                  return <S.Two key={id}>
                    <label><input type="checkbox" checked={entry.enabled} onChange={(e) => change({ enabled: e.target.checked })} /> {names[index]}</label>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <label>Abertura<input type="time" value={entry.openingTime} onChange={(e) => change({ openingTime: e.target.value })} /></label>
                      <label>Fechamento<input type="time" value={entry.closingTime} onChange={(e) => change({ closingTime: e.target.value })} /></label>
                    </div>
                  </S.Two>;
                })}
                <S.SectionTitle><div><small>MARKETING</small><h3>Redes sociais e busca</h3></div></S.SectionTitle>
                <S.Two>
                  <label>Facebook<input value={settings.facebook} onChange={(e) => setSettings((x) => ({ ...x, facebook: e.target.value }))} /></label>
                  <label>TikTok<input value={settings.tiktok} onChange={(e) => setSettings((x) => ({ ...x, tiktok: e.target.value }))} /></label>
                  <label>YouTube<input value={settings.youtube} onChange={(e) => setSettings((x) => ({ ...x, youtube: e.target.value }))} /></label>
                  <label>Fonte<input value={settings.fontFamily} onChange={(e) => setSettings((x) => ({ ...x, fontFamily: e.target.value }))} /></label>
                  <label>Título SEO<input maxLength={120} value={settings.seoTitle} onChange={(e) => setSettings((x) => ({ ...x, seoTitle: e.target.value }))} /></label>
                  <label>Descrição SEO<input maxLength={300} value={settings.seoDescription} onChange={(e) => setSettings((x) => ({ ...x, seoDescription: e.target.value }))} /></label>
                </S.Two>
                <S.FormActions><button className="primary" disabled={saving}><Save />{saving ? 'Salvando...' : 'Salvar configurações'}</button></S.FormActions>
              </S.Form>
            )}
          </S.Body>
        ) : null}
      </S.Dialog>
      {customProductEditor ? (
        customProductEditor === 'NEW' || isManagedSimpleCustomProduct(customProductEditor) ? (
          <ManagedCustomProductWizard
            product={customProductEditor === 'NEW' ? null : customProductEditor}
            categories={managedCategories}
            ingredients={managedIngredients}
            products={managedProducts}
            close={() => setCustomProductEditor(null)}
            save={saveCustomProduct}
          />
        ) : (
          <ProductDrawer
            product={customProductEditor}
            categories={managedCategories}
            ingredients={managedIngredients}
            products={managedProducts}
            enableTemplates={false}
            createIngredient={createManagedIngredient}
            close={() => setCustomProductEditor(null)}
            save={saveCustomProduct}
          />
        )
      ) : null}
    </S.Backdrop>
  );
}
