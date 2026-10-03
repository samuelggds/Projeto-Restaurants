import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ClipboardEvent,
  type FormEvent,
} from 'react';
import {
  Boxes,
  Image,
  Loader2,
  PackagePlus,
  RefreshCw,
  Save,
  Upload,
  Settings2,
  Tags,
  X,
} from 'lucide-react';
import superAdminService from '../../../Services/superAdminService';
import { ProductDrawer } from '../../admin/components/ProductDrawer';
import type {
  AdminCategory,
  AdminIngredient,
  AdminProduct,
  AdminProductOptionGroup,
  AdminProductCompositionItem,
  AdminProductPortionConfiguration,
} from '../../admin/types';
import { createPersistentImageDataUrl } from '../../../utils/persistentImage';
import * as S from './ManagedRestaurantWorkspace.styles';

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

type Tab = 'products' | 'categories' | 'combos' | 'banners' | 'settings';

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

type ManagedImageTarget = 'product' | 'combo' | 'banner';

const managedImageLabels: Record<ManagedImageTarget, string> = {
  product: 'produto',
  combo: 'combo',
  banner: 'banner',
};

export function ManagedRestaurantWorkspace({
  restaurantId,
  onClose,
}: {
  restaurantId: number;
  onClose: () => void;
}) {
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
        active: item.active !== false,
      })),
    [data?.categories],
  );

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
    if (saving) return;
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
    setBanner((current) => ({ ...current, image: value }));
  }, []);

  const processManagedImageFile = useCallback(
    async (target: ManagedImageTarget, file?: File | null) => {
      if (!file) return;
      setError('');
      setSuccess('');
      try {
        const image = await createPersistentImageDataUrl(
          file,
          target === 'banner' ? 1600 : 1024,
        );
        setManagedImage(target, image);
        setSuccess(`Imagem do ${managedImageLabels[target]} adicionada.`);
      } catch (imageError) {
        setError(requestError(imageError));
      }
    },
    [setManagedImage],
  );

  const pasteManagedImage = useCallback(
    async (target: ManagedImageTarget, event: ClipboardEvent<HTMLElement>) => {
      const imageItem = Array.from(event.clipboardData.items).find(
        (item) => item.kind === 'file' && item.type.startsWith('image/'),
      );
      const imageFile = imageItem?.getAsFile();
      if (imageFile) {
        event.preventDefault();
        await processManagedImageFile(target, imageFile);
        return;
      }

      const pastedText = event.clipboardData.getData('text/plain').trim();
      if (/^https:\/\//iu.test(pastedText)) {
        event.preventDefault();
        setManagedImage(target, pastedText);
        setError('');
        setSuccess(`Link da imagem do ${managedImageLabels[target]} adicionado.`);
      }
    },
    [processManagedImageFile, setManagedImage],
  );

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
    };
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

  const renderImageInput = (
    target: ManagedImageTarget,
    value: string,
    required = false,
  ) => (
    <div>
      <label>
        Link da imagem
        <input
          required={required && !value}
          type="url"
          inputMode="url"
          placeholder="https://exemplo.com/imagem.jpg"
          value={value.startsWith('data:image/') ? '' : value}
          onChange={(event) => setManagedImage(target, event.target.value)}
          onPaste={(event) => void pasteManagedImage(target, event)}
        />
      </label>

      <div
        role="button"
        tabIndex={0}
        aria-label={`Colar imagem do ${managedImageLabels[target]}`}
        onPaste={(event) => void pasteManagedImage(target, event)}
        style={{
          marginTop: 8,
          padding: 14,
          border: '1px dashed #cfc7c3',
          borderRadius: 10,
          background: '#fffaf8',
          textAlign: 'center',
          cursor: 'text',
        }}
      >
        <strong>Cole uma imagem aqui com Ctrl+V</strong>
        <div>
          <small>Ex.: botão direito na imagem → Copiar imagem → volte aqui → Ctrl+V.</small>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        <label style={{ cursor: 'pointer' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 12px',
              border: '1px solid #d8d8d8',
              borderRadius: 8,
              fontWeight: 700,
            }}
          >
            <Upload size={16} /> Escolher arquivo
          </span>
          <input
            hidden
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.currentTarget.value = '';
              void processManagedImageFile(target, file);
            }}
          />
        </label>
        {value ? (
          <button type="button" onClick={() => setManagedImage(target, '')}>
            Remover imagem
          </button>
        ) : null}
      </div>

      <small>JPG, PNG ou WebP, máximo 5 MB. Links devem usar HTTPS.</small>
      {value.startsWith('data:image/') ? (
        <small style={{ display: 'block' }}>Imagem copiada/enviada pronta para salvar.</small>
      ) : null}
    </div>
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
                  {data.categories.map((item) => <button key={item.id} type="button" onClick={() => setCategory({ id: item.id, name: item.name, description: item.description || '', active: item.active !== false })}><span><b>{item.name}</b><small>{item.active === false ? 'Inativa' : 'Ativa'}</small></span></button>)}
                </S.List>
                <S.Form onSubmit={saveCategory}>
                  <h3>{category.id ? 'Editar categoria' : 'Nova categoria'}</h3>
                  <label>Nome<input required maxLength={50} value={category.name} onChange={(e) => setCategory((x) => ({ ...x, name: e.target.value }))} /></label>
                  <label>Descrição<textarea rows={4} maxLength={255} value={category.description} onChange={(e) => setCategory((x) => ({ ...x, description: e.target.value }))} /></label>
                  <S.Checks><label><input type="checkbox" checked={category.active} onChange={(e) => setCategory((x) => ({ ...x, active: e.target.checked }))} />Ativa</label></S.Checks>
                  <S.FormActions>{category.id ? <button type="button" onClick={() => setCategory({ id: 0, name: '', description: '', active: true })}>Nova</button> : null}<button className="primary" disabled={saving}><Save />Salvar categoria</button></S.FormActions>
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
            ) : (
              <S.Form className="settings" onSubmit={saveSettings}>
                <S.SectionTitle><div><small>DADOS SEGUROS</small><h3>Configurações do restaurante</h3></div></S.SectionTitle>
                <p className="security-note">Credenciais de pagamento, tokens, senhas, MFA e dados bancários não ficam disponíveis neste workspace.</p>
                <S.Two>
                  <label>Nome do restaurante<input required value={settings.restaurantName} onChange={(e) => setSettings((x) => ({ ...x, restaurantName: e.target.value }))} /></label>
                  <label>WhatsApp comercial<input value={settings.whatsapp} onChange={(e) => setSettings((x) => ({ ...x, whatsapp: e.target.value }))} /></label>
                </S.Two>
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
                <S.FormActions><button className="primary" disabled={saving}><Save />{saving ? 'Salvando...' : 'Salvar configurações'}</button></S.FormActions>
              </S.Form>
            )}
          </S.Body>
        ) : null}
      </S.Dialog>
      {customProductEditor ? (
        <ProductDrawer
          product={customProductEditor === 'NEW' ? null : customProductEditor}
          categories={managedCategories}
          ingredients={managedIngredients}
          products={managedProducts}
          enableTemplates={false}
          createIngredient={createManagedIngredient}
          close={() => setCustomProductEditor(null)}
          save={saveCustomProduct}
        />
      ) : null}
    </S.Backdrop>
  );
}
