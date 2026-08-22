import { useMemo, useState } from 'react';
import {
  Check,
  CircleDollarSign,
  Layers3,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useAppDialog } from '../../../components/AppDialog/context';
import * as S from '../Admin.styles';
import type { AdminCategory, AdminIngredient, AdminProduct } from '../types';
import {
  countProductsInCategory,
  filterAdminProducts,
  groupIngredientsByCategory,
  listIngredientCategories,
} from '../domain/adminCatalog';
import { validateIngredientDraft } from '../domain/productCustomizationValidation';

type AdminCatalogProps = {
  products: AdminProduct[];
  categories: AdminCategory[];
  ingredients: AdminIngredient[];
  money: (value: number) => string;
  onEditProduct: (product: AdminProduct) => void;
  onDeleteProduct: (id: string) => Promise<void>;
  onNewProduct: () => void;
  onCreateCategory: (name: string) => Promise<void>;
  onUpdateCategory: (id: number, name: string) => Promise<void>;
  onDeleteCategory: (id: number) => Promise<void>;
  onCreateIngredient: (ingredient: Omit<AdminIngredient, 'id'>) => Promise<void>;
  onUpdateIngredient: (ingredient: AdminIngredient) => Promise<void>;
  onDeleteIngredient: (id: number) => Promise<void>;
};

function errorMessage(error: unknown, fallback: string) {
  if (!error || typeof error !== 'object') return fallback;
  const response = (error as { response?: { data?: Record<string, unknown> } }).response;
  return String(response?.data?.error || response?.data?.message || fallback);
}

export function AdminCatalog(props: AdminCatalogProps) {
  const { products, categories, ingredients, money } = props;
  const { confirmDialog, promptDialog } = useAppDialog();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [categoryBusy, setCategoryBusy] = useState(false);
  const [categoryFeedback, setCategoryFeedback] = useState('');
  const [openProductMenu, setOpenProductMenu] = useState<string | null>(null);
  const [catalogTab, setCatalogTab] = useState<'products' | 'ingredients'>('products');
  const [ingredientName, setIngredientName] = useState('');
  const [ingredientPrice, setIngredientPrice] = useState('0');
  const [ingredientCategory, setIngredientCategory] = useState('');
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [ingredientFilter, setIngredientFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [ingredientCategoryFilter, setIngredientCategoryFilter] = useState('all');
  const [editingIngredientId, setEditingIngredientId] = useState<number | null>(null);
  const [editingIngredientName, setEditingIngredientName] = useState('');
  const [editingIngredientPrice, setEditingIngredientPrice] = useState('0');
  const [editingIngredientCategory, setEditingIngredientCategory] = useState('');
  const [ingredientBusy, setIngredientBusy] = useState<string | null>(null);
  const [ingredientFeedback, setIngredientFeedback] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);
  const visibleProducts = useMemo(
    () => filterAdminProducts(products, search, categoryFilter),
    [products, search, categoryFilter],
  );
  const productGroups = useMemo(
    () =>
      categories
        .map((category) => ({
          category,
          products: visibleProducts.filter((product) => product.categoryId === category.id),
        }))
        .filter((group) => group.products.length > 0),
    [categories, visibleProducts],
  );
  const ingredientCategories = useMemo(
    () => listIngredientCategories(ingredients),
    [ingredients],
  );
  const visibleIngredients = useMemo(() => {
    const normalizedSearch = ingredientSearch.trim().toLocaleLowerCase('pt-BR');
    return ingredients.filter((ingredient) => {
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
  }, [ingredientCategoryFilter, ingredientFilter, ingredientSearch, ingredients]);
  const visibleIngredientGroups = useMemo(
    () => groupIngredientsByCategory(visibleIngredients),
    [visibleIngredients],
  );

  const createIngredient = async () => {
    const draft = {
      name: ingredientName.trim(),
      price: Number(ingredientPrice),
      category: ingredientCategory.trim(),
    };
    const errors = validateIngredientDraft(draft, ingredients);
    if (errors.length) {
      setIngredientFeedback({ tone: 'error', message: errors[0] });
      return;
    }
    setIngredientBusy('create');
    setIngredientFeedback(null);
    try {
      await props.onCreateIngredient({ ...draft, active: true });
      setIngredientName('');
      setIngredientPrice('0');
      setIngredientCategory('');
      setIngredientFeedback({ tone: 'success', message: 'Ingrediente cadastrado com sucesso.' });
    } catch (error) {
      setIngredientFeedback({
        tone: 'error',
        message: errorMessage(error, 'Não foi possível cadastrar o ingrediente.'),
      });
    } finally {
      setIngredientBusy(null);
    }
  };

  const beginIngredientEdit = (ingredient: AdminIngredient) => {
    setEditingIngredientId(ingredient.id);
    setEditingIngredientName(ingredient.name);
    setEditingIngredientPrice(String(ingredient.price));
    setEditingIngredientCategory(ingredient.category);
    setIngredientFeedback(null);
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
      await props.onUpdateIngredient(updated);
      setEditingIngredientId(null);
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
      await props.onUpdateCategory(category.id, name);
      setCategoryFeedback('Categoria renomeada com sucesso.');
    } catch (error) {
      setCategoryFeedback(errorMessage(error, 'Não foi possível renomear a categoria.'));
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

  return (
    <>
      <S.CatalogTabs>
        <button className={catalogTab === 'products' ? 'primary' : ''} onClick={() => setCatalogTab('products')}>Produtos</button>
        <button className={catalogTab === 'ingredients' ? 'primary' : ''} onClick={() => setCatalogTab('ingredients')}>Ingredientes ({ingredients.length})</button>
      </S.CatalogTabs>
      {catalogTab === 'ingredients' ? (
        <S.IngredientWorkspace>
          <S.IngredientHero>
            <div className="hero-icon"><Layers3 /></div>
            <div>
              <span>CATÁLOGO DO RESTAURANTE</span>
              <h2>Ingredientes e opções</h2>
              <p>
                Cadastre uma vez e reutilize em grupos como massa, tamanho, borda, molhos e
                adicionais.
              </p>
            </div>
            <dl>
              <div><dt>Total</dt><dd>{ingredients.length}</dd></div>
              <div><dt>Disponíveis</dt><dd>{ingredients.filter((item) => item.active).length}</dd></div>
            </dl>
          </S.IngredientHero>

          <S.IngredientForm
            onSubmit={(event) => {
              event.preventDefault();
              void createIngredient();
            }}
          >
            <div className="form-heading">
              <div className="form-icon"><CircleDollarSign /></div>
              <div>
                <h3>Novo ingrediente</h3>
                <p>O preço informado será somado ao valor base do produto.</p>
              </div>
            </div>
            <label>
              Nome do ingrediente
              <input
                maxLength={80}
                value={ingredientName}
                onChange={(event) => setIngredientName(event.target.value)}
                placeholder="Ex.: Massa grossa, bacon ou molho branco"
              />
            </label>
            <label>
              Categoria
              <input
                required
                list="ingredient-category-options"
                maxLength={60}
                value={ingredientCategory}
                onChange={(event) => setIngredientCategory(event.target.value)}
                placeholder="Escolha ou crie. Ex.: Massas"
              />
              <datalist id="ingredient-category-options">
                {ingredientCategories.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
            </label>
            <label>
              Valor adicional
              <div className="money-input"><span>R$</span><input
                type="number"
                min="0"
                max="9999"
                step="0.01"
                value={ingredientPrice}
                onChange={(event) => setIngredientPrice(event.target.value)}
                aria-label="Valor adicional do ingrediente"
              /></div>
            </label>
            <button className="create-ingredient" disabled={ingredientBusy === 'create'} type="submit">
              <Plus /> {ingredientBusy === 'create' ? 'Cadastrando...' : 'Cadastrar ingrediente'}
            </button>
          </S.IngredientForm>

          {ingredientFeedback && (
            <S.IngredientFeedback $tone={ingredientFeedback.tone} role="status">
              {ingredientFeedback.message}
            </S.IngredientFeedback>
          )}

          <S.IngredientListPanel>
            <header>
              <div>
                <h3>Ingredientes cadastrados</h3>
                <p>Edite preços e disponibilidade sem recriar o ingrediente.</p>
              </div>
              <div className="ingredient-filters">
                <label className="ingredient-search">
                  <Search />
                  <input
                    value={ingredientSearch}
                    onChange={(event) => setIngredientSearch(event.target.value)}
                    placeholder="Buscar ingrediente"
                  />
                </label>
                <select
                  aria-label="Filtrar ingredientes por status"
                  value={ingredientFilter}
                  onChange={(event) =>
                    setIngredientFilter(event.target.value as 'all' | 'active' | 'inactive')
                  }
                >
                  <option value="all">Todos</option>
                  <option value="active">Disponíveis</option>
                  <option value="inactive">Inativos</option>
                </select>
                <select
                  aria-label="Filtrar ingredientes por categoria"
                  value={ingredientCategoryFilter}
                  onChange={(event) => setIngredientCategoryFilter(event.target.value)}
                >
                  <option value="all">Todas as categorias</option>
                  {ingredientCategories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </header>

            <div className="ingredient-list">
              {visibleIngredientGroups.map((categoryGroup) => (
                <section className="ingredient-category-group" key={categoryGroup.category}>
                  <div className="ingredient-category-heading">
                    <b>{categoryGroup.category}</b>
                    <span>{categoryGroup.ingredients.length} ingrediente(s)</span>
                  </div>
                  <div className="ingredient-category-items">
              {categoryGroup.ingredients.map((ingredient) => {
                const editing = editingIngredientId === ingredient.id;
                const busy = ingredientBusy?.endsWith(`-${ingredient.id}`);
                return (
                  <article className={ingredient.active ? '' : 'inactive'} key={ingredient.id}>
                    <div className="ingredient-avatar">
                      {ingredient.name.trim().charAt(0).toLocaleUpperCase('pt-BR') || 'I'}
                    </div>
                    {editing ? (
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
                        <div className="money-input"><span>R$</span><input
                          aria-label="Editar valor adicional"
                          type="number"
                          min="0"
                          max="9999"
                          step="0.01"
                          value={editingIngredientPrice}
                          onChange={(event) => setEditingIngredientPrice(event.target.value)}
                        /></div>
                      </div>
                    ) : (
                      <div className="ingredient-copy">
                        <b>{ingredient.name}</b>
                        <div className="ingredient-badges">
                          <span className="category-badge">{ingredient.category}</span>
                          <span className={ingredient.active ? 'available' : 'unavailable'}>
                            {ingredient.active ? 'Disponível' : 'Inativo'}
                          </span>
                        </div>
                      </div>
                    )}
                    {!editing && <strong>{money(ingredient.price)}</strong>}
                    <div className="ingredient-actions">
                      {editing ? (
                        <>
                          <button
                            aria-label={`Salvar ${ingredient.name}`}
                            className="confirm"
                            disabled={busy}
                            onClick={() => void saveIngredientEdit(ingredient)}
                            type="button"
                          ><Check /></button>
                          <button
                            aria-label="Cancelar edição"
                            onClick={() => setEditingIngredientId(null)}
                            type="button"
                          ><X /></button>
                        </>
                      ) : (
                        <>
                          <button
                            aria-label={`Editar ${ingredient.name}`}
                            disabled={busy}
                            onClick={() => beginIngredientEdit(ingredient)}
                            type="button"
                          ><Pencil /></button>
                          <button
                            className="status-button"
                            disabled={busy}
                            onClick={() => void toggleIngredient(ingredient)}
                            type="button"
                          >{ingredient.active ? 'Desativar' : 'Ativar'}</button>
                          <button
                            aria-label={`Excluir ${ingredient.name}`}
                            className="delete"
                            disabled={busy}
                            onClick={() => void deleteIngredient(ingredient)}
                            type="button"
                          ><Trash2 /></button>
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
                  </div>
                </section>
              ))}
            </div>
            {!visibleIngredients.length && (
              <S.EmptyCatalog>
                {ingredients.length
                  ? 'Nenhum ingrediente corresponde aos filtros.'
                  : 'Nenhum ingrediente cadastrado. Comece pelo formulário acima.'}
              </S.EmptyCatalog>
            )}
          </S.IngredientListPanel>
        </S.IngredientWorkspace>
      ) : <>
      <S.Toolbar>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar produto"
        />
        <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
          <option value="">Todas as categorias</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <button onClick={props.onNewProduct}>+ Novo produto</button>
      </S.Toolbar>
      <S.ProductGroups>
        {productGroups.map(({ category, products: groupedProducts }) => (
          <section key={category.id}>
            <S.ProductCategoryTitle>
              {category.name}
              <span>{groupedProducts.length} produto(s)</span>
            </S.ProductCategoryTitle>
            <S.ProductGrid>
              {groupedProducts.map((product) => (
                <S.Product key={product.id}>
                  {product.image && <img src={product.image} alt="" />}
                  <div>
                    <b>{product.name}</b>
                    <span>
                      {product.category} • {product.active ? 'Disponível' : 'Indisponível'} •{' '}
                      {product.stock == null ? 'Estoque ilimitado' : `${product.stock} em estoque`}
                    </span>
                    <footer>
                      <strong>{money(product.price)}</strong>
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
                  </div>
                </S.Product>
              ))}
            </S.ProductGrid>
          </section>
        ))}
        {!productGroups.length && <S.EmptyCatalog>Nenhum produto encontrado.</S.EmptyCatalog>}
      </S.ProductGroups>
      <S.Card style={{ marginTop: 24 }}>
        <h2>Gerenciar categorias</h2>
        <p>Crie categorias e use as ações ao lado de cada item para renomear ou excluir.</p>
        {categoryFeedback && (
          <p
            role="alert"
            style={{
              color: categoryFeedback.startsWith('Categoria') ? '#166534' : '#b91c1c',
            }}
          >
            {categoryFeedback}
          </p>
        )}
        <S.Toolbar>
          <input
            value={newCategory}
            onChange={(event) => setNewCategory(event.target.value)}
            placeholder="Nome da nova categoria"
          />
          <button
            disabled={categoryBusy || !newCategory.trim()}
            onClick={() => void createCategory()}
          >
            {categoryBusy ? 'Salvando...' : '+ Criar categoria'}
          </button>
        </S.Toolbar>
        <S.DataList>
          {categories.map((category) => (
            <div className="data-row" key={category.id}>
              <div>
                <b>{category.name}</b>
                <span>{countProductsInCategory(products, category.id)} produto(s)</span>
              </div>
              <div className="category-actions">
                <button disabled={categoryBusy} onClick={() => void renameCategory(category)}>
                  Renomear
                </button>
                <button
                  className="category-delete"
                  disabled={categoryBusy}
                  onClick={() => void deleteCategory(category)}
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </S.DataList>
      </S.Card>
      </>}
    </>
  );
}
