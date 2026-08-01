import {
  useMemo,
  useState,
  type ChangeEvent,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";
import {
  Check,
  Clock,
  Eye,
  EyeOff,
  ChevronDown,
  PlusCircle,
  Image as ImageIcon,
  Loader2,
  FolderPlus,
  Package,
  Pencil,
  Search,
  Sparkles,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";

import { resolveCategoryIcon } from "../../../config/categoryIconMap";
import * as S from "../styles";
import ImportMenuFromImageTab from "./ImportMenuFromImageTab";
import IfoodImportTab from "./IfoodImportTab";
type ActiveTab =
  | "categories"
  | "products"
  | "products-manage"
  | "tables"
  | "employees";

type Category = {
  id: number;
  name: string;
};

type Product = {
  id: number;
  name: string;
  description?: string;
  image?: string;
  price?: number | string;
  active?: boolean;
  stock?: number | null;
  categoryId?: number | null;
  preparationTime?: number | null;
  featured?: boolean;
  category?: {
    name?: string;
    id?: number;
  };
};

type Table = {
  id: number;
  number: number;
  active?: boolean;
};

type Employee = {
  id: number;
  name: string;
  email: string;
  phone?: string;
};

type ProductForm = {
  name: string;
  description: string;
  image: string;
  price: string;
  categoryId: string;
  preparationTime: string;
  stock: string;
  featured: boolean;
  active: boolean;
};

type EmployeeData = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  cpf: string;
  role: string;
};

type MaybePromise<T = void> = T | Promise<T>;

type OperationalTabsProps = {
  activeTab: ActiveTab;
  categories: Category[];
  deletingCategoryId: number | null;
  categoryName: string;
  setCategoryName: Dispatch<SetStateAction<string>>;
  handleCreateCategory: (event: FormEvent<HTMLFormElement>) => MaybePromise;
  editingCategoryId: number | null;
  editingCategoryName: string;
  setEditingCategoryName: Dispatch<SetStateAction<string>>;
  handleSaveEditCategory: (categoryId: number) => MaybePromise;
  handleCancelEditCategory: () => void;
  handleStartEditCategory: (category: Category) => void;
  handleDeleteCategory: (categoryId: number) => MaybePromise;
  handleCreateProduct: (event: FormEvent<HTMLFormElement>) => MaybePromise;
  handleSubmitProduct: (event: FormEvent<HTMLFormElement>) => MaybePromise;
  productForm: ProductForm;
  deletingProductId: number | null;
  handleProductInputChange: (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
  productSearchTerm: string;
  setProductSearchTerm: Dispatch<SetStateAction<string>>;
  products: Product[];
  handleStartEditProduct: (product: Product) => void;
  handleDeleteProduct: (productId: number) => MaybePromise;
  editingProductId: number | null;
  handleCancelEditProduct: () => void;
  handleCreateTable: (event: FormEvent<HTMLFormElement>) => MaybePromise;
  tableNumber: string;
  setTableNumber: Dispatch<SetStateAction<string>>;
  tables: Table[];
  deactivatingTableIds: number[];
  activatingTableIds: number[];
  getTableQrValue: (table: Table) => string;
  qrCardRefs: { current: Record<number, HTMLDivElement> };
  handlePreviewTableQr: (table: Table) => void;
  handleCopyTableQrLink: (table: Table) => MaybePromise;
  handleDownloadTableQr: (table: Table) => void;
  handlePrintTableQr: (table: Table) => void;
  handleDeactivateTable: (table: Table) => MaybePromise;
  handleActivateTable: (table: Table) => MaybePromise;
  handleCreateEmployee: (event: FormEvent<HTMLFormElement>) => MaybePromise;
  employeeData: EmployeeData;
  setEmployeeData: Dispatch<SetStateAction<EmployeeData>>;
  showPassword: boolean;
  setShowPassword: Dispatch<SetStateAction<boolean>>;
  employees: Employee[];
  handleDeactivateEmployee: (employeeId: number) => MaybePromise;
  restaurantId?: number | null;
  onImportedCatalog?: () => void | Promise<void>;
  onNavigateTab?: (tab: ActiveTab) => void;
};

export default function OperationalTabs({
  activeTab,
  categories,
  deletingCategoryId,
  categoryName,
  setCategoryName,
  handleCreateCategory,
  editingCategoryId,
  editingCategoryName,
  setEditingCategoryName,
  handleSaveEditCategory,
  handleCancelEditCategory,
  handleStartEditCategory,
  handleDeleteCategory,
  handleCreateProduct,
  handleSubmitProduct,
  productForm,
  deletingProductId,
  handleProductInputChange,
  productSearchTerm,
  setProductSearchTerm,
  products,
  handleStartEditProduct,
  handleDeleteProduct,
  editingProductId,
  handleCancelEditProduct: _handleCancelEditProduct,
  handleCreateTable: _handleCreateTable,
  tableNumber: _tableNumber,
  setTableNumber: _setTableNumber,
  tables,
  deactivatingTableIds: _deactivatingTableIds,
  activatingTableIds: _activatingTableIds,
  getTableQrValue: _getTableQrValue,
  qrCardRefs: _qrCardRefs,
  handlePreviewTableQr: _handlePreviewTableQr,
  handleCopyTableQrLink: _handleCopyTableQrLink,
  handleDownloadTableQr: _handleDownloadTableQr,
  handlePrintTableQr: _handlePrintTableQr,
  handleDeactivateTable: _handleDeactivateTable,
  handleActivateTable: _handleActivateTable,
  handleCreateEmployee,
  employeeData,
  setEmployeeData,
  showPassword,
  setShowPassword,
  employees,
  handleDeactivateEmployee,
  restaurantId,
  onImportedCatalog,
}: OperationalTabsProps) {
  const [tableFilter, _setTableFilter] = useState<
    "ATIVAS" | "INATIVAS" | "TODAS"
  >("ATIVAS");
  const [isProductsDrawerOpen, setIsProductsDrawerOpen] = useState(true);
  const [openProductPanel, setOpenProductPanel] = useState<
    "create" | "ifood" | "ai" | "manage" | "categories"
  >("create");

  const _tableCounters = useMemo(() => {
    const total = tables.length;
    const activeCount = tables.filter(
      (table) => table?.active !== false,
    ).length;
    const inactiveCount = tables.filter(
      (table) => table?.active === false,
    ).length;

    return {
      total,
      activeCount,
      inactiveCount,
    };
  }, [tables]);

  const _filteredTables = useMemo(() => {
    if (tableFilter === "TODAS") {
      return tables;
    }

    if (tableFilter === "INATIVAS") {
      return tables.filter((table) => table?.active === false);
    }

    return tables.filter((table) => table?.active !== false);
  }, [tableFilter, tables]);

  const filteredProducts = useMemo(() => {
    const term = productSearchTerm.trim().toLowerCase();

    if (!term) {
      return products;
    }

    return products.filter((product) => {
      const name = String(product?.name || "").toLowerCase();
      const categoryName = String(product?.category?.name || "").toLowerCase();
      const description = String(product?.description || "").toLowerCase();
      const productId = String(product?.id || "");

      return (
        name.includes(term) ||
        categoryName.includes(term) ||
        description.includes(term) ||
        productId.includes(term)
      );
    });
  }, [productSearchTerm, products]);

  return (
    <>
      {activeTab === "categories" && (
        <S.FormCard>
          <S.PageHeader>
            <h2>Nova Categoria</h2>
            <p>
              O icone da categoria e definido automaticamente com base no nome
              cadastrado.
            </p>
          </S.PageHeader>

          <form onSubmit={handleCreateCategory}>
            <S.FormGroup>
              <label>Nome da Categoria</label>
              <input
                type="text"
                placeholder="Ex: Hamburgueres Artesanais, Bebidas, Pizzas..."
                value={categoryName}
                disabled={deletingCategoryId !== null}
                onChange={(event) => setCategoryName(event.target.value)}
                required
              />
            </S.FormGroup>
            <S.SubmitBtn
              type="submit"
              style={{ marginTop: "1.5rem" }}
              disabled={deletingCategoryId !== null}
            >
              Salvar Categoria
            </S.SubmitBtn>
          </form>

          <div style={{ marginTop: "1.5rem", display: "grid", gap: "0.5rem" }}>
            {categories.map((category) => {
              const Icon = resolveCategoryIcon(category?.name);
              const isDeletingAnyCategory = deletingCategoryId !== null;
              const isEditing =
                Number(editingCategoryId) === Number(category.id);
              const isDeleting =
                Number(deletingCategoryId) === Number(category.id);

              return (
                <S.CategoryListItem key={category.id}>
                  {isEditing ? (
                    <S.CategoryInlineEditor>
                      <input
                        type="text"
                        disabled={isDeletingAnyCategory}
                        value={editingCategoryName}
                        onChange={(event) =>
                          setEditingCategoryName(event.target.value)
                        }
                        placeholder="Nome da categoria"
                      />
                      <S.CategoryActionButton
                        type="button"
                        disabled={isDeletingAnyCategory}
                        onClick={() => handleSaveEditCategory(category.id)}
                        title="Salvar"
                      >
                        <Check size={15} />
                      </S.CategoryActionButton>
                      <S.CategoryActionButton
                        type="button"
                        disabled={isDeletingAnyCategory}
                        onClick={handleCancelEditCategory}
                        title="Cancelar"
                      >
                        <X size={15} />
                      </S.CategoryActionButton>
                    </S.CategoryInlineEditor>
                  ) : (
                    <>
                      <S.SlugBadge>
                        <Icon size={15} />
                        {category.name}
                      </S.SlugBadge>
                      <S.CategoryActions>
                        <S.CategoryActionButton
                          type="button"
                          disabled={isDeletingAnyCategory}
                          onClick={() => handleStartEditCategory(category)}
                          title="Editar categoria"
                        >
                          <Pencil size={15} />
                        </S.CategoryActionButton>
                        <S.CategoryActionButton
                          type="button"
                          onClick={() => handleDeleteCategory(category.id)}
                          title="Excluir categoria"
                          disabled={isDeletingAnyCategory}
                        >
                          {isDeleting ? (
                            <Loader2 size={15} className="loading-icon" />
                          ) : (
                            <Trash2 size={15} />
                          )}
                        </S.CategoryActionButton>
                      </S.CategoryActions>
                    </>
                  )}
                </S.CategoryListItem>
              );
            })}
          </div>
        </S.FormCard>
      )}

      {activeTab === "products" && (
        <S.FormCard>
          <div style={{ display: "grid", gap: "0.85rem" }}>
            <button
              type="button"
              onClick={() => setIsProductsDrawerOpen((current) => !current)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.85rem",
                border: "1px solid rgba(234, 29, 44, 0.24)",
                background: isProductsDrawerOpen
                  ? "linear-gradient(135deg, #ea1d2c 0%, #b8141f 100%)"
                  : "rgba(234, 29, 44, 0.08)",
                color: isProductsDrawerOpen ? "#ffffff" : "#9f1239",
                borderRadius: 18,
                padding: "0.95rem 1rem",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: isProductsDrawerOpen
                  ? "0 16px 28px rgba(184, 20, 31, 0.18)"
                  : "none",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <FolderPlus size={16} />
                Aba lateral de produtos
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  opacity: 0.96,
                }}
              >
                {isProductsDrawerOpen ? "Fechar" : "Abrir"}
                <ChevronDown
                  size={16}
                  style={{
                    transform: isProductsDrawerOpen
                      ? "rotate(180deg)"
                      : "rotate(0deg)",
                    transition: "transform 0.2s ease",
                  }}
                />
              </span>
            </button>

            <div
              style={{
                display: isProductsDrawerOpen ? "grid" : "none",
                gap: "0.85rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                  padding: "0.2rem 0 0.1rem",
                }}
              >
                {[
                  { key: "create", label: "Criar Produto", icon: PlusCircle },
                  { key: "ifood", label: "Importar iFood", icon: ImageIcon },
                  { key: "ai", label: "Importar IA", icon: Sparkles },
                  { key: "manage", label: "Gerenciar Produtos", icon: Package },
                  { key: "categories", label: "Categorias", icon: FolderPlus },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = openProductPanel === item.key;

                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() =>
                        setOpenProductPanel(item.key as typeof openProductPanel)
                      }
                      style={{
                        border: "1px solid rgba(234, 29, 44, 0.24)",
                        background: isActive
                          ? "linear-gradient(135deg, #ea1d2c 0%, #b8141f 100%)"
                          : "rgba(234, 29, 44, 0.08)",
                        color: isActive ? "#ffffff" : "#9f1239",
                        borderRadius: 999,
                        padding: "0.55rem 0.9rem",
                        fontWeight: 800,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Icon size={14} />
                      {item.label}
                    </button>
                  );
                })}
              </div>

              {openProductPanel === "create" && (
                <div
                  style={{
                    border: "1px solid rgba(234, 29, 44, 0.15)",
                    borderRadius: 16,
                    padding: "1rem",
                    background: "rgba(255,255,255,0.9)",
                    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
                  }}
                >
                  <S.PageHeader style={{ marginBottom: "1rem" }}>
                    <h2>Novo Produto do Cardapio</h2>
                    <p>Use esta aba para cadastrar um item manualmente.</p>
                  </S.PageHeader>

                  <form onSubmit={handleCreateProduct}>
                    <S.FormRow>
                      <S.FormGroup style={{ flex: 2 }}>
                        <label>Nome do Produto *</label>
                        <input
                          type="text"
                          name="name"
                          placeholder="Ex: Burger Duplo Bacon Cheddar"
                          value={productForm.name}
                          disabled={deletingProductId !== null}
                          onChange={handleProductInputChange}
                          required
                        />
                      </S.FormGroup>
                      <S.FormGroup style={{ flex: 1 }}>
                        <label>Categoria *</label>
                        <select
                          name="categoryId"
                          value={productForm.categoryId}
                          disabled={deletingProductId !== null}
                          onChange={handleProductInputChange}
                          required
                        >
                          <option value="">Selecione a categoria...</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </S.FormGroup>
                    </S.FormRow>

                    <S.FormRow style={{ marginTop: "1rem" }}>
                      <S.FormGroup>
                        <label>Preco *</label>
                        <input
                          type="number"
                          step="0.01"
                          name="price"
                          placeholder="0,00"
                          value={productForm.price}
                          disabled={deletingProductId !== null}
                          onChange={handleProductInputChange}
                          required
                        />
                      </S.FormGroup>
                      <S.FormGroup>
                        <label>
                          <Clock size={14} /> Preparo (Min)
                        </label>
                        <input
                          type="number"
                          name="preparationTime"
                          placeholder="Ex: 15"
                          value={productForm.preparationTime}
                          disabled={deletingProductId !== null}
                          onChange={handleProductInputChange}
                        />
                      </S.FormGroup>
                      <S.FormGroup>
                        <label>
                          <Package size={14} /> Estoque
                        </label>
                        <input
                          type="number"
                          name="stock"
                          placeholder="Ex: 50"
                          value={productForm.stock}
                          disabled={deletingProductId !== null}
                          onChange={handleProductInputChange}
                        />
                      </S.FormGroup>
                    </S.FormRow>

                    <div
                      style={{
                        marginTop: "0.5rem",
                        color: "#475569",
                        fontSize: "0.82rem",
                        lineHeight: 1.4,
                      }}
                    >
                      Regra automatica: estoque maior que 0 deixa o produto
                      disponivel; estoque 0 deixa indisponivel.
                    </div>

                    <S.FormGroup style={{ marginTop: "1rem" }}>
                      <label>
                        <ImageIcon size={14} /> URL da Imagem
                      </label>
                      <input
                        type="url"
                        name="image"
                        placeholder="https://exemplo.com/imagem.jpg"
                        value={productForm.image}
                        disabled={deletingProductId !== null}
                        onChange={handleProductInputChange}
                      />
                    </S.FormGroup>

                    <S.FormGroup style={{ marginTop: "1rem" }}>
                      <label>Descricao</label>
                      <input
                        type="text"
                        name="description"
                        placeholder="Descricao do produto"
                        value={productForm.description}
                        disabled={deletingProductId !== null}
                        onChange={handleProductInputChange}
                      />
                    </S.FormGroup>

                    <S.CheckboxContainerRow
                      style={{ marginTop: "1.5rem", marginBottom: "1.5rem" }}
                    >
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          name="featured"
                          checked={productForm.featured}
                          disabled={deletingProductId !== null}
                          onChange={handleProductInputChange}
                        />
                        <span>🌟 Destacar Produto</span>
                      </label>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          name="active"
                          checked={productForm.active}
                          disabled={deletingProductId !== null}
                          onChange={handleProductInputChange}
                        />
                        <span>🟢 Produto Disponivel no Cardapio</span>
                      </label>
                    </S.CheckboxContainerRow>

                    <S.FormRow>
                      <S.SubmitBtn
                        type="submit"
                        style={{ flex: 1 }}
                        disabled={deletingProductId !== null}
                      >
                        Publicar Produto
                      </S.SubmitBtn>
                    </S.FormRow>
                  </form>
                </div>
              )}

              {openProductPanel === "ifood" && (
                <div
                  style={{
                    border: "1px solid rgba(234, 29, 44, 0.15)",
                    borderRadius: 16,
                    overflow: "hidden",
                    background: "#fff",
                    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
                  }}
                >
                  <IfoodImportTab
                    restaurantId={restaurantId}
                    onImported={onImportedCatalog}
                  />
                </div>
              )}

              {openProductPanel === "ai" && (
                <div
                  style={{
                    border: "1px solid rgba(59, 130, 246, 0.15)",
                    borderRadius: 16,
                    overflow: "hidden",
                    background: "#fff",
                    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
                  }}
                >
                  <ImportMenuFromImageTab
                    restaurantId={restaurantId}
                    onImported={onImportedCatalog}
                  />
                </div>
              )}

              {openProductPanel === "manage" && (
                <div
                  style={{
                    border: "1px solid rgba(100, 116, 139, 0.16)",
                    borderRadius: 16,
                    padding: "1rem",
                    background: "rgba(248, 250, 252, 0.96)",
                  }}
                >
                  <S.PageHeader style={{ marginBottom: "1rem" }}>
                    <h2>Gerenciar Produtos</h2>
                    <p>Edite, pesquise ou exclua produtos cadastrados.</p>
                  </S.PageHeader>

                  <form onSubmit={handleSubmitProduct}>
                    <S.FormRow>
                      <S.FormGroup style={{ flex: 2 }}>
                        <label>Nome do Produto *</label>
                        <input
                          type="text"
                          name="name"
                          placeholder="Selecione um produto para editar"
                          value={productForm.name}
                          disabled={deletingProductId !== null}
                          onChange={handleProductInputChange}
                          required
                        />
                      </S.FormGroup>
                      <S.FormGroup style={{ flex: 1 }}>
                        <label>Categoria *</label>
                        <select
                          name="categoryId"
                          value={productForm.categoryId}
                          disabled={deletingProductId !== null}
                          onChange={handleProductInputChange}
                          required
                        >
                          <option value="">Selecione a categoria...</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </S.FormGroup>
                    </S.FormRow>

                    <S.FormRow style={{ marginTop: "1rem" }}>
                      <S.FormGroup>
                        <label>Preco *</label>
                        <input
                          type="number"
                          step="0.01"
                          name="price"
                          placeholder="0,00"
                          value={productForm.price}
                          disabled={deletingProductId !== null}
                          onChange={handleProductInputChange}
                          required
                        />
                      </S.FormGroup>
                      <S.FormGroup>
                        <label>
                          <Clock size={14} /> Preparo (Min)
                        </label>
                        <input
                          type="number"
                          name="preparationTime"
                          placeholder="Ex: 15"
                          value={productForm.preparationTime}
                          disabled={deletingProductId !== null}
                          onChange={handleProductInputChange}
                        />
                      </S.FormGroup>
                      <S.FormGroup>
                        <label>
                          <Package size={14} /> Estoque
                        </label>
                        <input
                          type="number"
                          name="stock"
                          placeholder="Ex: 50"
                          value={productForm.stock}
                          disabled={deletingProductId !== null}
                          onChange={handleProductInputChange}
                        />
                      </S.FormGroup>
                    </S.FormRow>

                    <S.FormGroup style={{ marginTop: "1rem" }}>
                      <label>
                        <ImageIcon size={14} /> URL da Imagem
                      </label>
                      <input
                        type="url"
                        name="image"
                        placeholder="https://exemplo.com/imagem.jpg"
                        value={productForm.image}
                        disabled={deletingProductId !== null}
                        onChange={handleProductInputChange}
                      />
                    </S.FormGroup>

                    <S.FormGroup style={{ marginTop: "1rem" }}>
                      <label>Descricao</label>
                      <input
                        type="text"
                        name="description"
                        placeholder="Descricao do produto"
                        value={productForm.description}
                        disabled={deletingProductId !== null}
                        onChange={handleProductInputChange}
                      />
                    </S.FormGroup>

                    <S.CheckboxContainerRow
                      style={{ marginTop: "1.5rem", marginBottom: "1.5rem" }}
                    >
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          name="featured"
                          checked={productForm.featured}
                          disabled={deletingProductId !== null}
                          onChange={handleProductInputChange}
                        />
                        <span>🌟 Destacar Produto</span>
                      </label>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          name="active"
                          checked={productForm.active}
                          disabled={deletingProductId !== null}
                          onChange={handleProductInputChange}
                        />
                        <span>🟢 Produto Disponivel no Cardapio</span>
                      </label>
                    </S.CheckboxContainerRow>

                    <S.FormRow>
                      <S.SubmitBtn
                        type="submit"
                        style={{ flex: 1 }}
                        disabled={deletingProductId !== null}
                      >
                        Publicar Produto
                      </S.SubmitBtn>
                    </S.FormRow>
                  </form>

                  <div
                    style={{
                      marginTop: "1.35rem",
                      display: "grid",
                      gap: "0.85rem",
                    }}
                  >
                    <S.FormGroup>
                      <label>
                        <Search size={14} /> Buscar produto
                      </label>
                      <input
                        type="text"
                        placeholder="Nome, descrição, categoria ou ID"
                        value={productSearchTerm}
                        onChange={(event) =>
                          setProductSearchTerm(event.target.value)
                        }
                      />
                    </S.FormGroup>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "0.75rem",
                        flexWrap: "wrap",
                        color: "#475569",
                        fontSize: "0.88rem",
                        fontWeight: 600,
                      }}
                    >
                      <span>
                        {filteredProducts.length} produto(s) encontrado(s)
                      </span>
                      <span>
                        Use editar para carregar o produto no formulário acima.
                      </span>
                    </div>

                    {filteredProducts.length === 0 ? (
                      <div
                        style={{
                          border: "1px dashed rgba(148, 163, 184, 0.5)",
                          borderRadius: 14,
                          padding: "1rem",
                          background: "rgba(255,255,255,0.8)",
                          color: "#64748b",
                          fontSize: "0.92rem",
                        }}
                      >
                        Nenhum produto encontrado com esse filtro.
                      </div>
                    ) : (
                      <div style={{ display: "grid", gap: "0.65rem" }}>
                        {filteredProducts.map((product) => {
                          const isDeleting =
                            Number(deletingProductId) === Number(product.id);
                          const isEditing =
                            Number(editingProductId) === Number(product.id);
                          const rawStock = product?.stock;
                          const parsedStock =
                            rawStock === null || rawStock === undefined
                              ? null
                              : Number(rawStock);
                          const isOutOfStock =
                            Number.isFinite(parsedStock) && parsedStock <= 0;
                          const isUnavailable =
                            isOutOfStock || product.active === false;

                          return (
                            <S.ProductListItem key={product.id}>
                              <S.ProductMeta>
                                <strong
                                  style={{
                                    color: isOutOfStock ? "#dc2626" : undefined,
                                  }}
                                >
                                  {product.name}
                                  {isEditing ? (
                                    <span
                                      style={{
                                        marginLeft: 8,
                                        padding: "0.18rem 0.45rem",
                                        borderRadius: 999,
                                        background: "rgba(234, 29, 44, 0.12)",
                                        color: "#b8141f",
                                        fontSize: "0.72rem",
                                        fontWeight: 800,
                                      }}
                                    >
                                      Editando
                                    </span>
                                  ) : null}
                                  {isOutOfStock ? (
                                    <span
                                      style={{
                                        marginLeft: 8,
                                        padding: "0.18rem 0.45rem",
                                        borderRadius: 999,
                                        background: "rgba(220, 38, 38, 0.12)",
                                        color: "#b91c1c",
                                        fontSize: "0.72rem",
                                        fontWeight: 800,
                                      }}
                                    >
                                      Estoque 0
                                    </span>
                                  ) : null}
                                </strong>
                                <small>
                                  {product.category?.name || "Sem categoria"}
                                  {product.price !== undefined &&
                                  product.price !== null
                                    ? ` • R$ ${Number(product.price).toFixed(2)}`
                                    : ""}
                                  {product.stock !== undefined &&
                                  product.stock !== null ? (
                                    <span
                                      style={{
                                        color: isOutOfStock
                                          ? "#dc2626"
                                          : undefined,
                                      }}
                                    >
                                      {` • Estoque: ${product.stock}`}
                                      {isUnavailable
                                        ? " • Indisponível"
                                        : " • Disponível"}
                                    </span>
                                  ) : (
                                    <span
                                      style={{
                                        color: isOutOfStock
                                          ? "#dc2626"
                                          : undefined,
                                      }}
                                    >
                                      {isUnavailable
                                        ? " • Indisponível"
                                        : " • Disponível"}
                                    </span>
                                  )}
                                </small>
                              </S.ProductMeta>

                              <S.ProductActions>
                                <S.CategoryActionButton
                                  type="button"
                                  onClick={() =>
                                    handleStartEditProduct(product)
                                  }
                                  title="Editar produto"
                                  disabled={isDeleting}
                                >
                                  <Pencil size={15} />
                                </S.CategoryActionButton>
                                <S.CategoryActionButton
                                  type="button"
                                  onClick={() =>
                                    handleDeleteProduct(product.id)
                                  }
                                  title="Excluir produto"
                                  disabled={isDeleting}
                                >
                                  {isDeleting ? (
                                    <Loader2
                                      size={15}
                                      className="loading-icon"
                                    />
                                  ) : (
                                    <Trash2 size={15} />
                                  )}
                                </S.CategoryActionButton>
                              </S.ProductActions>
                            </S.ProductListItem>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {openProductPanel === "categories" && (
                <div
                  style={{
                    border: "1px solid rgba(100, 116, 139, 0.16)",
                    borderRadius: 16,
                    padding: "1rem",
                    background: "rgba(248, 250, 252, 0.96)",
                  }}
                >
                  <S.PageHeader style={{ marginBottom: "1rem" }}>
                    <h2>Categorias</h2>
                    <p>Use esta aba para criar, editar e excluir categorias.</p>
                  </S.PageHeader>

                  <form onSubmit={handleCreateCategory}>
                    <S.FormGroup>
                      <label>Nome da Categoria</label>
                      <input
                        type="text"
                        placeholder="Ex: Hamburgueres Artesanais, Bebidas, Pizzas..."
                        value={categoryName}
                        disabled={deletingCategoryId !== null}
                        onChange={(event) =>
                          setCategoryName(event.target.value)
                        }
                        required
                      />
                    </S.FormGroup>
                    <S.SubmitBtn
                      type="submit"
                      style={{ marginTop: "1.5rem" }}
                      disabled={deletingCategoryId !== null}
                    >
                      Salvar Categoria
                    </S.SubmitBtn>
                  </form>

                  <div
                    style={{
                      marginTop: "1.5rem",
                      display: "grid",
                      gap: "0.5rem",
                    }}
                  >
                    {categories.map((category) => {
                      const Icon = resolveCategoryIcon(category?.name);
                      const isDeletingAnyCategory = deletingCategoryId !== null;
                      const isEditing =
                        Number(editingCategoryId) === Number(category.id);
                      const isDeleting =
                        Number(deletingCategoryId) === Number(category.id);

                      return (
                        <S.CategoryListItem key={category.id}>
                          {isEditing ? (
                            <S.CategoryInlineEditor>
                              <input
                                type="text"
                                disabled={isDeletingAnyCategory}
                                value={editingCategoryName}
                                onChange={(event) =>
                                  setEditingCategoryName(event.target.value)
                                }
                                placeholder="Nome da categoria"
                              />
                              <S.CategoryActionButton
                                type="button"
                                disabled={isDeletingAnyCategory}
                                onClick={() =>
                                  handleSaveEditCategory(category.id)
                                }
                                title="Salvar"
                              >
                                <Check size={15} />
                              </S.CategoryActionButton>
                              <S.CategoryActionButton
                                type="button"
                                disabled={isDeletingAnyCategory}
                                onClick={handleCancelEditCategory}
                                title="Cancelar"
                              >
                                <X size={15} />
                              </S.CategoryActionButton>
                            </S.CategoryInlineEditor>
                          ) : (
                            <>
                              <S.SlugBadge>
                                <Icon size={15} />
                                {category.name}
                              </S.SlugBadge>
                              <S.CategoryActions>
                                <S.CategoryActionButton
                                  type="button"
                                  disabled={isDeletingAnyCategory}
                                  onClick={() =>
                                    handleStartEditCategory(category)
                                  }
                                  title="Editar categoria"
                                >
                                  <Pencil size={15} />
                                </S.CategoryActionButton>
                                <S.CategoryActionButton
                                  type="button"
                                  onClick={() =>
                                    handleDeleteCategory(category.id)
                                  }
                                  title="Excluir categoria"
                                  disabled={isDeletingAnyCategory}
                                >
                                  {isDeleting ? (
                                    <Loader2
                                      size={15}
                                      className="loading-icon"
                                    />
                                  ) : (
                                    <Trash2 size={15} />
                                  )}
                                </S.CategoryActionButton>
                              </S.CategoryActions>
                            </>
                          )}
                        </S.CategoryListItem>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </S.FormCard>
      )}

      {activeTab === "employees" && (
        <S.FlexDashboardLayout>
          <S.FormCard>
            <S.FormSectionTitle>
              <UserPlus size={18} style={{ marginRight: "0.5rem" }} /> Adicionar
              a Equipe
            </S.FormSectionTitle>
            <form onSubmit={handleCreateEmployee}>
              <S.FormRow>
                <S.FormGroup>
                  <label>Nome</label>
                  <input
                    type="text"
                    placeholder="Nome completo"
                    value={employeeData.name}
                    onChange={(event) =>
                      setEmployeeData({
                        ...employeeData,
                        name: event.target.value,
                      })
                    }
                    required
                  />
                </S.FormGroup>
                <S.FormGroup>
                  <label>Telefone</label>
                  <input
                    type="text"
                    placeholder="(11) 99999-9999"
                    value={employeeData.phone}
                    onChange={(event) =>
                      setEmployeeData({
                        ...employeeData,
                        phone: event.target.value,
                      })
                    }
                    required
                  />
                </S.FormGroup>
              </S.FormRow>

              <S.FormRow style={{ marginTop: "1rem" }}>
                <S.FormGroup style={{ flex: 1 }}>
                  <label>
                    CPF
                    <span
                      style={{
                        fontWeight: 400,
                        color: "#94a3b8",
                        fontSize: "12px",
                      }}
                    >
                      (opcional)
                    </span>
                  </label>
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    value={employeeData.cpf}
                    maxLength={14}
                    onChange={(event) => {
                      const digits = event.target.value
                        .replace(/\D/g, "")
                        .slice(0, 11);
                      const masked = digits
                        .replace(/(\d{3})(\d)/, "$1.$2")
                        .replace(/(\d{3})(\d)/, "$1.$2")
                        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
                      setEmployeeData({ ...employeeData, cpf: masked });
                    }}
                  />
                </S.FormGroup>
              </S.FormRow>

              <S.FormRow style={{ marginTop: "1rem" }}>
                <S.FormGroup style={{ flex: 1.5 }}>
                  <label>E-mail</label>
                  <input
                    type="email"
                    placeholder="exemplo@restaurante.com"
                    value={employeeData.email}
                    onChange={(event) =>
                      setEmployeeData({
                        ...employeeData,
                        email: event.target.value,
                      })
                    }
                    required
                  />
                </S.FormGroup>
                <S.FormGroup style={{ flex: 1 }}>
                  <label>Perfil</label>
                  <select
                    value={employeeData.role}
                    onChange={(event) =>
                      setEmployeeData({
                        ...employeeData,
                        role: event.target.value,
                      })
                    }
                  >
                    <option value="FUNCIONARIO">Funcionario</option>
                    <option value="MOTOQUEIRO">Motoqueiro</option>
                  </select>
                </S.FormGroup>
              </S.FormRow>

              <S.FormRow style={{ marginTop: "1rem" }}>
                <S.FormGroup style={{ flex: 1 }}>
                  <label>Senha</label>
                  <S.PasswordInputWrapper>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Digite uma senha"
                      value={employeeData.password}
                      onChange={(event) =>
                        setEmployeeData({
                          ...employeeData,
                          password: event.target.value,
                        })
                      }
                      required
                    />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </S.PasswordInputWrapper>
                </S.FormGroup>

                <S.FormGroup style={{ flex: 1 }}>
                  <label>Confirmar Senha</label>
                  <S.PasswordInputWrapper>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Confirme a senha"
                      value={employeeData.confirmPassword}
                      onChange={(event) =>
                        setEmployeeData({
                          ...employeeData,
                          confirmPassword: event.target.value,
                        })
                      }
                      required
                    />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </S.PasswordInputWrapper>
                </S.FormGroup>
              </S.FormRow>
              <S.SubmitBtn type="submit" style={{ marginTop: "1.5rem" }}>
                Cadastrar
              </S.SubmitBtn>
            </form>
          </S.FormCard>

          <S.TableContainer>
            <S.Table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Telefone</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id}>
                    <td>
                      <strong>{emp.name}</strong>
                    </td>
                    <td>{emp.email}</td>
                    <td>{emp.phone || "-"}</td>
                    <td>
                      <button
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#ef4444",
                          cursor: "pointer",
                          fontWeight: "bold",
                        }}
                        onClick={() => handleDeactivateEmployee(emp.id)}
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </S.Table>
          </S.TableContainer>
        </S.FlexDashboardLayout>
      )}
    </>
  );
}
