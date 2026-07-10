import type { ChangeEvent, Dispatch, FormEvent, SetStateAction } from "react";
import {
  Check,
  Clock,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Loader2,
  Package,
  Pencil,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import QRCode from "react-qr-code";
import { resolveCategoryIcon } from "../../../config/categoryIconMap";
import * as S from "../styles";

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
  price?: number | string;
  active?: boolean;
  stock?: number | null;
  category?: {
    name?: string;
  };
};

type Table = {
  id: number;
  number: number;
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
  getTableQrValue: (table: Table) => string;
  qrCardRefs: { current: Record<number, HTMLDivElement> };
  handlePreviewTableQr: (table: Table) => void;
  handleCopyTableQrLink: (table: Table) => MaybePromise;
  handleDownloadTableQr: (table: Table) => void;
  handlePrintTableQr: (table: Table) => void;
  handleCreateEmployee: (event: FormEvent<HTMLFormElement>) => MaybePromise;
  employeeData: EmployeeData;
  setEmployeeData: Dispatch<SetStateAction<EmployeeData>>;
  showPassword: boolean;
  setShowPassword: Dispatch<SetStateAction<boolean>>;
  employees: Employee[];
  handleDeactivateEmployee: (employeeId: number) => MaybePromise;
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
  handleCancelEditProduct,
  handleCreateTable,
  tableNumber,
  setTableNumber,
  tables,
  getTableQrValue,
  qrCardRefs,
  handlePreviewTableQr,
  handleCopyTableQrLink,
  handleDownloadTableQr,
  handlePrintTableQr,
  handleCreateEmployee,
  employeeData,
  setEmployeeData,
  showPassword,
  setShowPassword,
  employees,
  handleDeactivateEmployee,
}: OperationalTabsProps) {
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
          <S.PageHeader>
            <h2>Novo Produto do Cardapio</h2>
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
              Regra automatica: estoque maior que 0 deixa o produto disponivel;
              estoque 0 deixa indisponivel.
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
        </S.FormCard>
      )}

      {activeTab === "products-manage" && (
        <S.FormCard>
          <S.PageHeader>
            <h2>Gerenciar Produtos</h2>
            <p>Edite ou exclua produtos ja cadastrados.</p>
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

            <div
              style={{
                marginTop: "0.5rem",
                color: "#475569",
                fontSize: "0.82rem",
                lineHeight: 1.4,
              }}
            >
              Regra automatica: estoque maior que 0 deixa o produto disponivel;
              estoque 0 deixa indisponivel.
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
                disabled={deletingProductId !== null || !editingProductId}
              >
                Salvar Alteracoes
              </S.SubmitBtn>
              <S.CancelBtn
                type="button"
                style={{ flex: 1 }}
                disabled={deletingProductId !== null}
                onClick={handleCancelEditProduct}
              >
                Limpar Edicao
              </S.CancelBtn>
            </S.FormRow>
          </form>

          <S.FormGroup style={{ marginTop: "1.5rem" }}>
            <label>Buscar Produto</label>
            <input
              type="text"
              placeholder="Digite nome ou categoria"
              value={productSearchTerm}
              onChange={(event) => setProductSearchTerm(event.target.value)}
            />
          </S.FormGroup>

          <div style={{ marginTop: "1.5rem", display: "grid", gap: "0.5rem" }}>
            {products.filter((product) => {
              const term = String(productSearchTerm || "")
                .trim()
                .toLowerCase();

              if (!term) {
                return true;
              }

              const productName = String(product?.name || "").toLowerCase();
              const categoryName = String(
                product?.category?.name || "",
              ).toLowerCase();

              return productName.includes(term) || categoryName.includes(term);
            }).length === 0 ? (
              <div style={{ opacity: 0.7 }}>Nenhum produto cadastrado.</div>
            ) : (
              products
                .filter((product) => {
                  const term = String(productSearchTerm || "")
                    .trim()
                    .toLowerCase();

                  if (!term) {
                    return true;
                  }

                  const productName = String(product?.name || "").toLowerCase();
                  const categoryName = String(
                    product?.category?.name || "",
                  ).toLowerCase();

                  return (
                    productName.includes(term) || categoryName.includes(term)
                  );
                })
                .map((product) => {
                  const isDeleting =
                    Number(deletingProductId) === Number(product.id);
                  const isDeletingAnyProduct = deletingProductId !== null;
                  const normalizedStock =
                    product?.stock === null || product?.stock === undefined
                      ? null
                      : Number(product.stock);
                  const isStockDepleted =
                    Number.isInteger(normalizedStock) && normalizedStock <= 0;
                  const isUnavailable =
                    product?.active === false || isStockDepleted;

                  return (
                    <S.ProductListItem key={product.id}>
                      <S.ProductMeta>
                        <strong>{product.name}</strong>
                        <small>
                          {(product?.category?.name || "Sem categoria") +
                            " • R$ " +
                            Number(product?.price || 0).toFixed(2)}
                        </small>
                        <small
                          style={{
                            color: isUnavailable ? "#b91c1c" : "#166534",
                            fontWeight: 700,
                          }}
                        >
                          {isUnavailable ? "Indisponivel" : "Disponivel"}
                          {Number.isInteger(normalizedStock)
                            ? ` • Estoque: ${normalizedStock}`
                            : " • Estoque ilimitado"}
                        </small>
                      </S.ProductMeta>

                      <S.ProductActions>
                        <S.CategoryActionButton
                          type="button"
                          disabled={isDeletingAnyProduct}
                          onClick={() => handleStartEditProduct(product)}
                          title="Editar produto"
                        >
                          <Pencil size={15} />
                        </S.CategoryActionButton>

                        <S.CategoryActionButton
                          type="button"
                          disabled={isDeletingAnyProduct}
                          onClick={() => handleDeleteProduct(product.id)}
                          title="Excluir produto"
                        >
                          {isDeleting ? (
                            <Loader2 size={15} className="loading-icon" />
                          ) : (
                            <Trash2 size={15} />
                          )}
                        </S.CategoryActionButton>
                      </S.ProductActions>
                    </S.ProductListItem>
                  );
                })
            )}
          </div>
        </S.FormCard>
      )}

      {activeTab === "tables" && (
        <S.FormCard>
          <S.PageHeader>
            <h2>Nova Mesa</h2>
          </S.PageHeader>

          <form onSubmit={handleCreateTable}>
            <S.FormRow>
              <S.FormGroup style={{ flex: 1 }}>
                <label>Numero da Mesa *</label>
                <input
                  type="number"
                  min="1"
                  placeholder="Ex: 1"
                  value={tableNumber}
                  onChange={(event) => setTableNumber(event.target.value)}
                  required
                />
              </S.FormGroup>
            </S.FormRow>

            <S.SubmitBtn type="submit" style={{ marginTop: "1.5rem" }}>
              Cadastrar Mesa
            </S.SubmitBtn>
          </form>

          <div style={{ marginTop: "1.5rem" }}>
            {tables.length === 0 ? (
              <div style={{ opacity: 0.7 }}>Nenhuma mesa cadastrada.</div>
            ) : (
              <S.TableQrGrid>
                {tables.map((table) => {
                  const qrValue = getTableQrValue(table);

                  return (
                    <S.TableQrCard
                      key={table.id}
                      ref={(node) => {
                        if (node) {
                          qrCardRefs.current[table.id] = node;
                        }
                      }}
                    >
                      <S.TableQrCodeBox>
                        <QRCode
                          value={qrValue}
                          size={160}
                          bgColor="#ffffff"
                          fgColor="#111827"
                          level="M"
                        />
                      </S.TableQrCodeBox>
                      <S.TableQrMeta>
                        <S.SlugBadge>Mesa {table.number}</S.SlugBadge>
                        <small>Abre o cardapio da mesa</small>
                        <S.TableQrActions>
                          <S.TableQrActionButton
                            type="button"
                            onClick={() => handlePreviewTableQr(table)}
                          >
                            Ver
                          </S.TableQrActionButton>
                          <S.TableQrActionButton
                            type="button"
                            onClick={() => handleCopyTableQrLink(table)}
                          >
                            Copiar
                          </S.TableQrActionButton>
                          <S.TableQrActionButton
                            type="button"
                            onClick={() => handleDownloadTableQr(table)}
                          >
                            Baixar
                          </S.TableQrActionButton>
                          <S.TableQrActionButton
                            type="button"
                            onClick={() => handlePrintTableQr(table)}
                          >
                            Imprimir
                          </S.TableQrActionButton>
                        </S.TableQrActions>
                      </S.TableQrMeta>
                    </S.TableQrCard>
                  );
                })}
              </S.TableQrGrid>
            )}
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
