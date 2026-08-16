import { useMemo, useState } from 'react';
import { MoreVertical } from 'lucide-react';
import { useAppDialog } from '../../../components/AppDialog/context';
import * as S from '../Admin.styles';
import type { AdminCategory, AdminProduct } from '../types';
import { countProductsInCategory, filterAdminProducts } from '../domain/adminCatalog';

type AdminCatalogProps = {
  products: AdminProduct[];
  categories: AdminCategory[];
  money: (value: number) => string;
  onEditProduct: (product: AdminProduct) => void;
  onDeleteProduct: (id: string) => Promise<void>;
  onNewProduct: () => void;
  onCreateCategory: (name: string) => Promise<void>;
  onUpdateCategory: (id: number, name: string) => Promise<void>;
  onDeleteCategory: (id: number) => Promise<void>;
};

function errorMessage(error: unknown, fallback: string) {
  if (!error || typeof error !== 'object') return fallback;
  const response = (error as { response?: { data?: Record<string, unknown> } }).response;
  return String(response?.data?.error || response?.data?.message || fallback);
}

export function AdminCatalog(props: AdminCatalogProps) {
  const { products, categories, money } = props;
  const { confirmDialog, promptDialog } = useAppDialog();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [categoryBusy, setCategoryBusy] = useState(false);
  const [categoryFeedback, setCategoryFeedback] = useState('');
  const [openProductMenu, setOpenProductMenu] = useState<string | null>(null);
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
    </>
  );
}
