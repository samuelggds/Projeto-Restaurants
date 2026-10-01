import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import {
  ArrowRight,
  Check,
  CircleHelp,
  ImageOff,
  LayoutGrid,
  List,
  MoreVertical,
  Package,
  Pencil,
  Power,
  Plus,
  Search,
  Tag,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { useAppDialog } from '../../../components/AppDialog/context';
import { resolveCategoryVisual } from '../../../config/categoryIconMap';
import { createPersistentImageDataUrl } from '../../../utils/persistentImage';
import * as S from '../Admin.styles';
import type { AdminCategory, AdminIngredient, AdminProduct } from '../types';
import {
  countProductsInCategory,
  filterAdminProducts,
  listIngredientCategories,
} from '../domain/adminCatalog';
import { validateIngredientDraft } from '../domain/productCustomizationValidation';
import { IngredientWizard } from './IngredientWizard';
import { AdminMenuImport } from './AdminMenuImport';
import { CatalogAiImageGenerator } from './CatalogAiImageGenerator';
import { AdminCombos } from './AdminCombos';
import * as C from '../styles/AdminCatalogExperience.styles';

type AdminCatalogProps = {
  products: AdminProduct[];
  categories: AdminCategory[];
  ingredients: AdminIngredient[];
  money: (value: number) => string;
  onEditProduct: (product: AdminProduct) => void;
  onDeleteProduct: (id: string) => Promise<void>;
  onNewProduct: () => void;
  onCreateCategory: (name: string) => Promise<void>;
  onUpdateCategory: (
    id: number,
    updates: { name?: string; image?: string | null },
  ) => Promise<void>;
  onDeleteCategory: (id: number) => Promise<void>;
  onReorderCategories: (categoryIds: number[]) => Promise<void>;
  onCreateIngredient: (ingredient: Omit<AdminIngredient, 'id'>) => Promise<AdminIngredient | void>;
  onUpdateIngredient: (ingredient: AdminIngredient, imageUpdate?: string | null) => Promise<void>;
  onDeleteIngredient: (id: number) => Promise<void>;
  importOpen: boolean;
  onCloseImport: () => void;
  onImportComplete: () => void | Promise<void>;
};

import { adminErrorMessage } from '../utils/adminErrorMessage';

function errorMessage(error: unknown, fallback: string) {
  return adminErrorMessage(error, fallback);
}

export function AdminCatalog(props: AdminCatalogProps) {
  const { products, categories, ingredients, money } = props;
  const { confirmDialog, promptDialog } = useAppDialog();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [categoryBusy, setCategoryBusy] = useState(false);
  const [categoryFeedback, setCategoryFeedback] = useState('');
  const [categoryOrderIds, setCategoryOrderIds] = useState<number[]>(() =>
    categories.map((category) => category.id),
  );
  const [draggingCategoryId, setDraggingCategoryId] = useState<number | null>(null);
  const categoryCardRefs = useRef(new Map<number, HTMLElement>());
  const categoryOrderIdsRef = useRef<number[]>(categories.map((category) => category.id));
  const categoryDragRef = useRef<{
    categoryId: number;
    pointerId: number;
    startX: number;
    startY: number;
    active: boolean;
    element: HTMLElement;
    preview: HTMLElement | null;
    startRect: DOMRect | null;
    previousBodyUserSelect: string;
    previousBodyCursor: string;
  } | null>(null);
  const [openProductMenu, setOpenProductMenu] = useState<string | null>(null);
  const [catalogTab, setCatalogTab] = useState<
    'products' | 'combos' | 'ingredients' | 'categories'
  >('products');
  const [ingredientWizardOpen, setIngredientWizardOpen] = useState(false);
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [ingredientFilter, setIngredientFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [ingredientCategoryFilter, setIngredientCategoryFilter] = useState('all');
  const [ingredientSort, setIngredientSort] = useState<'name-asc' | 'name-desc' | 'price-asc'>(
    'name-asc',
  );
  const [ingredientView, setIngredientView] = useState<'grid' | 'list'>('grid');
  const [openIngredientMenu, setOpenIngredientMenu] = useState<number | null>(null);
  const [editingIngredientId, setEditingIngredientId] = useState<number | null>(null);
  const [editingIngredientName, setEditingIngredientName] = useState('');
  const [editingIngredientPrice, setEditingIngredientPrice] = useState('0');
  const [editingIngredientCategory, setEditingIngredientCategory] = useState('');
  const [editingIngredientImage, setEditingIngredientImage] = useState<string | null>(null);
  const [editingIngredientImageChanged, setEditingIngredientImageChanged] = useState(false);
  const [editingIngredientImageBusy, setEditingIngredientImageBusy] = useState(false);
  const [ingredientBusy, setIngredientBusy] = useState<string | null>(null);
  const [ingredientFeedback, setIngredientFeedback] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);
  const effectiveCategoryOrderIds = useMemo(() => {
    const availableIds = new Set(categories.map((category) => category.id));
    const current = categoryOrderIds.filter((id) => availableIds.has(id));
    const seen = new Set(current);
    return [
      ...current,
      ...categories.map((category) => category.id).filter((id) => !seen.has(id)),
    ];
  }, [categories, categoryOrderIds]);
  categoryOrderIdsRef.current = effectiveCategoryOrderIds;

  const orderedCategories = useMemo(() => {
    const byId = new Map(categories.map((category) => [category.id, category]));
    return effectiveCategoryOrderIds
      .map((id) => byId.get(id))
      .filter((category): category is AdminCategory => Boolean(category));
  }, [categories, effectiveCategoryOrderIds]);

  const animateCategoryLayout = (
    previousRects: Map<number, DOMRect>,
    draggedId?: number,
  ) => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    window.requestAnimationFrame(() => {
      categoryCardRefs.current.forEach((element, id) => {
        if (id === draggedId) return;
        const before = previousRects.get(id);
        if (!before) return;
        const after = element.getBoundingClientRect();
        const x = before.left - after.left;
        const y = before.top - after.top;
        if (Math.abs(x) < 1 && Math.abs(y) < 1) return;
        element.animate(
          [
            { transform: `translate3d(${x}px, ${y}px, 0)` },
            { transform: 'translate3d(0, 0, 0)' },
          ],
          {
            duration: 280,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          },
        );
      });
    });
  };

  const reorderLocally = (draggedId: number, targetId: number) => {
    if (draggedId === targetId) return;
    const current = categoryOrderIdsRef.current;
    const sourceIndex = current.indexOf(draggedId);
    const targetIndex = current.indexOf(targetId);
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;

    const previousRects = new Map<number, DOMRect>();
    categoryCardRefs.current.forEach((element, id) => {
      previousRects.set(id, element.getBoundingClientRect());
    });

    const next = [...current];
    next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, draggedId);
    categoryOrderIdsRef.current = next;
    setCategoryOrderIds(next);
    animateCategoryLayout(previousRects, draggedId);
  };

  const persistCategoryOrder = async (nextOrder: number[]) => {
    setCategoryBusy(true);
    setCategoryFeedback('');
    try {
      await props.onReorderCategories(nextOrder);
      setCategoryFeedback('Categorias reorganizadas com sucesso.');
    } catch (error) {
      const fallback = categories.map((category) => category.id);
      categoryOrderIdsRef.current = fallback;
      setCategoryOrderIds(fallback);
      setCategoryFeedback(errorMessage(error, 'Não foi possível salvar a ordem das categorias.'));
    } finally {
      setCategoryBusy(false);
    }
  };

  const createCategoryDragPreview = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const preview = element.cloneNode(true) as HTMLElement;
    preview.removeAttribute('data-drag-source');
    preview.setAttribute('data-category-drag-preview', 'true');
    preview.setAttribute('aria-hidden', 'true');
    preview.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
    preview.querySelectorAll<HTMLElement>('button, input, label, a, select, textarea').forEach(
      (node) => {
        node.tabIndex = -1;
      },
    );
    Object.assign(preview.style, {
      position: 'fixed',
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      margin: '0',
      zIndex: '10000',
      pointerEvents: 'none',
      transformOrigin: '50% 50%',
      transform: 'translate3d(0, 0, 0) scale(1.025) rotate(0.35deg)',
      boxShadow: '0 30px 70px rgba(47, 34, 25, 0.24)',
      borderColor: 'color-mix(in srgb, var(--a) 65%, #d1c5bb)',
      opacity: '0.98',
      willChange: 'transform',
    });
    document.body.appendChild(preview);
    return { preview, rect };
  };

  const beginCategoryDrag = (
    event: ReactPointerEvent<HTMLElement>,
    categoryId: number,
  ) => {
    if (categoryBusy || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const target = event.target instanceof Element ? event.target : null;
    if (
      target?.closest(
        'button, a, input, select, textarea, label, [contenteditable="true"], [data-no-category-drag]',
      )
    ) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    categoryDragRef.current = {
      categoryId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
      element: event.currentTarget,
      preview: null,
      startRect: null,
      previousBodyUserSelect: document.body.style.userSelect,
      previousBodyCursor: document.body.style.cursor,
    };
  };

  const moveCategoryDrag = (
    event: ReactPointerEvent<HTMLElement>,
    categoryId: number,
  ) => {
    const drag = categoryDragRef.current;
    if (!drag || drag.categoryId !== categoryId || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;

    if (!drag.active) {
      if (Math.hypot(deltaX, deltaY) < 6) return;
      const { preview, rect } = createCategoryDragPreview(drag.element);
      drag.active = true;
      drag.preview = preview;
      drag.startRect = rect;
      drag.element.dataset.dragSource = 'true';
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'grabbing';
      setDraggingCategoryId(categoryId);
    }

    event.preventDefault();
    const tilt = Math.max(-0.8, Math.min(0.8, deltaX * 0.008));
    if (drag.preview) {
      drag.preview.style.transform =
        `translate3d(${deltaX}px, ${deltaY}px, 0) scale(1.025) rotate(${tilt}deg)`;
    }

    const edge = 72;
    if (event.clientY < edge) window.scrollBy(0, -10);
    else if (event.clientY > window.innerHeight - edge) window.scrollBy(0, 10);

    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>('[data-category-card]');
    const targetId = Number(target?.dataset.categoryId);
    if (Number.isSafeInteger(targetId) && targetId > 0) {
      reorderLocally(categoryId, targetId);
    }
  };

  const settleCategoryDragPreview = (
    drag: NonNullable<typeof categoryDragRef.current>,
    cancelled: boolean,
  ) => {
    const preview = drag.preview;
    const startRect = drag.startRect;
    if (!preview || !startRect) return;

    const targetRect = cancelled
      ? startRect
      : categoryCardRefs.current.get(drag.categoryId)?.getBoundingClientRect() || startRect;
    const targetX = targetRect.left - startRect.left;
    const targetY = targetRect.top - startRect.top;

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      preview.remove();
      return;
    }

    const animation = preview.animate(
      [
        { transform: preview.style.transform, opacity: 0.98 },
        {
          transform: `translate3d(${targetX}px, ${targetY}px, 0) scale(1) rotate(0deg)`,
          opacity: 0.18,
        },
      ],
      {
        duration: 180,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'forwards',
      },
    );
    void animation.finished
      .catch(() => undefined)
      .finally(() => preview.remove());
  };

  const releaseCategoryDrag = (drag: NonNullable<typeof categoryDragRef.current>) => {
    drag.element.removeAttribute('data-drag-source');
    document.body.style.userSelect = drag.previousBodyUserSelect;
    document.body.style.cursor = drag.previousBodyCursor;
  };

  const finishCategoryDrag = async (
    event: ReactPointerEvent<HTMLElement>,
    categoryId: number,
  ) => {
    const drag = categoryDragRef.current;
    if (!drag || drag.categoryId !== categoryId || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    categoryDragRef.current = null;

    if (!drag.active) return;
    releaseCategoryDrag(drag);
    settleCategoryDragPreview(drag, false);
    setDraggingCategoryId(null);

    const nextOrder = [...categoryOrderIdsRef.current];
    const currentOrder = categories.map((category) => category.id);
    const changed =
      currentOrder.length === nextOrder.length &&
      currentOrder.some((id, index) => id !== nextOrder[index]);
    if (changed) await persistCategoryOrder(nextOrder);
  };

  const cancelCategoryDrag = (
    event: ReactPointerEvent<HTMLElement>,
    categoryId: number,
  ) => {
    const drag = categoryDragRef.current;
    if (!drag || drag.categoryId !== categoryId || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    categoryDragRef.current = null;
    releaseCategoryDrag(drag);
    settleCategoryDragPreview(drag, true);
    setDraggingCategoryId(null);

    const fallback = categories.map((category) => category.id);
    categoryOrderIdsRef.current = fallback;
    setCategoryOrderIds(fallback);
  };

  const moveCategoryWithKeyboard = async (categoryId: number, direction: -1 | 1) => {
    if (categoryBusy) return;
    const current = categoryOrderIdsRef.current;
    const currentIndex = current.indexOf(categoryId);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= current.length) return;
    const next = [...current];
    [next[currentIndex], next[targetIndex]] = [next[targetIndex], next[currentIndex]];
    const previousRects = new Map<number, DOMRect>();
    categoryCardRefs.current.forEach((element, id) => {
      previousRects.set(id, element.getBoundingClientRect());
    });
    categoryOrderIdsRef.current = next;
    setCategoryOrderIds(next);
    animateCategoryLayout(previousRects);
    await persistCategoryOrder(next);
  };

  const visibleProducts = useMemo(
    () => filterAdminProducts(products, search, categoryFilter),
    [products, search, categoryFilter],
  );
  const ingredientCategories = useMemo(() => listIngredientCategories(ingredients), [ingredients]);
  const visibleIngredients = useMemo(() => {
    const normalizedSearch = ingredientSearch.trim().toLocaleLowerCase('pt-BR');
    const filtered = ingredients.filter((ingredient) => {
      if (ingredientFilter === 'active' && !ingredient.active) return false;
      if (ingredientFilter === 'inactive' && ingredient.active) return false;
      if (
        ingredientCategoryFilter !== 'all' &&
        ingredient.category.trim().toLocaleLowerCase('pt-BR') !==
          ingredientCategoryFilter.toLocaleLowerCase('pt-BR')
      ) {
        return false;
      }
      return (
        !normalizedSearch ||
        ingredient.name.toLocaleLowerCase('pt-BR').includes(normalizedSearch) ||
        ingredient.category.toLocaleLowerCase('pt-BR').includes(normalizedSearch)
      );
    });
    return filtered.sort((first, second) => {
      if (ingredientSort === 'price-asc') return first.price - second.price;
      const comparison = first.name.localeCompare(second.name, 'pt-BR');
      return ingredientSort === 'name-desc' ? -comparison : comparison;
    });
  }, [ingredientCategoryFilter, ingredientFilter, ingredientSearch, ingredientSort, ingredients]);

  const beginIngredientEdit = (ingredient: AdminIngredient) => {
    setOpenIngredientMenu(null);
    setEditingIngredientId(ingredient.id);
    setEditingIngredientName(ingredient.name);
    setEditingIngredientPrice(String(ingredient.price));
    setEditingIngredientCategory(ingredient.category);
    setEditingIngredientImage(ingredient.image || null);
    setEditingIngredientImageChanged(false);
    setIngredientFeedback(null);
  };

  const uploadEditingIngredientImage = async (file?: File) => {
    if (!file) return;
    setEditingIngredientImageBusy(true);
    setIngredientFeedback(null);
    try {
      const image = await createPersistentImageDataUrl(file, 512, {
        targetWidth: 512,
        targetHeight: 512,
      });
      setEditingIngredientImage(image);
      setEditingIngredientImageChanged(true);
    } catch (error) {
      setIngredientFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Não foi possível carregar a imagem.',
      });
    } finally {
      setEditingIngredientImageBusy(false);
    }
  };

  const saveIngredientEdit = async (ingredient: AdminIngredient) => {
    const updated = {
      ...ingredient,
      name: editingIngredientName.trim(),
      price: Number(editingIngredientPrice),
      category: editingIngredientCategory.trim(),
    };
    const errors = validateIngredientDraft(updated, ingredients);
    if (errors.length) {
      setIngredientFeedback({ tone: 'error', message: errors[0] });
      return;
    }
    setIngredientBusy(`edit-${ingredient.id}`);
    setIngredientFeedback(null);
    try {
      await props.onUpdateIngredient(
        updated,
        editingIngredientImageChanged ? editingIngredientImage : undefined,
      );
      setEditingIngredientId(null);
      setEditingIngredientImageChanged(false);
      setIngredientFeedback({ tone: 'success', message: 'Ingrediente atualizado.' });
    } catch (error) {
      setIngredientFeedback({
        tone: 'error',
        message: errorMessage(error, 'Não foi possível atualizar o ingrediente.'),
      });
    } finally {
      setIngredientBusy(null);
    }
  };

  const toggleIngredient = async (ingredient: AdminIngredient) => {
    setOpenIngredientMenu(null);
    setIngredientBusy(`status-${ingredient.id}`);
    setIngredientFeedback(null);
    try {
      await props.onUpdateIngredient({ ...ingredient, active: !ingredient.active });
      setIngredientFeedback({
        tone: 'success',
        message: ingredient.active
          ? 'Ingrediente desativado. Ele não aparecerá em novas montagens.'
          : 'Ingrediente ativado e disponível para vincular aos produtos.',
      });
    } catch (error) {
      setIngredientFeedback({
        tone: 'error',
        message: errorMessage(error, 'Não foi possível alterar o ingrediente.'),
      });
    } finally {
      setIngredientBusy(null);
    }
  };

  const deleteIngredient = async (ingredient: AdminIngredient) => {
    setOpenIngredientMenu(null);
    const confirmed = await confirmDialog({
      title: 'Excluir ingrediente?',
      description: `“${ingredient.name}” será removido do catálogo. Se ele já estiver em um produto, desative-o em vez de excluir.`,
      confirmLabel: 'Excluir ingrediente',
      tone: 'danger',
    });
    if (!confirmed) return;
    setIngredientBusy(`delete-${ingredient.id}`);
    setIngredientFeedback(null);
    try {
      await props.onDeleteIngredient(ingredient.id);
      setIngredientFeedback({ tone: 'success', message: 'Ingrediente excluído.' });
    } catch (error) {
      setIngredientFeedback({
        tone: 'error',
        message: errorMessage(
          error,
          'Este ingrediente está em uso. Desative-o ou remova-o dos produtos primeiro.',
        ),
      });
    } finally {
      setIngredientBusy(null);
    }
  };

  const createCategory = async () => {
    const name = newCategory.trim();
    if (!name) return;
    setCategoryBusy(true);
    setCategoryFeedback('');
    try {
      await props.onCreateCategory(name);
      setNewCategory('');
      setCategoryFeedback('Categoria criada com sucesso.');
    } catch (error) {
      setCategoryFeedback(errorMessage(error, 'Não foi possível criar a categoria.'));
    } finally {
      setCategoryBusy(false);
    }
  };

  const renameCategory = async (category: AdminCategory) => {
    const name = await promptDialog({
      title: 'Renomear categoria',
      description: 'Escolha um nome claro para facilitar a organização do cardápio.',
      inputLabel: 'Novo nome',
      initialValue: category.name,
      confirmLabel: 'Salvar nome',
    });
    if (!name || name === category.name) return;
    setCategoryBusy(true);
    setCategoryFeedback('');
    try {
      await props.onUpdateCategory(category.id, { name });
      setCategoryFeedback('Categoria renomeada com sucesso.');
    } catch (error) {
      setCategoryFeedback(errorMessage(error, 'Não foi possível renomear a categoria.'));
    } finally {
      setCategoryBusy(false);
    }
  };

  const updateCategoryImage = async (category: AdminCategory, file?: File) => {
    if (!file) return;
    setCategoryBusy(true);
    setCategoryFeedback('');

    try {
      const image = await createPersistentImageDataUrl(file, 720, {
        targetWidth: 720,
        targetHeight: 720,
      });
      await props.onUpdateCategory(category.id, { image });
      setCategoryFeedback('Categoria atualizada com sucesso.');
    } catch (error) {
      setCategoryFeedback(errorMessage(error, 'Não foi possível atualizar a foto da categoria.'));
    } finally {
      setCategoryBusy(false);
    }
  };

  const removeCategoryImage = async (category: AdminCategory) => {
    const confirmed = await confirmDialog({
      title: 'Remover foto da categoria?',
      description: `A categoria “${category.name}” voltará a usar o ícone padrão na Home.`,
      confirmLabel: 'Remover foto',
      tone: 'danger',
    });
    if (!confirmed) return;

    setCategoryBusy(true);
    setCategoryFeedback('');
    try {
      await props.onUpdateCategory(category.id, { image: null });
      setCategoryFeedback('Categoria atualizada com sucesso.');
    } catch (error) {
      setCategoryFeedback(errorMessage(error, 'Não foi possível remover a foto da categoria.'));
    } finally {
      setCategoryBusy(false);
    }
  };

  const deleteCategory = async (category: AdminCategory) => {
    const confirmed = await confirmDialog({
      title: 'Excluir categoria?',
      description: `A categoria “${category.name}” será removida. Categorias com produtos não podem ser excluídas.`,
      confirmLabel: 'Excluir categoria',
      tone: 'danger',
    });
    if (!confirmed) return;
    setCategoryBusy(true);
    setCategoryFeedback('');
    try {
      await props.onDeleteCategory(category.id);
      setCategoryFeedback('Categoria excluída com sucesso.');
    } catch (error) {
      setCategoryFeedback(errorMessage(error, 'Não foi possível excluir a categoria.'));
    } finally {
      setCategoryBusy(false);
    }
  };

  if (props.importOpen) {
    return <AdminMenuImport onClose={props.onCloseImport} onImported={props.onImportComplete} />;
  }

  return (
    <>
      <S.CatalogTabs>
        <button
          className={catalogTab === 'products' ? 'primary' : ''}
          onClick={() => setCatalogTab('products')}
        >
          Produtos
        </button>
        <button
          className={catalogTab === 'combos' ? 'primary' : ''}
          onClick={() => setCatalogTab('combos')}
        >
          Combos
        </button>
        <button
          className={catalogTab === 'ingredients' ? 'primary' : ''}
          aria-label={`Ingredientes (${ingredients.length})`}
          onClick={() => setCatalogTab('ingredients')}
        >
          Ingredientes
        </button>
        <button
          className={catalogTab === 'categories' ? 'primary' : ''}
          onClick={() => setCatalogTab('categories')}
        >
          Categorias
        </button>
      </S.CatalogTabs>
      {catalogTab === 'combos' ? (
        <AdminCombos products={products} money={money} onChanged={props.onImportComplete} />
      ) : catalogTab === 'ingredients' ? (
        <S.IngredientWorkspace>
          <C.IngredientWorkflowHint>
            <CircleHelp /> <b>Como funciona?</b> <span>Cadastre</span> <ArrowRight />
            <span>Organize</span> <ArrowRight /> <span>Use nos produtos</span>
          </C.IngredientWorkflowHint>
          <S.IngredientPageHeader>
            <div>
              <h2>Ingredientes</h2>
              <p>Cadastre e organize ingredientes usados nos produtos.</p>
            </div>
            <button type="button" onClick={() => setIngredientWizardOpen(true)}>
              <Plus /> Novo ingrediente
            </button>
          </S.IngredientPageHeader>

          <datalist id="ingredient-category-options">
            {ingredientCategories.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>

          {ingredientFeedback && (
            <S.IngredientFeedback $tone={ingredientFeedback.tone} role="status">
              {ingredientFeedback.message}
            </S.IngredientFeedback>
          )}

          <S.IngredientListPanel>
            <aside className="ingredient-categories">
              <h3>Categorias</h3>
              <nav aria-label="Categorias de ingredientes">
                <button
                  aria-current={ingredientCategoryFilter === 'all' ? 'page' : undefined}
                  className={ingredientCategoryFilter === 'all' ? 'active' : ''}
                  type="button"
                  onClick={() => setIngredientCategoryFilter('all')}
                >
                  <LayoutGrid /> <span>Todos</span> <b>{ingredients.length}</b>
                </button>
                {ingredientCategories.map((category) => {
                  const categoryVisual = resolveCategoryVisual(category);
                  const CategoryIcon = categoryVisual.icon;

                  return (
                    <button
                      aria-current={ingredientCategoryFilter === category ? 'page' : undefined}
                      className={ingredientCategoryFilter === category ? 'active' : ''}
                      key={category}
                      type="button"
                      onClick={() => setIngredientCategoryFilter(category)}
                    >
                      <CategoryIcon aria-hidden="true" style={{ color: categoryVisual.color }} />{' '}
                      <span>{category}</span>{' '}
                      <b>{ingredients.filter((item) => item.category === category).length}</b>
                    </button>
                  );
                })}
              </nav>
            </aside>

            <section className="ingredient-library">
              <header className="ingredient-filters">
                <label className="ingredient-search">
                  <Search />
                  <input
                    aria-label="Buscar ingrediente"
                    value={ingredientSearch}
                    onChange={(event) => setIngredientSearch(event.target.value)}
                    placeholder="Buscar ingrediente..."
                  />
                </label>
                <select
                  aria-label="Filtrar ingredientes por categoria"
                  value={ingredientCategoryFilter}
                  onChange={(event) => setIngredientCategoryFilter(event.target.value)}
                >
                  <option value="all">Todas as categorias</option>
                  {ingredientCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Filtrar ingredientes por status"
                  value={ingredientFilter}
                  onChange={(event) =>
                    setIngredientFilter(event.target.value as 'all' | 'active' | 'inactive')
                  }
                >
                  <option value="all">Todos os status</option>
                  <option value="active">Disponíveis</option>
                  <option value="inactive">Inativos</option>
                </select>
                <select
                  aria-label="Ordenar ingredientes"
                  value={ingredientSort}
                  onChange={(event) =>
                    setIngredientSort(event.target.value as 'name-asc' | 'name-desc' | 'price-asc')
                  }
                >
                  <option value="name-asc">Ordenar: A-Z</option>
                  <option value="name-desc">Ordenar: Z-A</option>
                  <option value="price-asc">Menor preço</option>
                </select>
                <button
                  aria-label={
                    ingredientView === 'grid'
                      ? 'Exibir ingredientes em lista'
                      : 'Exibir ingredientes em grade'
                  }
                  className="view-toggle"
                  type="button"
                  onClick={() => setIngredientView((view) => (view === 'grid' ? 'list' : 'grid'))}
                >
                  {ingredientView === 'grid' ? <List /> : <LayoutGrid />}
                </button>
              </header>

              <div
                aria-label="Ingredientes cadastrados"
                className={`ingredient-list ${ingredientView}`}
                role="region"
              >
                {visibleIngredients.map((ingredient) => {
                  const editing = editingIngredientId === ingredient.id;
                  const busy = ingredientBusy?.endsWith(`-${ingredient.id}`);
                  const displayedImage = editing ? editingIngredientImage : ingredient.image;
                  return (
                    <article
                      className={`${ingredient.active ? '' : 'inactive'} ${editing ? 'editing' : ''}`.trim()}
                      key={ingredient.id}
                    >
                      <div className="ingredient-avatar">
                        <span>
                          {ingredient.name.trim().charAt(0).toLocaleUpperCase('pt-BR') || 'I'}
                        </span>
                        {displayedImage && (
                          <img
                            src={displayedImage}
                            alt=""
                            onError={(event) => {
                              event.currentTarget.hidden = true;
                            }}
                          />
                        )}
                      </div>
                      {editing ? (
                        <>
                          <div className="ingredient-edit-fields">
                            <input
                              aria-label="Editar nome do ingrediente"
                              maxLength={80}
                              value={editingIngredientName}
                              onChange={(event) => setEditingIngredientName(event.target.value)}
                            />
                            <input
                              aria-label="Editar categoria do ingrediente"
                              list="ingredient-category-options"
                              maxLength={60}
                              value={editingIngredientCategory}
                              onChange={(event) => setEditingIngredientCategory(event.target.value)}
                            />
                            <div className="money-input">
                              <span>R$</span>
                              <input
                                aria-label="Editar valor adicional"
                                type="number"
                                min="0"
                                max="9999"
                                step="0.01"
                                value={editingIngredientPrice}
                                onChange={(event) => setEditingIngredientPrice(event.target.value)}
                              />
                            </div>
                            <div className="edit-image-actions">
                              <label>
                                <UploadCloud />
                                {editingIngredientImage ? 'Trocar foto' : 'Adicionar foto'}
                                <input
                                  accept="image/jpeg,image/png,image/webp"
                                  disabled={editingIngredientImageBusy}
                                  type="file"
                                  onChange={(event) =>
                                    void uploadEditingIngredientImage(event.target.files?.[0])
                                  }
                                />
                              </label>
                              {editingIngredientImage && (
                                <button
                                  disabled={editingIngredientImageBusy}
                                  type="button"
                                  onClick={() => {
                                    setEditingIngredientImage(null);
                                    setEditingIngredientImageChanged(true);
                                  }}
                                >
                                  <ImageOff /> Remover foto
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="ingredient-actions">
                            <button
                              aria-label={`Salvar ${ingredient.name}`}
                              className="confirm"
                              disabled={busy}
                              onClick={() => void saveIngredientEdit(ingredient)}
                              type="button"
                            >
                              <Check />
                            </button>
                            <button
                              aria-label="Cancelar edição"
                              onClick={() => setEditingIngredientId(null)}
                              type="button"
                            >
                              <X />
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="ingredient-copy">
                            <b title={ingredient.name}>{ingredient.name}</b>
                            <span className="category-badge">{ingredient.category}</span>
                          </div>
                          <div className="ingredient-state">
                            <strong>{money(ingredient.price)}</strong>
                            <small>Preço sugerido</small>
                            <span className={ingredient.active ? 'available' : 'unavailable'}>
                              {ingredient.active ? 'Disponível' : 'Inativo'}
                            </span>
                          </div>
                          <div className="ingredient-menu-wrap">
                            <button
                              aria-expanded={openIngredientMenu === ingredient.id}
                              aria-label={`Opções de ${ingredient.name}`}
                              className="ingredient-menu-trigger"
                              disabled={busy}
                              type="button"
                              onClick={() =>
                                setOpenIngredientMenu((current) =>
                                  current === ingredient.id ? null : ingredient.id,
                                )
                              }
                            >
                              <MoreVertical />
                            </button>
                            {openIngredientMenu === ingredient.id && (
                              <div className="ingredient-menu">
                                <button
                                  type="button"
                                  onClick={() => beginIngredientEdit(ingredient)}
                                >
                                  <Pencil /> Editar ingrediente
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void toggleIngredient(ingredient)}
                                >
                                  <Power /> {ingredient.active ? 'Desativar' : 'Ativar'}
                                </button>
                                <button
                                  className="delete"
                                  type="button"
                                  onClick={() => void deleteIngredient(ingredient)}
                                >
                                  <Trash2 /> Excluir
                                </button>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </article>
                  );
                })}
              </div>
              {!visibleIngredients.length && (
                <S.EmptyCatalog>
                  {ingredients.length
                    ? 'Nenhum ingrediente corresponde aos filtros.'
                    : 'Nenhum ingrediente cadastrado. Comece em “Novo ingrediente”.'}
                </S.EmptyCatalog>
              )}
            </section>
          </S.IngredientListPanel>
          {ingredientWizardOpen && (
            <IngredientWizard
              categories={ingredientCategories}
              ingredients={ingredients}
              onClose={() => setIngredientWizardOpen(false)}
              onCreate={async (ingredient) => {
                const created = await props.onCreateIngredient(ingredient);
                setIngredientFeedback({
                  tone: 'success',
                  message: 'Ingrediente cadastrado com sucesso.',
                });
                return created;
              }}
              onUseInProduct={() => {
                setCatalogTab('products');
                props.onNewProduct();
              }}
            />
          )}
        </S.IngredientWorkspace>
      ) : catalogTab === 'categories' ? (
        <C.CategoryWorkspace>
          <C.CategoryPageHeader>
            <C.CategoryTitle>
              <span>
                <Tag /> Organização do cardápio
              </span>
              <h2>Categorias</h2>
              <p>Agrupe os produtos para o cliente encontrar o que procura com facilidade.</p>
            </C.CategoryTitle>
            <C.CategorySummary aria-label="Resumo das categorias">
              <div>
                <strong>{categories.length}</strong>
                <span>{categories.length === 1 ? 'categoria' : 'categorias'}</span>
              </div>
              <i aria-hidden="true" />
              <div>
                <strong>{products.length}</strong>
                <span>{products.length === 1 ? 'produto' : 'produtos'}</span>
              </div>
            </C.CategorySummary>
          </C.CategoryPageHeader>

          {categoryFeedback && (
            <C.CategoryFeedback
              $tone={categoryFeedback.startsWith('Categoria') ? 'success' : 'error'}
              role="status"
            >
              {categoryFeedback}
            </C.CategoryFeedback>
          )}

          <C.CategoryCreator
            onSubmit={(event) => {
              event.preventDefault();
              void createCategory();
            }}
          >
            <label htmlFor="new-menu-category">
              <b>Nova categoria</b>
              <span>Crie uma seção para organizar os próximos produtos.</span>
            </label>
            <div className="category-create-field">
              <Tag aria-hidden="true" />
              <input
                id="new-menu-category"
                value={newCategory}
                onChange={(event) => setNewCategory(event.target.value)}
                placeholder="Ex.: Pizzas especiais"
              />
              <button type="submit" disabled={categoryBusy || !newCategory.trim()}>
                <Plus />
                <span>{categoryBusy ? 'Criando...' : 'Criar categoria'}</span>
              </button>
            </div>
          </C.CategoryCreator>

          {categories.length > 0 ? (
            <C.CategoryGrid>
              {orderedCategories.map((category) => {
                const categoryProducts = products.filter(
                  (product) => product.categoryId === category.id,
                );
                const categoryImages = Array.from(
                  new Set(categoryProducts.map((product) => product.image.trim()).filter(Boolean)),
                ).slice(0, 3);
                const categoryVisual = resolveCategoryVisual(category.name);
                const CategoryIcon = categoryVisual.icon;
                const productCount = countProductsInCategory(products, category.id);

                return (
                  <C.CategoryCard
                    key={category.id}
                    data-category-card
                    data-category-id={category.id}
                    data-drag-source={draggingCategoryId === category.id ? 'true' : undefined}
                    tabIndex={0}
                    aria-label={`Categoria ${category.name}. Pressione e arraste o card para reorganizar. Use as setas do teclado para mover.`}
                    title="Pressione e arraste para reorganizar"
                    onPointerDown={(event) => beginCategoryDrag(event, category.id)}
                    onPointerMove={(event) => moveCategoryDrag(event, category.id)}
                    onPointerUp={(event) => void finishCategoryDrag(event, category.id)}
                    onPointerCancel={(event) => cancelCategoryDrag(event, category.id)}
                    onKeyDown={(event) => {
                      if (event.target !== event.currentTarget) return;
                      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
                        event.preventDefault();
                        void moveCategoryWithKeyboard(category.id, -1);
                      }
                      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
                        event.preventDefault();
                        void moveCategoryWithKeyboard(category.id, 1);
                      }
                    }}
                    onDragStart={(event) => event.preventDefault()}
                    ref={(element) => {
                      if (element) categoryCardRefs.current.set(category.id, element);
                      else categoryCardRefs.current.delete(category.id);
                    }}
                  >
                    <C.CategoryMedia
                      $color={categoryVisual.color}
                      $imageCount={category.image ? 1 : categoryImages.length}
                    >
                      {category.image ? (
                        <img
                          className="category-cover-image"
                          src={category.image}
                          alt={`Foto da categoria ${category.name}`}
                        />
                      ) : (
                        <>
                          {categoryImages.map((image, index) => (
                            <img
                              key={image}
                              src={image}
                              alt=""
                              loading={index ? 'lazy' : 'eager'}
                            />
                          ))}
                          {!categoryImages.length && (
                            <div className="category-media-empty">
                              <CategoryIcon aria-hidden="true" />
                              <span>Sem foto</span>
                            </div>
                          )}
                        </>
                      )}
                      <span className="category-product-count">
                        <Package aria-hidden="true" /> {productCount}
                      </span>
                    </C.CategoryMedia>

                    <C.CategoryCardBody>
                      <span className="category-position" aria-hidden="true">
                        {effectiveCategoryOrderIds.indexOf(category.id) + 1}
                      </span>
                      <div className="category-identity">
                        <span
                          className="category-icon"
                          style={{ color: categoryVisual.color }}
                          aria-hidden="true"
                        >
                          <CategoryIcon />
                        </span>
                        <div>
                          <h3>{category.name}</h3>
                          <p>{productCount === 1 ? '1 produto' : `${productCount} produtos`}</p>
                        </div>
                      </div>
                      <div className="category-image-actions">
                        <label className="category-image-upload">
                          <UploadCloud aria-hidden="true" />
                          <span>{category.image ? 'Trocar foto' : 'Adicionar foto'}</span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            disabled={categoryBusy}
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              event.currentTarget.value = '';
                              void updateCategoryImage(category, file);
                            }}
                          />
                        </label>
                        {category.image ? (
                          <button
                            className="category-image-remove"
                            type="button"
                            disabled={categoryBusy}
                            onClick={() => void removeCategoryImage(category)}
                          >
                            <ImageOff aria-hidden="true" />
                            <span>Remover foto</span>
                          </button>
                        ) : null}
                      </div>

                      <div className="category-card-actions">
                        <button
                          className="category-rename"
                          disabled={categoryBusy}
                          onClick={() => void renameCategory(category)}
                          type="button"
                        >
                          <Pencil aria-hidden="true" />
                          <span>Renomear</span>
                        </button>
                        <button
                          className="category-delete"
                          aria-label={`Excluir ${category.name}`}
                          title={`Excluir ${category.name}`}
                          disabled={categoryBusy}
                          onClick={() => void deleteCategory(category)}
                          type="button"
                        >
                          <Trash2 aria-hidden="true" />
                        </button>
                      </div>
                    </C.CategoryCardBody>
                  </C.CategoryCard>
                );
              })}
            </C.CategoryGrid>
          ) : (
            <C.CategoryEmptyState>
              <Tag aria-hidden="true" />
              <h3>Nenhuma categoria cadastrada</h3>
              <p>Crie a primeira categoria no campo acima.</p>
            </C.CategoryEmptyState>
          )}
        </C.CategoryWorkspace>
      ) : (
        <>
          <CatalogAiImageGenerator products={products} onCompleted={props.onImportComplete} />
          <C.ProductToolbar>
            <label className="product-search">
              <Search />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar produto..."
              />
            </label>
            <select
              aria-label="Filtrar produtos por categoria"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="">Todas as categorias</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <button aria-label="Exibir produtos em grade" type="button">
              <LayoutGrid />
            </button>
          </C.ProductToolbar>
          <S.ProductGrid>
            {visibleProducts.map((product) => (
              <S.Product key={product.id}>
                {product.image ? (
                  <img src={product.image} alt="" />
                ) : (
                  <C.ProductImageFallback className="product-image-fallback">
                    <ImageOff />
                  </C.ProductImageFallback>
                )}
                <div className="product-copy">
                  <b>{product.name}</b>
                  <span>{product.category}</span>
                  <footer>
                    <strong>
                      {product.pricingMode === 'HIGHEST_OPTION'
                        ? 'Preço dinâmico'
                        : money(product.price)}
                    </strong>
                    <div className="product-actions">
                      <button
                        className="product-menu-trigger"
                        type="button"
                        aria-label={`Opções de ${product.name}`}
                        onClick={() =>
                          setOpenProductMenu((current) =>
                            current === product.id ? null : product.id,
                          )
                        }
                      >
                        <MoreVertical size={20} />
                      </button>
                      {openProductMenu === product.id && (
                        <div className="product-menu">
                          <button
                            type="button"
                            onClick={() => {
                              setOpenProductMenu(null);
                              props.onEditProduct(product);
                            }}
                          >
                            Editar produto
                          </button>
                          <button
                            className="danger"
                            type="button"
                            onClick={() =>
                              void (async () => {
                                const confirmed = await confirmDialog({
                                  title: 'Excluir produto?',
                                  description: `“${product.name}” será removido permanentemente do cardápio.`,
                                  confirmLabel: 'Excluir produto',
                                  tone: 'danger',
                                });
                                if (!confirmed) return;
                                setOpenProductMenu(null);
                                await props.onDeleteProduct(product.id);
                              })()
                            }
                          >
                            Excluir produto
                          </button>
                        </div>
                      )}
                    </div>
                  </footer>
                  <span className="product-mode">
                    {product.saleMode === 'BUILDABLE' ? 'Personalizável' : 'Pronto'}
                  </span>
                </div>
              </S.Product>
            ))}
            <C.NewProductTile type="button" onClick={props.onNewProduct}>
              <Plus /> <span>Novo produto</span>
            </C.NewProductTile>
          </S.ProductGrid>
          {!visibleProducts.length && products.length > 0 && (
            <S.EmptyCatalog>Nenhum produto encontrado.</S.EmptyCatalog>
          )}
          {!products.length && (
            <S.EmptyCatalog>Nenhum produto cadastrado. Comece em “Novo produto”.</S.EmptyCatalog>
          )}
        </>
      )}
    </>
  );
}
