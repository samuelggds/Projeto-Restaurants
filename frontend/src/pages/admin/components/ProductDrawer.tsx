import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ArrowLeft, ArrowRight, Check, Copy, PackageOpen, Plus, Trash2, X } from 'lucide-react';
import { useAppDialog } from '../../../components/AppDialog/context';
import { createPersistentImageDataUrl } from '../../../utils/persistentImage';
import productConfigurationTemplatesService from '../../../Services/productConfigurationTemplatesService';
import * as S from '../Admin.styles';
import {
  ProductConfigurationWorkspace,
  type PendingCategoryChange,
} from './ProductConfigurationWorkspace';
import { IngredientWizard } from './IngredientWizard';
import {
  ProductAvailabilityStep,
  ProductReviewStep,
  ProductTypeStep,
  type ProductFieldErrors,
} from './ProductWizardSteps';
import { ProductAppearanceStep, ProductBasicStep, ProductPriceStep } from './ProductGuidedSteps';
import { emptyGroup, groupPreset } from './ProductDrawerGroups';
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
import {
  getAdjacentProductWizardStep,
  getProductWizardSequence,
  type ProductWizardStep,
} from '../domain/productWizard';

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

export type ProductDrawerHandle = {
  hasUnsavedChanges: () => boolean;
  save: () => Promise<boolean>;
  discard: () => void;
};

type IngredientWizardTarget = { kind: 'OPTION'; groupIndex: number };

export const ProductDrawer = forwardRef<ProductDrawerHandle, ProductDrawerProps>(
  function ProductDrawer({ product, categories, ingredients, createIngredient, close, save }, ref) {
    const { confirmDialog } = useAppDialog();
    const initialCategoryId = product?.categoryId ?? categories[0]?.id ?? 0;
    const [name, setName] = useState(product?.name ?? '');
    const [description, setDescription] = useState(product?.description ?? '');
    const [image, setImage] = useState(product?.image ?? '');
    const [price, setPrice] = useState(String(product?.price ?? ''));
    const [categoryId, setCategoryId] = useState(initialCategoryId);
    const [stock, setStock] = useState(String(product?.stock ?? ''));
    const [unlimitedStock, setUnlimitedStock] = useState(isUnlimitedStock(product?.stock));
    const [saleMode, setSaleMode] = useState<'COMPLETE' | 'BUILDABLE'>(
      product?.saleMode ?? 'COMPLETE',
    );
    const [confirmDiscardConfiguration, setConfirmDiscardConfiguration] = useState(false);
    const [templates, setTemplates] = useState<AdminProductConfigurationTemplate[]>([]);
    const [templateName, setTemplateName] = useState('');
    const [templateBusy, setTemplateBusy] = useState(false);
    const [ingredientWizardTarget, setIngredientWizardTarget] =
      useState<IngredientWizardTarget | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [currentStep, setCurrentStep] = useState<ProductWizardStep>('TYPE');
    const [showCustomerPreview, setShowCustomerPreview] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<ProductFieldErrors>({});
    const drawerRef = useRef<HTMLFormElement>(null);
    const stepHeadingRef = useRef<HTMLHeadingElement>(null);
    const [optionGroups, setOptionGroups] = useState<AdminProductOptionGroup[]>(
      () =>
        product?.optionGroups?.map((group) => ({ ...group, options: [...group.options] })) ?? [],
    );
    const [editingGroupIndex, setEditingGroupIndex] = useState<number | null>(() =>
      product?.optionGroups?.length === 1 ? 0 : null,
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
    const [pendingCategoryChange, setPendingCategoryChange] =
      useState<PendingCategoryChange | null>(null);
    const [initialDraftSignature] = useState(() =>
      JSON.stringify({
        name: product?.name ?? '',
        description: product?.description ?? '',
        image: product?.image ?? '',
        price: String(product?.price ?? ''),
        categoryId: initialCategoryId,
        stock: String(product?.stock ?? ''),
        unlimitedStock: isUnlimitedStock(product?.stock),
        saleMode: product?.saleMode ?? 'COMPLETE',
        optionGroups: product?.optionGroups ?? [],
        compositionItems: product?.compositionItems ?? [],
        portionConfiguration: product?.portionConfiguration ?? null,
      }),
    );
    const activeIngredients = useMemo(
      () => ingredients.filter((ingredient) => ingredient.active),
      [ingredients],
    );
    const ingredientCategories = useMemo(
      () => listIngredientCategories(ingredients),
      [ingredients],
    );
    const activeIngredientSections = useMemo(
      () => groupIngredientsByCategory(activeIngredients),
      [activeIngredients],
    );
    const selectedProductCategory = categories.find((item) => item.id === categoryId)?.name ?? '';
    const linkedOptionCount = optionGroups.reduce(
      (total, group) => total + group.options.length,
      0,
    );
    const hasPersistedConfiguration = Boolean(
      product?.saleMode === 'BUILDABLE' &&
      (product.optionGroups?.length ||
        product.compositionItems?.length ||
        product.portionConfiguration),
    );
    const hasUnsavedChanges =
      JSON.stringify({
        name,
        description,
        image,
        price,
        categoryId,
        stock,
        unlimitedStock,
        saleMode,
        optionGroups,
        compositionItems,
        portionConfiguration,
      }) !== initialDraftSignature;
    const wizardSequence = getProductWizardSequence(saleMode);
    const currentStepIndex = wizardSequence.indexOf(currentStep);

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

    useEffect(() => {
      stepHeadingRef.current?.focus();
    }, [currentStep]);

    const requestClose = useCallback(async () => {
      if (!hasUnsavedChanges) {
        close();
        return;
      }

      const confirmed = await confirmDialog({
        title: 'Descartar alterações?',
        description: 'As informações preenchidas neste produto ainda não foram salvas.',
        confirmLabel: 'Descartar alterações',
        tone: 'danger',
      });
      if (confirmed) close();
    }, [close, confirmDialog, hasUnsavedChanges]);

    useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.defaultPrevented || document.querySelector('[data-ingredient-wizard]')) return;
        if (event.key === 'Escape') {
          event.preventDefault();
          void requestClose();
          return;
        }
        if (event.key !== 'Tab') return;
        const focusable = Array.from(
          drawerRef.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
          ) ?? [],
        ).filter((element) => element.offsetParent !== null);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      };
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [requestClose]);

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
      setEditingGroupIndex(optionGroups.length);
      setPendingCategoryChange(null);
    };

    const addPreset = (preset: 'SINGLE' | 'EXTRAS' | 'PORTIONS') => {
      const group = groupPreset(preset);
      setOptionGroups((current) => [...current, group]);
      setGroupCategories((current) => [...current, '']);
      setEditingGroupIndex(optionGroups.length);
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
      setEditingGroupIndex(groups.length ? 0 : null);
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
          uploadError instanceof Error
            ? uploadError.message
            : 'Não foi possível carregar a imagem.',
        );
      }
    };

    const clearFieldError = (field: keyof typeof fieldErrors) => {
      setFieldErrors((current) => ({ ...current, [field]: undefined }));
    };

    const validateBasicStep = () => {
      const nextErrors: typeof fieldErrors = {};

      if (!name.trim()) nextErrors.name = 'Informe o nome do produto.';
      if (!categoryId) nextErrors.category = 'Escolha uma categoria do cardápio.';

      setFieldErrors((current) => ({ ...current, ...nextErrors }));
      const valid = Object.keys(nextErrors).length === 0;
      setError(valid ? '' : 'Revise os campos destacados para continuar.');
      return valid;
    };

    const validatePriceStep = () => {
      const numericPrice = Number(price);
      const valid = Boolean(price.trim()) && Number.isFinite(numericPrice) && numericPrice >= 0;
      setFieldErrors((current) => ({
        ...current,
        price: valid ? undefined : 'Informe um preço igual ou maior que zero.',
      }));
      setError(valid ? '' : 'Informe o preço para continuar.');
      return valid;
    };

    const getCustomizationValidationError = () => {
      const unresolvedCategoryIndex = optionGroups.findIndex(
        (_, index) =>
          !groupCategories[index] || groupCategories[index] === MIXED_INGREDIENT_CATEGORY,
      );
      if (unresolvedCategoryIndex >= 0) {
        return `Escolha uma categoria de ingredientes na etapa ${unresolvedCategoryIndex + 1}.`;
      }

      const normalizedGroups = optionGroups.map(normalizeOptionGroup);
      const customizationErrors = validateOptionGroups(normalizedGroups, ingredients);
      if (customizationErrors.length) return customizationErrors[0];
      if (
        portionConfiguration?.enabled &&
        !normalizedGroups.some((group) => group.name === portionConfiguration.optionGroupName)
      ) {
        return 'Escolha uma etapa existente para definir as opções de cada porção.';
      }
      if (
        portionConfiguration?.enabled &&
        portionConfiguration.minPortions > portionConfiguration.maxPortions
      ) {
        return 'O mínimo de porções não pode ser maior que o máximo.';
      }
      return '';
    };

    const validateCustomizationStep = () => {
      if (saleMode === 'COMPLETE') return true;
      const nextError = getCustomizationValidationError();
      setError(nextError);
      return !nextError;
    };

    const validateAvailabilityStep = () => {
      if (unlimitedStock) {
        setFieldErrors((current) => ({ ...current, stock: undefined }));
        setError('');
        return true;
      }

      const numericStock = Number(stock);
      const valid = /^\d+$/u.test(stock) && Number.isSafeInteger(numericStock) && numericStock >= 0;
      setFieldErrors((current) => ({
        ...current,
        stock: valid ? undefined : 'Informe a quantidade disponível em unidades inteiras.',
      }));
      setError(valid ? '' : 'Informe a quantidade disponível para continuar.');
      return valid;
    };

    const validateStep = (step: ProductWizardStep) => {
      if (step === 'BASIC') return validateBasicStep();
      if (step === 'PRICE') return validatePriceStep();
      if (step === 'CUSTOMIZATION') return validateCustomizationStep();
      if (step === 'AVAILABILITY') return validateAvailabilityStep();
      return true;
    };

    const continueWizard = () => {
      if (!validateStep(currentStep)) return;
      setError('');
      setCurrentStep(getAdjacentProductWizardStep(currentStep, 1, saleMode));
    };

    const returnWizard = () => {
      setError('');
      setCurrentStep(getAdjacentProductWizardStep(currentStep, -1, saleMode));
    };

    const saveDraft = async (): Promise<boolean> => {
      setError('');

      const numericPrice = Number(price);
      if (!name.trim() || !categoryId) {
        validateBasicStep();
        setCurrentStep('BASIC');
        return false;
      }
      if (!price.trim() || !Number.isFinite(numericPrice) || numericPrice < 0) {
        validatePriceStep();
        setCurrentStep('PRICE');
        return false;
      }

      let normalizedGroups: AdminProductOptionGroup[] = [];
      if (saleMode === 'BUILDABLE') {
        const unresolvedCategoryIndex = optionGroups.findIndex(
          (_, index) =>
            !groupCategories[index] || groupCategories[index] === MIXED_INGREDIENT_CATEGORY,
        );
        if (unresolvedCategoryIndex >= 0) {
          setError(
            `Escolha uma categoria de ingredientes na etapa ${unresolvedCategoryIndex + 1} antes de salvar.`,
          );
          setCurrentStep('CUSTOMIZATION');
          return false;
        }

        normalizedGroups = optionGroups.map(normalizeOptionGroup);
        const customizationErrors = validateOptionGroups(normalizedGroups, ingredients);
        if (customizationErrors.length) {
          setError(customizationErrors[0]);
          setCurrentStep('CUSTOMIZATION');
          return false;
        }
        if (
          portionConfiguration?.enabled &&
          !normalizedGroups.some((group) => group.name === portionConfiguration.optionGroupName)
        ) {
          setError('Escolha uma etapa existente para definir as opções de cada porção.');
          setCurrentStep('CUSTOMIZATION');
          return false;
        }
        if (
          portionConfiguration?.enabled &&
          portionConfiguration.minPortions > portionConfiguration.maxPortions
        ) {
          setError('O mínimo de porções não pode ser maior que o máximo.');
          setCurrentStep('CUSTOMIZATION');
          return false;
        }
      } else if (hasPersistedConfiguration && !confirmDiscardConfiguration) {
        setError('Confirme a remoção da personalização antes de salvar como produto simples.');
        setCurrentStep('TYPE');
        return false;
      }

      if (!validateAvailabilityStep()) {
        setCurrentStep('AVAILABILITY');
        return false;
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
        return true;
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
        return false;
      }
    };

    useImperativeHandle(ref, () => ({
      hasUnsavedChanges: () => hasUnsavedChanges,
      save: saveDraft,
      discard: close,
    }));

    const hasCustomizationStages = optionGroups.length > 0;
    const customizationRulesReady =
      hasCustomizationStages &&
      optionGroups.every((group, groupIndex) => group.name.trim() && groupCategories[groupIndex]);
    const customizationOptionsReady =
      customizationRulesReady && optionGroups.every((group) => group.options.length > 0);

    return (
      <S.Overlay
        className="product-editor-overlay"
        aria-label={product ? 'Editar produto' : 'Novo produto'}
        aria-modal="true"
        role="dialog"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) void requestClose();
        }}
      >
        <S.ProductFormDrawer
          ref={drawerRef}
          onSubmit={(event) => {
            event.preventDefault();
            if (currentStep !== 'REVIEW') {
              continueWizard();
              return;
            }
            void saveDraft();
          }}
        >
          <header className="drawer-header">
            <div className="drawer-title">
              <h2 id="product-form-title">
                {currentStep === 'CUSTOMIZATION' && product
                  ? 'Montagem e personalização do produto'
                  : product
                    ? 'Editar produto'
                    : 'Novo produto'}
              </h2>
            </div>
            <button aria-label="Fechar cadastro" type="button" onClick={() => void requestClose()}>
              <X />
            </button>
          </header>

          <S.ProductWizardProgress aria-label="Progresso do cadastro do produto">
            <div className="wizard-progress-copy" aria-live="polite">
              <b>
                {currentStepIndex + 1} de {wizardSequence.length}
              </b>
            </div>
            <div
              aria-valuemax={wizardSequence.length}
              aria-valuemin={1}
              aria-valuenow={currentStepIndex + 1}
              className="wizard-progress-track"
              role="progressbar"
            >
              <i style={{ width: `${((currentStepIndex + 1) / wizardSequence.length) * 100}%` }} />
            </div>
          </S.ProductWizardProgress>

          {error && <S.ProductFormError role="alert">{error}</S.ProductFormError>}

          {currentStep === 'TYPE' && (
            <ProductTypeStep
              confirmDiscardConfiguration={confirmDiscardConfiguration}
              hasPersistedConfiguration={hasPersistedConfiguration}
              headingRef={stepHeadingRef}
              saleMode={saleMode}
              onConfirmDiscardConfigurationChange={setConfirmDiscardConfiguration}
              onSaleModeChange={(nextSaleMode) => {
                setSaleMode(nextSaleMode);
                if (nextSaleMode === 'BUILDABLE') setConfirmDiscardConfiguration(false);
                setError('');
              }}
            />
          )}

          {currentStep === 'BASIC' && (
            <ProductBasicStep
              categories={categories}
              categoryId={categoryId}
              fieldErrors={fieldErrors}
              headingRef={stepHeadingRef}
              name={name}
              onCategoryIdChange={setCategoryId}
              onClearFieldError={clearFieldError}
              onNameChange={setName}
            />
          )}

          {currentStep === 'PRICE' && (
            <ProductPriceStep
              fieldErrors={fieldErrors}
              headingRef={stepHeadingRef}
              price={price}
              saleMode={saleMode}
              onClearFieldError={clearFieldError}
              onPriceChange={setPrice}
            />
          )}

          {currentStep === 'APPEARANCE' && (
            <ProductAppearanceStep
              description={description}
              headingRef={stepHeadingRef}
              image={image}
              name={name}
              price={price}
              selectedProductCategory={selectedProductCategory}
              onDescriptionChange={setDescription}
              onUploadImage={(file) => void uploadImage(file)}
            />
          )}

          {currentStep === 'CUSTOMIZATION' && (
            <S.ProductWizardStepSection aria-labelledby="product-step-customization">
              <div className="section-heading customization-heading">
                <span>5</span>
                <div>
                  <small>PERSONALIZAÇÃO</small>
                  <h3 id="product-step-customization" ref={stepHeadingRef} tabIndex={-1}>
                    Como o cliente poderá personalizar?
                  </h3>
                  <p>Organize as escolhas na mesma ordem em que aparecerão para o cliente.</p>
                </div>
              </div>

              {saleMode === 'BUILDABLE' && (
                <>
                  <div className="customization-overview">
                    <header>
                      <small>CONFIGURE EM 3 PASSOS</small>
                      <h4>Monte uma decisão de cada vez</h4>
                      <p>
                        Cada etapa vira uma pergunta simples no cardápio, como “Qual tamanho?” ou
                        “Deseja adicionais?”.
                      </p>
                    </header>
                    <ol
                      className="customization-steps"
                      aria-label="Etapas para configurar a personalização"
                    >
                      <li className={hasCustomizationStages ? 'complete' : 'active'}>
                        <i>{hasCustomizationStages ? <Check /> : '1'}</i>
                        <span>
                          <b>Crie uma etapa</b>
                          <small>Escolha o tipo de pergunta.</small>
                        </span>
                      </li>
                      <li
                        className={
                          customizationRulesReady
                            ? 'complete'
                            : hasCustomizationStages
                              ? 'active'
                              : ''
                        }
                      >
                        <i>{customizationRulesReady ? <Check /> : '2'}</i>
                        <span>
                          <b>Defina a regra</b>
                          <small>Diga como o cliente escolhe.</small>
                        </span>
                      </li>
                      <li
                        className={
                          customizationOptionsReady
                            ? 'complete'
                            : customizationRulesReady
                              ? 'active'
                              : ''
                        }
                      >
                        <i>{customizationOptionsReady ? <Check /> : '3'}</i>
                        <span>
                          <b>Marque as opções</b>
                          <small>Selecione o que será exibido.</small>
                        </span>
                      </li>
                    </ol>
                  </div>

                  {!activeIngredients.length && (
                    <S.ProductCustomizationEmpty className="customization-prerequisite">
                      <PackageOpen />
                      <div>
                        <b>Cadastre as opções antes de criar uma etapa</b>
                        <p>
                          Ingredientes são as opções que o cliente poderá escolher, como tamanhos,
                          massas, bordas e adicionais. Cadastre pelo menos um ingrediente no
                          cardápio para continuar.
                        </p>
                      </div>
                    </S.ProductCustomizationEmpty>
                  )}

                  {!!activeIngredients.length && !hasCustomizationStages && (
                    <div className="customization-start">
                      <header>
                        <small>PASSO 1</small>
                        <h4>O que o cliente escolherá primeiro?</h4>
                        <p>Selecione o exemplo mais parecido. Você poderá alterar tudo depois.</p>
                      </header>
                      <S.ProductPresetGrid aria-label="Tipos de etapa de personalização">
                        <button type="button" onClick={() => addPreset('SINGLE')}>
                          <i>1</i>
                          <span>
                            <b>Uma única opção</b>
                            <small>O cliente seleciona somente uma alternativa.</small>
                            <em>Ex.: tamanho, massa ou sabor</em>
                          </span>
                          <Plus />
                        </button>
                        <button type="button" onClick={() => addPreset('EXTRAS')}>
                          <i>+</i>
                          <span>
                            <b>Vários adicionais</b>
                            <small>O cliente pode marcar mais de uma alternativa.</small>
                            <em>Ex.: bacon, queijo extra ou molhos</em>
                          </span>
                          <Plus />
                        </button>
                        <button type="button" onClick={() => addPreset('PORTIONS')}>
                          <i>½</i>
                          <span>
                            <b>Dividir em partes</b>
                            <small>O cliente combina opções no mesmo produto.</small>
                            <em>Ex.: pizza meio a meio</em>
                          </span>
                          <Plus />
                        </button>
                      </S.ProductPresetGrid>
                      <div className="customization-start-footer">
                        <span>Nenhum exemplo combina com o seu produto?</span>
                        <button type="button" onClick={addGroup}>
                          Criar etapa do zero
                        </button>
                      </div>
                    </div>
                  )}

                  {!!activeIngredients.length && hasCustomizationStages && (
                    <div className="customization-actions">
                      <div>
                        <small>ETAPAS DO CLIENTE</small>
                        <b>
                          {optionGroups.length}{' '}
                          {optionGroups.length === 1 ? 'etapa criada' : 'etapas criadas'}
                        </b>
                        <span>Abra uma etapa para editar. O cliente seguirá a ordem abaixo.</span>
                      </div>
                      <button className="add-group" type="button" onClick={addGroup}>
                        <Plus /> Adicionar etapa
                      </button>
                    </div>
                  )}

                  {!!activeIngredients.length && hasCustomizationStages && (
                    <ProductConfigurationWorkspace
                      name={name}
                      description={description}
                      image={image}
                      price={price}
                      showComposition={false}
                      ingredients={ingredients}
                      activeIngredients={activeIngredients}
                      activeIngredientSections={activeIngredientSections}
                      ingredientCategories={ingredientCategories}
                      optionGroups={optionGroups}
                      editingGroupIndex={editingGroupIndex}
                      setEditingGroupIndex={setEditingGroupIndex}
                      groupCategories={groupCategories}
                      compositionItems={compositionItems}
                      portionConfiguration={portionConfiguration}
                      pendingCategoryChange={pendingCategoryChange}
                      canCreateIngredient={Boolean(createIngredient)}
                      openIngredientWizard={(groupIndex) =>
                        setIngredientWizardTarget({ kind: 'OPTION', groupIndex })
                      }
                      updateGroup={updateGroup}
                      updateGroupOption={updateGroupOption}
                      moveGroup={moveGroup}
                      removeGroup={removeGroup}
                      selectGroupCategory={selectGroupCategory}
                      confirmGroupCategoryChange={confirmGroupCategoryChange}
                      toggleGroupIngredient={toggleGroupIngredient}
                      toggleCompositionIngredient={toggleCompositionIngredient}
                      setPendingCategoryChange={setPendingCategoryChange}
                      setCompositionItems={setCompositionItems}
                      setPortionConfiguration={setPortionConfiguration}
                    />
                  )}

                  {hasCustomizationStages && (
                    <details className="advanced-template-settings">
                      <summary>
                        Configurações avançadas e modelos
                        <span>{templates.length} salvo(s)</span>
                      </summary>
                      <S.ProductTemplateLibrary>
                        <header>
                          <div>
                            <Copy />
                            <span>
                              <b>Modelos reutilizáveis</b>
                              <small>
                                Aplicar um modelo cria uma cópia independente neste produto.
                              </small>
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
                                    {template.configuration.compositionItems.length} item(ns) na
                                    composição
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
                    </details>
                  )}
                </>
              )}
            </S.ProductWizardStepSection>
          )}

          {currentStep === 'AVAILABILITY' && (
            <ProductAvailabilityStep
              fieldErrors={fieldErrors}
              headingRef={stepHeadingRef}
              stock={stock}
              unlimitedStock={unlimitedStock}
              onClearFieldError={clearFieldError}
              onStockChange={setStock}
              onUnlimitedStockChange={setUnlimitedStock}
            />
          )}

          {currentStep === 'REVIEW' && (
            <ProductReviewStep
              description={description}
              headingRef={stepHeadingRef}
              image={image}
              name={name}
              optionGroups={optionGroups}
              price={price}
              saleMode={saleMode}
              selectedProductCategory={selectedProductCategory}
              showCustomerPreview={showCustomerPreview}
              stock={stock}
              unlimitedStock={unlimitedStock}
              onEdit={setCurrentStep}
              onToggleCustomerPreview={() => setShowCustomerPreview((current) => !current)}
            />
          )}

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
              <button
                disabled={currentStep === 'TYPE' || busy}
                type="button"
                onClick={returnWizard}
              >
                <ArrowLeft /> Voltar
              </button>
              {currentStep === 'REVIEW' ? (
                <button className="primary" disabled={busy} type="submit">
                  {busy ? 'Salvando produto...' : product ? 'Salvar alterações' : 'Criar produto'}
                </button>
              ) : (
                <button
                  className="primary"
                  disabled={busy}
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    continueWizard();
                  }}
                >
                  Continuar <ArrowRight />
                </button>
              )}
            </div>
          </footer>
        </S.ProductFormDrawer>
        {ingredientWizardTarget && createIngredient && (
          <IngredientWizard
            categories={ingredientCategories}
            ingredients={ingredients}
            initialCategory={groupCategories[ingredientWizardTarget.groupIndex]}
            mode="INLINE"
            onClose={() => setIngredientWizardTarget(null)}
            onCreate={createIngredient}
            onCreated={(ingredient) => {
              selectInlineIngredient(ingredientWizardTarget.groupIndex, ingredient);
            }}
          />
        )}
      </S.Overlay>
    );
  },
);
