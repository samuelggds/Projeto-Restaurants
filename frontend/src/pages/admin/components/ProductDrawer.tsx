import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  ChevronRight,
  Boxes,
  ImagePlus,
  Layers3,
  PackageOpen,
  Plus,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { createPersistentImageDataUrl } from '../../../utils/persistentImage';
import productConfigurationTemplatesService from '../../../Services/productConfigurationTemplatesService';
import * as S from '../Admin.styles';
import {
  ProductConfigurationWorkspace,
  type PendingCategoryChange,
} from './ProductConfigurationWorkspace';
import type {
  AdminCategory,
  AdminIngredient,
  AdminProduct,
  AdminProductCompositionItem,
  AdminProductConfigurationTemplate,
  AdminProductOptionGroup,
  AdminProductPortionConfiguration,
} from '../types';
import {
  normalizeOptionGroup,
  validateOptionGroups,
} from '../domain/productCustomizationValidation';
import {
  MIXED_INGREDIENT_CATEGORY,
  groupIngredientsByCategory,
  incompatibleOptionsForCategory,
  inferGroupIngredientCategory,
  ingredientBelongsToCategory,
  listIngredientCategories,
} from '../domain/ingredientCategoryGroups';
import {
  isProductActiveFromStock,
  isUnlimitedStock,
  normalizeProductStock,
} from '../domain/productStock';

type ProductDrawerProps = {
  product: AdminProduct | null;
  categories: AdminCategory[];
  ingredients: AdminIngredient[];
  createIngredient?: (
    ingredient: Omit<AdminIngredient, 'id'>,
  ) => AdminIngredient | void | Promise<AdminIngredient | void>;
  close: () => void;
  save: (product: AdminProduct) => Promise<void>;
};

const emptyGroup = (): AdminProductOptionGroup => ({
  name: '',
  description: '',
  required: true,
  selectionType: 'SINGLE',
  minSelections: 1,
  maxSelections: 1,
  options: [],
});

const groupPreset = (preset: 'SINGLE' | 'EXTRAS' | 'PORTIONS'): AdminProductOptionGroup => {
  if (preset === 'SINGLE') {
    return { ...emptyGroup(), name: 'Escolha uma opção' };
  }
  if (preset === 'PORTIONS') {
    return {
      ...emptyGroup(),
      name: 'Opções por porção',
      required: false,
      selectionType: 'MULTIPLE',
      minSelections: 0,
      maxSelections: 1,
    };
  }
  return {
    ...emptyGroup(),
    name: 'Adicionais',
    required: false,
    selectionType: 'MULTIPLE',
    minSelections: 0,
    maxSelections: 5,
  };
};

const money = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function ProductDrawer({
  product,
  categories,
  ingredients,
  createIngredient,
  close,
  save,
}: ProductDrawerProps) {
  const [name, setName] = useState(product?.name ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [image, setImage] = useState(product?.image ?? '');
  const [price, setPrice] = useState(String(product?.price ?? ''));
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? categories[0]?.id ?? 0);
  const [stock, setStock] = useState(String(product?.stock ?? ''));
  const [unlimitedStock, setUnlimitedStock] = useState(isUnlimitedStock(product?.stock));
  const [saleMode, setSaleMode] = useState<'COMPLETE' | 'BUILDABLE'>(
    product?.saleMode ?? 'COMPLETE',
  );
  const [confirmDiscardConfiguration, setConfirmDiscardConfiguration] = useState(false);
  const [templates, setTemplates] = useState<AdminProductConfigurationTemplate[]>([]);
  const [templateName, setTemplateName] = useState('');
  const [templateBusy, setTemplateBusy] = useState(false);
  const [inlineIngredientGroup, setInlineIngredientGroup] = useState<number | null>(null);
  const [inlineIngredientName, setInlineIngredientName] = useState('');
  const [inlineIngredientPrice, setInlineIngredientPrice] = useState('0');
  const [inlineIngredientBusy, setInlineIngredientBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [optionGroups, setOptionGroups] = useState<AdminProductOptionGroup[]>(
    () => product?.optionGroups?.map((group) => ({ ...group, options: [...group.options] })) ?? [],
  );
  const [compositionItems, setCompositionItems] = useState<AdminProductCompositionItem[]>(
    () => product?.compositionItems?.map((item) => ({ ...item })) ?? [],
  );
  const [portionConfiguration, setPortionConfiguration] =
    useState<AdminProductPortionConfiguration | null>(() =>
      product?.portionConfiguration ? { ...product.portionConfiguration } : null,
    );
  const [groupCategories, setGroupCategories] = useState<string[]>(() =>
    (product?.optionGroups || []).map(
      (group) => inferGroupIngredientCategory(group, ingredients).value,
    ),
  );
  const [pendingCategoryChange, setPendingCategoryChange] = useState<PendingCategoryChange | null>(
    null,
  );
  const activeIngredients = useMemo(
    () => ingredients.filter((ingredient) => ingredient.active),
    [ingredients],
  );
  const ingredientCategories = useMemo(() => listIngredientCategories(ingredients), [ingredients]);
  const inlineDuplicate = useMemo(() => {
    const normalizedName = inlineIngredientName.trim().toLocaleLowerCase('pt-BR');
    if (!normalizedName) return undefined;
    return ingredients.find(
      (ingredient) => ingredient.name.trim().toLocaleLowerCase('pt-BR') === normalizedName,
    );
  }, [ingredients, inlineIngredientName]);
  const activeIngredientSections = useMemo(
    () => groupIngredientsByCategory(activeIngredients),
    [activeIngredients],
  );
  const selectedProductCategory = categories.find((item) => item.id === categoryId)?.name ?? '';
  const linkedOptionCount = optionGroups.reduce((total, group) => total + group.options.length, 0);
  const readyGroupCount = optionGroups.filter(
    (group, index) =>
      group.name.trim() &&
      group.options.length > 0 &&
      groupCategories[index] &&
      groupCategories[index] !== MIXED_INGREDIENT_CATEGORY,
  ).length;
  const basicInformationReady = Boolean(name.trim() && Number(price) >= 0 && categoryId);
  const hasPersistedConfiguration = Boolean(
    product?.saleMode === 'BUILDABLE' &&
    (product.optionGroups?.length ||
      product.compositionItems?.length ||
      product.portionConfiguration),
  );

  useEffect(() => {
    let active = true;
    productConfigurationTemplatesService
      .list()
      .then((values) => {
        if (active) setTemplates(values);
      })
      .catch(() => {
        if (active) setTemplates([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const updateGroup = (
    groupIndex: number,
    update: (group: AdminProductOptionGroup) => AdminProductOptionGroup,
  ) => {
    setOptionGroups((current) =>
      current.map((group, index) => (index === groupIndex ? update(group) : group)),
    );
  };

  const toggleGroupIngredient = (groupIndex: number, ingredientId: number, selected: boolean) => {
    const sourceCategory = groupCategories[groupIndex];
    const ingredient = ingredients.find((item) => item.id === ingredientId);
    if (
      selected &&
      sourceCategory &&
      sourceCategory !== MIXED_INGREDIENT_CATEGORY &&
      (!ingredient || !ingredientBelongsToCategory(ingredient, sourceCategory))
    ) {
      return;
    }
    updateGroup(groupIndex, (group) => ({
      ...group,
      options: selected
        ? group.options.some((option) => option.ingredientId === ingredientId)
          ? group.options
          : [
              ...group.options,
              {
                ingredientId,
                additionalPrice: Number(ingredient?.price ?? 0),
                pricingMode: 'ADDITIVE',
                absolutePrice: null,
                allowQuantity: false,
                minQuantity: 1,
                maxQuantity: 1,
                defaultQuantity: 1,
                defaultSelected: false,
                locked: false,
                active: true,
              },
            ]
        : group.options.filter((option) => option.ingredientId !== ingredientId),
    }));
  };

  const updateGroupOption = (
    groupIndex: number,
    ingredientId: number,
    patch: Partial<AdminProductOptionGroup['options'][number]>,
  ) => {
    updateGroup(groupIndex, (group) => ({
      ...group,
      options: group.options.map((option) =>
        option.ingredientId === ingredientId ? { ...option, ...patch } : option,
      ),
    }));
  };

  const addGroup = () => {
    setOptionGroups((current) => [...current, emptyGroup()]);
    setGroupCategories((current) => [...current, '']);
    setPendingCategoryChange(null);
  };

  const addPreset = (preset: 'SINGLE' | 'EXTRAS' | 'PORTIONS') => {
    const group = groupPreset(preset);
    setOptionGroups((current) => [...current, group]);
    setGroupCategories((current) => [...current, '']);
    if (preset === 'PORTIONS') {
      setPortionConfiguration({
        enabled: true,
        optionGroupName: group.name,
        minPortions: 2,
        maxPortions: 2,
        pricingStrategy: 'HIGHEST',
        allowPortionObservations: true,
      });
    }
    setPendingCategoryChange(null);
  };

  const moveGroup = (groupIndex: number, direction: -1 | 1) => {
    const targetIndex = groupIndex + direction;
    if (targetIndex < 0 || targetIndex >= optionGroups.length) return;
    setOptionGroups((current) => {
      const next = [...current];
      [next[groupIndex], next[targetIndex]] = [next[targetIndex], next[groupIndex]];
      return next;
    });
    setGroupCategories((current) => {
      const next = [...current];
      [next[groupIndex], next[targetIndex]] = [next[targetIndex], next[groupIndex]];
      return next;
    });
    setPendingCategoryChange(null);
  };

  const toggleCompositionIngredient = (ingredientId: number, selected: boolean) => {
    setCompositionItems((current) =>
      selected
        ? current.some((item) => item.ingredientId === ingredientId)
          ? current
          : [...current, { ingredientId, removable: false, active: true }]
        : current.filter((item) => item.ingredientId !== ingredientId),
    );
  };

  const applyTemplate = (template: AdminProductConfigurationTemplate) => {
    const groups = template.configuration.optionGroups.map((group) => ({
      ...group,
      id: undefined,
      options: group.options.map((option) => ({ ...option, id: undefined })),
    }));
    setOptionGroups(groups);
    setGroupCategories(
      groups.map((group) => inferGroupIngredientCategory(group, ingredients).value),
    );
    setCompositionItems(
      template.configuration.compositionItems.map((item) => ({ ...item, id: undefined })),
    );
    setPortionConfiguration(
      template.configuration.portionConfiguration
        ? { ...template.configuration.portionConfiguration }
        : null,
    );
    setSaleMode('BUILDABLE');
    setPendingCategoryChange(null);
    setError('');
  };

  const saveTemplate = async () => {
    const normalizedName = templateName.trim();
    if (!normalizedName) {
      setError('Informe um nome para salvar este modelo.');
      return;
    }
    const normalizedGroups = optionGroups.map(normalizeOptionGroup);
    const templateErrors = validateOptionGroups(normalizedGroups, ingredients);
    if (templateErrors.length) {
      setError(templateErrors[0]);
      return;
    }
    setTemplateBusy(true);
    setError('');
    try {
      const created = await productConfigurationTemplatesService.create({
        name: normalizedName,
        configuration: {
          optionGroups: normalizedGroups,
          compositionItems,
          portionConfiguration,
        },
      });
      setTemplates((current) =>
        [...current, created].sort((left, right) => left.name.localeCompare(right.name)),
      );
      setTemplateName('');
    } catch (templateError) {
      const apiError = templateError as {
        response?: { data?: { error?: string; message?: string } };
      };
      setError(
        apiError.response?.data?.error ||
          apiError.response?.data?.message ||
          'Não foi possível salvar o modelo.',
      );
    } finally {
      setTemplateBusy(false);
    }
  };

  const deactivateTemplate = async (templateId: number) => {
    setTemplateBusy(true);
    setError('');
    try {
      await productConfigurationTemplatesService.deactivate(templateId);
      setTemplates((current) => current.filter((template) => template.id !== templateId));
    } catch {
      setError('Não foi possível remover o modelo.');
    } finally {
      setTemplateBusy(false);
    }
  };

  const selectInlineIngredient = (groupIndex: number, ingredient: AdminIngredient) => {
    updateGroup(groupIndex, (group) => ({
      ...group,
      options: group.options.some((option) => option.ingredientId === ingredient.id)
        ? group.options
        : [
            ...group.options,
            {
              ingredientId: ingredient.id,
              additionalPrice: ingredient.price,
              pricingMode: 'ADDITIVE',
              absolutePrice: null,
              allowQuantity: false,
              minQuantity: 1,
              maxQuantity: 1,
              defaultQuantity: 1,
              defaultSelected: false,
              locked: false,
              active: true,
            },
          ],
    }));
    setInlineIngredientGroup(null);
    setInlineIngredientName('');
    setInlineIngredientPrice('0');
  };

  const createInlineIngredient = async (groupIndex: number) => {
    const sourceCategory = groupCategories[groupIndex];
    const normalizedName = inlineIngredientName.trim();
    const numericPrice = Number(inlineIngredientPrice);
    if (!sourceCategory || sourceCategory === MIXED_INGREDIENT_CATEGORY) {
      setError('Escolha a categoria-fonte da etapa antes de criar uma opção.');
      return;
    }
    if (!normalizedName || !Number.isFinite(numericPrice) || numericPrice < 0) {
      setError('Informe nome e valor igual ou maior que zero para a nova opção.');
      return;
    }
    if (inlineDuplicate) {
      if (!inlineDuplicate.active) {
        setError('Já existe um ingrediente inativo com este nome. Reative-o na aba Ingredientes.');
        return;
      }
      if (!ingredientBelongsToCategory(inlineDuplicate, sourceCategory)) {
        setError(`“${inlineDuplicate.name}” já existe na categoria ${inlineDuplicate.category}.`);
        return;
      }
      selectInlineIngredient(groupIndex, inlineDuplicate);
      return;
    }
    if (!createIngredient) return;
    setInlineIngredientBusy(true);
    setError('');
    try {
      const created = await createIngredient({
        name: normalizedName,
        price: numericPrice,
        category: sourceCategory,
        active: true,
      });
      if (created) selectInlineIngredient(groupIndex, created);
    } catch (createError) {
      const apiError = createError as {
        response?: { data?: { error?: string; message?: string } };
      };
      setError(
        apiError.response?.data?.error ||
          apiError.response?.data?.message ||
          'Não foi possível criar a opção.',
      );
    } finally {
      setInlineIngredientBusy(false);
    }
  };

  const removeGroup = (groupIndex: number) => {
    setOptionGroups((current) => current.filter((_, index) => index !== groupIndex));
    setGroupCategories((current) => current.filter((_, index) => index !== groupIndex));
    setPendingCategoryChange(null);
  };

  const selectGroupCategory = (groupIndex: number, nextCategory: string) => {
    if (!nextCategory || nextCategory === MIXED_INGREDIENT_CATEGORY) return;
    const group = optionGroups[groupIndex];
    if (!group || groupCategories[groupIndex] === nextCategory) return;
    const incompatible = incompatibleOptionsForCategory(group.options, ingredients, nextCategory);
    if (!incompatible.length) {
      setGroupCategories((current) =>
        current.map((category, index) => (index === groupIndex ? nextCategory : category)),
      );
      setPendingCategoryChange(null);
      return;
    }

    const ingredientsById = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));
    setPendingCategoryChange({
      groupIndex,
      nextCategory,
      incompatibleIds: incompatible.map((option) => option.ingredientId),
      incompatibleNames: incompatible.map(
        (option) =>
          ingredientsById.get(option.ingredientId)?.name ||
          `Ingrediente indisponível #${option.ingredientId}`,
      ),
    });
  };

  const confirmGroupCategoryChange = () => {
    if (!pendingCategoryChange) return;
    const { groupIndex, nextCategory, incompatibleIds } = pendingCategoryChange;
    const removedIds = new Set(incompatibleIds);
    updateGroup(groupIndex, (group) => {
      const options = group.options.filter((option) => !removedIds.has(option.ingredientId));
      const maxSelections =
        group.selectionType === 'SINGLE'
          ? 1
          : Math.min(Math.max(1, group.maxSelections), Math.max(1, options.length));
      const minSelections = group.required
        ? Math.min(Math.max(1, group.minSelections), options.length)
        : 0;
      return { ...group, options, minSelections, maxSelections };
    });
    setGroupCategories((current) =>
      current.map((category, index) => (index === groupIndex ? nextCategory : category)),
    );
    setPendingCategoryChange(null);
  };

  const uploadImage = async (file?: File) => {
    if (!file) return;
    setError('');
    try {
      setImage(await createPersistentImageDataUrl(file, 960));
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : 'Não foi possível carregar a imagem.',
      );
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    const numericPrice = Number(price);
    if (!name.trim() || !Number.isFinite(numericPrice) || numericPrice < 0 || !categoryId) {
      setError('Preencha nome, preço base igual ou maior que zero e categoria.');
      return;
    }

    let normalizedGroups: AdminProductOptionGroup[] = [];
    if (saleMode === 'BUILDABLE') {
      const unresolvedCategoryIndex = optionGroups.findIndex(
        (_, index) =>
          !groupCategories[index] || groupCategories[index] === MIXED_INGREDIENT_CATEGORY,
      );
      if (unresolvedCategoryIndex >= 0) {
        setError(
          `Escolha uma categoria de ingredientes no grupo ${unresolvedCategoryIndex + 1} antes de salvar.`,
        );
        return;
      }

      normalizedGroups = optionGroups.map(normalizeOptionGroup);
      const customizationErrors = validateOptionGroups(normalizedGroups, ingredients);
      if (customizationErrors.length) {
        setError(customizationErrors[0]);
        return;
      }
      if (
        portionConfiguration?.enabled &&
        !normalizedGroups.some((group) => group.name === portionConfiguration.optionGroupName)
      ) {
        setError('Escolha uma etapa existente para definir as opções de cada porção.');
        return;
      }
      if (
        portionConfiguration?.enabled &&
        portionConfiguration.minPortions > portionConfiguration.maxPortions
      ) {
        setError('O mínimo de porções não pode ser maior que o máximo.');
        return;
      }
    } else if (hasPersistedConfiguration && !confirmDiscardConfiguration) {
      setError('Confirme a remoção da personalização antes de salvar como produto simples.');
      return;
    }

    setBusy(true);
    try {
      const normalizedStock = normalizeProductStock(stock, unlimitedStock);
      await save({
        id: product?.id ?? '',
        name: name.trim(),
        description: description.trim(),
        image: image.trim(),
        price: numericPrice,
        categoryId,
        category: categories.find((item) => item.id === categoryId)?.name ?? '',
        stock: normalizedStock,
        active: isProductActiveFromStock(normalizedStock),
        saleMode,
        configurationVersion: product?.configurationVersion,
        confirmDiscardConfiguration:
          saleMode === 'COMPLETE' && hasPersistedConfiguration
            ? confirmDiscardConfiguration
            : undefined,
        optionGroups: saleMode === 'BUILDABLE' ? normalizedGroups : [],
        compositionItems: saleMode === 'BUILDABLE' ? compositionItems : [],
        portionConfiguration: saleMode === 'BUILDABLE' ? portionConfiguration : null,
      });
    } catch (saveError) {
      const apiError = saveError as {
        response?: { data?: { error?: string; message?: string } };
      };
      setError(
        apiError.response?.data?.error ||
          apiError.response?.data?.message ||
          (saveError instanceof Error ? saveError.message : 'Não foi possível salvar o produto.'),
      );
      setBusy(false);
    }
  };

  return (
    <S.Overlay
      aria-labelledby="product-form-title"
      aria-modal="true"
      role="dialog"
      onMouseDown={(event) => event.target === event.currentTarget && close()}
    >
      <S.ProductFormDrawer onSubmit={(event) => void submit(event)}>
        <header className="drawer-header">
          <div className="drawer-title">
            <span>
              <Sparkles /> {saleMode === 'BUILDABLE' ? 'PRODUTO PERSONALIZÁVEL' : 'PRODUTO PRONTO'}
            </span>
            <h2 id="product-form-title">{product ? 'Editar produto' : 'Novo produto'}</h2>
            <p>
              {saleMode === 'BUILDABLE'
                ? 'Cadastre o produto-base e organize as escolhas que o cliente fará.'
                : 'Cadastre um item vendido pronto, sem etapas de montagem.'}
            </p>
          </div>
          <button aria-label="Fechar cadastro" type="button" onClick={close}>
            <X />
          </button>
        </header>

        <S.ProductWizardProgress aria-label="Etapas do cadastro do produto">
          <div className={basicInformationReady ? 'complete' : 'current'}>
            <i>{basicInformationReady ? <CheckCircle2 /> : '1'}</i>
            <span>
              <b>Produto-base</b>
              <small>Nome, preço e imagem</small>
            </span>
          </div>
          <ChevronRight />
          <div
            className={
              saleMode === 'COMPLETE' ||
              (readyGroupCount === optionGroups.length && optionGroups.length)
                ? 'complete'
                : 'current'
            }
          >
            <i>
              {saleMode === 'COMPLETE' ||
              (readyGroupCount === optionGroups.length && optionGroups.length) ? (
                <CheckCircle2 />
              ) : (
                '2'
              )}
            </i>
            <span>
              <b>{saleMode === 'BUILDABLE' ? 'Personalização' : 'Venda simples'}</b>
              <small>{saleMode === 'BUILDABLE' ? 'Escolhas do cliente' : 'Sem montagem'}</small>
            </span>
          </div>
          <ChevronRight />
          <div>
            <i>3</i>
            <span>
              <b>Disponibilidade</b>
              <small>Estoque e revisão</small>
            </span>
          </div>
        </S.ProductWizardProgress>

        {error && <S.ProductFormError role="alert">{error}</S.ProductFormError>}

        <S.ProductFormSection>
          <div className="section-heading">
            <span>1</span>
            <div>
              <small>PRIMEIRO PASSO</small>
              <h3>Apresente o produto</h3>
              <p>Defina as informações que aparecem no card da Home e do cardápio digital.</p>
            </div>
          </div>
          <div className="product-basics-layout">
            <div className="basic-fields">
              <S.Field $full>
                Nome do produto
                <input
                  required
                  maxLength={100}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Ex.: Pizza personalizada, massa artesanal ou poke"
                />
              </S.Field>
              <S.Field>
                Preço inicial
                <input
                  required
                  type="number"
                  min="0"
                  max="999999"
                  step="0.01"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  placeholder="0,00"
                />
                <small>
                  {saleMode === 'BUILDABLE'
                    ? 'Este é o valor inicial; cada opção pode ter seu próprio preço.'
                    : 'Este será o valor final do produto.'}
                </small>
              </S.Field>
              <S.Field>
                Categoria no cardápio
                <select
                  required
                  value={categoryId}
                  onChange={(event) => setCategoryId(Number(event.target.value))}
                >
                  <option value={0}>Selecione</option>
                  {categories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </S.Field>
              <S.Field $full>
                Descrição para o cliente
                <textarea
                  maxLength={500}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Explique a proposta do produto e o que já está incluído no preço inicial."
                />
                <small>{description.length}/500 caracteres</small>
              </S.Field>
            </div>

            <div className="image-studio">
              <div className={image ? 'image-preview has-image' : 'image-preview'}>
                {image ? (
                  <img src={image} alt={`Prévia de ${name || 'produto'}`} />
                ) : (
                  <div>
                    <ImagePlus />
                    <b>Adicione uma foto</b>
                    <span>JPG, PNG ou WEBP</span>
                  </div>
                )}
                <div className="preview-caption">
                  <small>{selectedProductCategory || 'Categoria do produto'}</small>
                  <b>{name || 'Nome do produto'}</b>
                  <strong>{Number(price) > 0 ? money(Number(price)) : 'Preço inicial'}</strong>
                </div>
              </div>
              <label className="image-upload-action" htmlFor="product-image-upload">
                <UploadCloud />
                <span>
                  <b>{image ? 'Trocar imagem' : 'Selecionar imagem'}</b>
                  <small>Recomendado: formato quadrado</small>
                </span>
                <input
                  id="product-image-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => void uploadImage(event.target.files?.[0])}
                />
              </label>
              <S.Field>
                Ou cole uma URL
                <input
                  value={image}
                  onChange={(event) => setImage(event.target.value)}
                  placeholder="https://..."
                />
              </S.Field>
            </div>
          </div>
        </S.ProductFormSection>

        <S.ProductFormSection>
          <div className="section-heading customization-heading">
            <span>2</span>
            <div>
              <small>SEGUNDO PASSO</small>
              <h3>Este produto pode ser personalizado?</h3>
              <p>Escolha o comportamento que o cliente encontrará no cardápio.</p>
            </div>
          </div>

          <S.ProductSaleModeSelector role="group" aria-label="Personalização do produto">
            <button
              className={saleMode === 'COMPLETE' ? 'active' : ''}
              type="button"
              onClick={() => {
                setSaleMode('COMPLETE');
                setError('');
              }}
            >
              <PackageOpen />
              <span>
                <b>Não, é um produto pronto</b>
                <small>O cliente adiciona direto à sacola, sem escolher etapas.</small>
              </span>
              {saleMode === 'COMPLETE' && <CheckCircle2 />}
            </button>
            <button
              className={saleMode === 'BUILDABLE' ? 'active' : ''}
              type="button"
              onClick={() => {
                setSaleMode('BUILDABLE');
                setConfirmDiscardConfiguration(false);
                setError('');
              }}
            >
              <Layers3 />
              <span>
                <b>Sim, o cliente pode personalizar</b>
                <small>Crie escolhas, quantidades, itens removíveis ou porções.</small>
              </span>
              {saleMode === 'BUILDABLE' && <CheckCircle2 />}
            </button>
          </S.ProductSaleModeSelector>

          {saleMode === 'COMPLETE' && (
            <S.ProductSimpleMode>
              <CheckCircle2 />
              <div>
                <b>Este produto será vendido sem etapas de montagem.</b>
                <p>
                  No cardápio, o cliente toca em adicionar e o item vai direto para a sacola pelo
                  preço informado acima.
                </p>
                {hasPersistedConfiguration && (
                  <label>
                    <input
                      type="checkbox"
                      checked={confirmDiscardConfiguration}
                      onChange={(event) => setConfirmDiscardConfiguration(event.target.checked)}
                    />
                    Confirmo que grupos, composição e porções atuais serão removidos ao salvar.
                  </label>
                )}
              </div>
            </S.ProductSimpleMode>
          )}

          {saleMode === 'BUILDABLE' && (
            <>
              <div className="customization-actions">
                <div>
                  <b>Oficina de personalização</b>
                  <span>Monte etapas genéricas para qualquer tipo de produto.</span>
                </div>
                <button
                  className="add-group"
                  disabled={!activeIngredients.length}
                  type="button"
                  onClick={addGroup}
                >
                  <Plus /> Adicionar etapa
                </button>
              </div>

              <S.ProductPresetGrid>
                <button type="button" onClick={() => addPreset('SINGLE')}>
                  <i>1</i>
                  <span>
                    <b>Escolha única</b>
                    <small>Uma opção obrigatória, como tamanho ou tipo.</small>
                  </span>
                  <Plus />
                </button>
                <button type="button" onClick={() => addPreset('EXTRAS')}>
                  <i>+</i>
                  <span>
                    <b>Adicionais</b>
                    <small>Várias opções opcionais com preço e quantidade.</small>
                  </span>
                  <Plus />
                </button>
                <button type="button" onClick={() => addPreset('PORTIONS')}>
                  <i>½</i>
                  <span>
                    <b>Divisão em porções</b>
                    <small>Cria a etapa usada para escolher cada parte.</small>
                  </span>
                  <Plus />
                </button>
              </S.ProductPresetGrid>

              <S.ProductTemplateLibrary>
                <header>
                  <div>
                    <Copy />
                    <span>
                      <b>Modelos reutilizáveis</b>
                      <small>Aplicar um modelo cria uma cópia independente neste produto.</small>
                    </span>
                  </div>
                  <span>{templates.length} salvo(s)</span>
                </header>
                {!!templates.length && (
                  <div className="template-list">
                    {templates.map((template) => (
                      <article key={template.id}>
                        <span>
                          <b>{template.name}</b>
                          <small>
                            {template.configuration.optionGroups.length} etapa(s) ·{' '}
                            {template.configuration.compositionItems.length} item(ns) na composição
                          </small>
                        </span>
                        <button type="button" onClick={() => applyTemplate(template)}>
                          Aplicar
                        </button>
                        <button
                          aria-label={`Remover modelo ${template.name}`}
                          className="delete-template"
                          disabled={templateBusy}
                          type="button"
                          onClick={() => void deactivateTemplate(template.id)}
                        >
                          <Trash2 />
                        </button>
                      </article>
                    ))}
                  </div>
                )}
                <div className="save-template">
                  <label>
                    Nome do novo modelo
                    <input
                      maxLength={80}
                      value={templateName}
                      onChange={(event) => setTemplateName(event.target.value)}
                      placeholder="Ex.: Montagem padrão da casa"
                    />
                  </label>
                  <button
                    disabled={templateBusy || !templateName.trim() || !optionGroups.length}
                    type="button"
                    onClick={() => void saveTemplate()}
                  >
                    {templateBusy ? 'Salvando...' : 'Salvar configuração atual'}
                  </button>
                </div>
              </S.ProductTemplateLibrary>

              <div className="group-guidance">
                <div>
                  <i>1</i>
                  <span>
                    <b>Separe por assunto</b>
                    <small>Ex.: Massa, Borda e Adicionais.</small>
                  </span>
                </div>
                <ChevronRight />
                <div>
                  <i>2</i>
                  <span>
                    <b>Defina a regra</b>
                    <small>Uma ou várias escolhas, obrigatórias ou não.</small>
                  </span>
                </div>
                <ChevronRight />
                <div>
                  <i>3</i>
                  <span>
                    <b>Vincule as opções</b>
                    <small>Marque os itens que o cliente verá.</small>
                  </span>
                </div>
              </div>

              <ProductConfigurationWorkspace
                name={name}
                price={price}
                ingredients={ingredients}
                activeIngredients={activeIngredients}
                activeIngredientSections={activeIngredientSections}
                ingredientCategories={ingredientCategories}
                optionGroups={optionGroups}
                groupCategories={groupCategories}
                compositionItems={compositionItems}
                portionConfiguration={portionConfiguration}
                pendingCategoryChange={pendingCategoryChange}
                canCreateIngredient={Boolean(createIngredient)}
                inlineIngredientGroup={inlineIngredientGroup}
                inlineIngredientName={inlineIngredientName}
                inlineIngredientPrice={inlineIngredientPrice}
                inlineIngredientBusy={inlineIngredientBusy}
                inlineDuplicate={inlineDuplicate}
                updateGroup={updateGroup}
                updateGroupOption={updateGroupOption}
                moveGroup={moveGroup}
                removeGroup={removeGroup}
                selectGroupCategory={selectGroupCategory}
                confirmGroupCategoryChange={confirmGroupCategoryChange}
                toggleGroupIngredient={toggleGroupIngredient}
                toggleCompositionIngredient={toggleCompositionIngredient}
                createInlineIngredient={createInlineIngredient}
                setError={setError}
                setPendingCategoryChange={setPendingCategoryChange}
                setInlineIngredientGroup={setInlineIngredientGroup}
                setInlineIngredientName={setInlineIngredientName}
                setInlineIngredientPrice={setInlineIngredientPrice}
                setCompositionItems={setCompositionItems}
                setPortionConfiguration={setPortionConfiguration}
              />
            </>
          )}
        </S.ProductFormSection>

        <S.ProductFormSection>
          <div className="section-heading">
            <span>3</span>
            <div>
              <small>ÚLTIMO PASSO</small>
              <h3>Disponibilidade e revisão</h3>
              <p>Escolha como o estoque será controlado e confira o resumo antes de salvar.</p>
            </div>
          </div>
          <div className="availability-layout">
            <div className="stock-configuration">
              <b className="field-title">Como este produto é preparado?</b>
              <div className="stock-mode-cards" role="group" aria-label="Controle de estoque">
                <button
                  className={unlimitedStock ? 'active' : ''}
                  type="button"
                  onClick={() => setUnlimitedStock(true)}
                >
                  <PackageOpen />
                  <span>
                    <b>Feito sob demanda</b>
                    <small>Sem limite fixo de unidades</small>
                  </span>
                  {unlimitedStock && <CheckCircle2 />}
                </button>
                <button
                  className={!unlimitedStock ? 'active' : ''}
                  type="button"
                  onClick={() => setUnlimitedStock(false)}
                >
                  <Boxes />
                  <span>
                    <b>Estoque limitado</b>
                    <small>Informe a quantidade disponível</small>
                  </span>
                  {!unlimitedStock && <CheckCircle2 />}
                </button>
              </div>
              {!unlimitedStock && (
                <S.Field>
                  Quantidade disponível
                  <input
                    required
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Quantidade disponível"
                    value={stock}
                    onChange={(event) => setStock(event.target.value.replace(/\D/g, ''))}
                  />
                </S.Field>
              )}
            </div>

            <div className="product-review-card">
              <header>
                <Sparkles />
                <div>
                  <b>Revisão rápida</b>
                  <span>O que será publicado</span>
                </div>
              </header>
              <ul>
                <li className={basicInformationReady ? 'complete' : ''}>
                  <i>{basicInformationReady ? <CheckCircle2 /> : '1'}</i>
                  <span>
                    <b>Produto-base</b>
                    <small>{name || 'Preencha nome, preço e categoria'}</small>
                  </span>
                </li>
                <li
                  className={
                    saleMode === 'COMPLETE' ||
                    (readyGroupCount === optionGroups.length && optionGroups.length)
                      ? 'complete'
                      : ''
                  }
                >
                  <i>
                    {saleMode === 'COMPLETE' ||
                    (readyGroupCount === optionGroups.length && optionGroups.length) ? (
                      <CheckCircle2 />
                    ) : (
                      '2'
                    )}
                  </i>
                  <span>
                    <b>{saleMode === 'BUILDABLE' ? 'Personalização' : 'Venda simples'}</b>
                    <small>
                      {saleMode === 'BUILDABLE'
                        ? `${readyGroupCount} de ${optionGroups.length} etapa(s) pronta(s)`
                        : 'Cliente adiciona direto à sacola'}
                    </small>
                  </span>
                </li>
                <li className="complete">
                  <i>
                    <CheckCircle2 />
                  </i>
                  <span>
                    <b>Disponibilidade</b>
                    <small>
                      {unlimitedStock ? 'Feito sob demanda' : `${stock || 0} unidade(s)`}
                    </small>
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </S.ProductFormSection>

        <footer className="drawer-footer">
          <div className="footer-summary">
            <span className="footer-summary-icon">
              <PackageOpen />
            </span>
            <span>
              <b>{name || (product ? 'Produto em edição' : 'Novo produto')}</b>
              <small>
                {saleMode === 'BUILDABLE'
                  ? `${optionGroups.length} etapa(s) · ${linkedOptionCount} opção(ões) vinculada(s)`
                  : 'Produto pronto · sem etapas de montagem'}
              </small>
            </span>
          </div>
          <div className="footer-actions">
            <button type="button" onClick={close}>
              Cancelar
            </button>
            <button className="primary" disabled={busy} type="submit">
              {busy ? 'Salvando produto...' : product ? 'Salvar alterações' : 'Criar produto'}
            </button>
          </div>
        </footer>
      </S.ProductFormDrawer>
    </S.Overlay>
  );
}
