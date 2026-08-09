import { ChangeEvent, FormEvent, useRef, useState } from "react";
import {
  Building2,
  Clock3,
  CreditCard,
  ExternalLink,
  HelpCircle,
  ImagePlus,
  LayoutGrid,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  MoreVertical,
  Plus,
  QrCode,
  Save,
  Search as SearchIcon,
  Settings2,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Store,
  Truck,
  Upload,
  Users,
  X,
} from "lucide-react";
import { adminMockEmployees, adminMockSettings } from "./data";
import { useAppDialog } from "../../components/AppDialog/context";
import { createPersistentImageDataUrl } from "../../utils/persistentImage";
import * as S from "./Admin.styles";
import type {
  AdminPageProps,
  AdminSection,
  AdminOrder,
  AdminProduct,
  AdminCategory,
  Employee,
  EmployeeRole,
  SettingsSection,
} from "./types";

const settingItems: [SettingsSection, string, typeof Store][] = [
  ["brand", "Marca e identidade", Store],
  ["business", "Dados do negócio", Building2],
  ["address", "Endereço", MapPin],
  ["hours", "Horários", Clock3],
  ["orders", "Pedidos", ShoppingBag],
  ["delivery", "Delivery e retirada", Truck],
  ["table", "Cardápio de mesa", QrCode],
  ["whatsapp", "WhatsApp", MessageCircle],
  ["payments", "Pagamentos", CreditCard],
  ["social", "Redes sociais", Share2],
  ["appearance", "Aparência e SEO", LayoutGrid],
  ["security", "Equipe e segurança", ShieldCheck],
];
const sectionTitle: Record<SettingsSection, string> = {
  brand: "Marca e identidade",
  business: "Dados do negócio",
  address: "Endereço",
  hours: "Horários",
  orders: "Configurações de pedidos",
  delivery: "Delivery e retirada",
  table: "Cardápio de mesa",
  whatsapp: "WhatsApp",
  payments: "Pagamentos",
  social: "Redes sociais",
  appearance: "Aparência e SEO",
  security: "Equipe e segurança",
};
const roleLabel: Record<EmployeeRole, string> = {
  COOK: "Cozinheiro",
  WAITER: "Garçom",
  ATTENDANT: "Atendente",
};

function errorMessage(error: unknown, fallback: string) {
  if (!error || typeof error !== "object") return fallback;
  const response = (error as { response?: { data?: Record<string, unknown> } }).response;
  return String(response?.data?.error || response?.data?.message || fallback);
}

export function AdminPage({
  initialSettings = adminMockSettings,
  initialEmployees = adminMockEmployees,
  initialOrders = [],
  initialProducts = [],
  initialCategories = [],
  onUpdateOrderStatus,
  onSaveProduct,
  onDeleteProduct,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  onOpenSettings,
  onSaveSettings,
  onCreateEmployee,
  onUpdateEmployee,
  onDeactivateEmployee,
  onViewStore,
  onLogout,
}: AdminPageProps) {
  const { confirmDialog } = useAppDialog();
  const [area, setArea] = useState<AdminSection>("overview");
  const [section, setSection] = useState<SettingsSection>("brand");
  const [settings, setSettings] = useState(initialSettings);
  const [employees, setEmployees] = useState(initialEmployees);
  const orders = initialOrders;
  const products = initialProducts;
  const categories = initialCategories;
  const [mobile, setMobile] = useState(false);
  const [editing, setEditing] = useState<Employee | null | undefined>();
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null | undefined>();
  const [saved, setSaved] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");
  const logoInput = useRef<HTMLInputElement>(null);
  const areaTitles: Record<Exclude<AdminSection, "settings">, string> = {
    overview: "Visão geral",
    orders: "Pedidos",
    catalog: "Cardápio",
    customers: "Clientes",
    employees: "Employees",
  };
  const title = area === "settings" ? sectionTitle[section] : areaTitles[area];
  const update = <K extends keyof typeof settings>(
    key: K,
    value: (typeof settings)[K],
  ) => setSettings((current) => ({ ...current, [key]: value }));
  const logo = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFeedbackError("");
    try {
      const persistentImage = await createPersistentImageDataUrl(file);
      update("logoUrl", persistentImage);
    } catch (error) {
      setFeedbackError(error instanceof Error ? error.message : "Não foi possível processar a imagem.");
    } finally {
      event.target.value = "";
    }
  };
  const save = async () => {
    setFeedbackError("");
    try {
      await onSaveSettings?.(settings);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch {
      setSaved(false);
      setFeedbackError(
        "Não foi possível salvar. Confira sua conexão e tente novamente.",
      );
    }
  };
  const saveEmployee = async (employee: Omit<Employee, "id">, id?: string) => {
    setFeedbackError("");
    try {
      if (id) {
        const full = { ...employee, id };
        const savedEmployee = (await onUpdateEmployee?.(full)) ?? full;
        setEmployees((x) =>
          x.map((item) => (item.id === id ? savedEmployee : item)),
        );
      } else {
        const createdEmployee = await onCreateEmployee?.(employee);
        if (createdEmployee) {
          setEmployees((x) => [...x, createdEmployee]);
        }
      }
      setEditing(undefined);
    } catch {
      setFeedbackError("Não foi possível salvar o funcionário. Tente novamente.");
    }
  };
  return (
    <S.Root $primary={settings.primaryColor} $settings={area === "settings"}>
      {feedbackError && (
        <div
          role="alert"
          style={{
            position: "fixed",
            right: 24,
            top: 24,
            zIndex: 1000,
            maxWidth: 420,
            borderRadius: 10,
            background: "#991b1b",
            color: "white",
            padding: "12px 16px",
            boxShadow: "0 12px 30px rgba(0, 0, 0, 0.2)",
          }}
        >
          {feedbackError}
        </div>
      )}
      <S.MainSidebar $open={mobile}>
        <S.Brand>
          <span>S&amp;C</span>
          <b>{settings.restaurantName}</b>
          <small>PAINEL ADMINISTRATIVO</small>
        </S.Brand>
        <S.MainNav>
          <button
            className={area === "overview" ? "active" : ""}
            onClick={() => {
              setArea("overview");
              setMobile(false);
            }}
          >
            <LayoutGrid />
            Visão geral
          </button>
          <button
            className={area === "orders" ? "active" : ""}
            onClick={() => {
              setArea("orders");
              setMobile(false);
            }}
          >
            <ShoppingBag />
            Pedidos
          </button>
          <button
            className={area === "catalog" ? "active" : ""}
            onClick={() => {
              setArea("catalog");
              setMobile(false);
            }}
          >
            <Menu />
            Cardápio
          </button>
          <button
            className={area === "customers" ? "active" : ""}
            onClick={() => {
              setArea("customers");
              setMobile(false);
            }}
          >
            <Users />
            Clientes
          </button>
          <button
            className={area === "employees" ? "active employees" : "employees"}
            onClick={() => {
              setArea("employees");
              setMobile(false);
            }}
          >
            <Users />
            Employees
          </button>
          <button
            className={area === "settings" ? "active" : ""}
            onClick={() => {
              if (onOpenSettings) onOpenSettings();
              else setArea("settings");
              setMobile(false);
            }}
          >
            <Settings2 />
            Configurações
          </button>
        </S.MainNav>
        <S.SideFooter>
          <button>
            <HelpCircle />
            Central de ajuda
          </button>
          <button onClick={onLogout}>
            <LogOut />
            Sair
          </button>
        </S.SideFooter>
      </S.MainSidebar>
      <S.SettingsSidebar $visible={area === "settings"}>
        <S.Search>
          <SearchIcon />
          <input placeholder="Buscar configuração" />
        </S.Search>
        <S.SettingsNav>
          <small>RESTAURANTE</small>
          {settingItems.slice(0, 4).map(([id, label, Icon]) => (
            <button
              key={id}
              className={section === id ? "active" : ""}
              onClick={() => setSection(id)}
            >
              <Icon />
              {label}
            </button>
          ))}
          <small>OPERAÇÃO</small>
          {settingItems.slice(4, 9).map(([id, label, Icon]) => (
            <button
              key={id}
              className={section === id ? "active" : ""}
              onClick={() => setSection(id)}
            >
              <Icon />
              {label}
            </button>
          ))}
          <small>PRESENÇA DIGITAL</small>
          {settingItems.slice(9).map(([id, label, Icon]) => (
            <button
              key={id}
              className={section === id ? "active" : ""}
              onClick={() => setSection(id)}
            >
              <Icon />
              {label}
            </button>
          ))}
        </S.SettingsNav>
      </S.SettingsSidebar>
      <S.Main>
        <S.Top>
          <S.MobileMenu onClick={() => setMobile(true)}>
            <Menu />
          </S.MobileMenu>
          <div>
            <small>PAINEL &nbsp;/&nbsp; {area.toUpperCase()}</small>
            <h1>{title}</h1>
            <p>
              {area === "employees"
                ? "Somente o administrador cria e edita funcionários."
                : area === "settings"
                  ? "Personalize e gerencie as informações do restaurante."
                  : "Acompanhe e gerencie a operação em um só lugar."}
            </p>
          </div>
          <S.TopActions>
            {area === "settings" && (
              <>
                <button className="preview" onClick={onViewStore}>
                  <ExternalLink />
                  Ver loja
                </button>
                <button className="save" onClick={save}>
                  <Save />
                  {saved ? "Salvo" : "Salvar alterações"}
                </button>
              </>
            )}
          </S.TopActions>
        </S.Top>
        <S.Content>
          {area === "employees" ? (
            <Employees
              employees={employees}
              onNew={() => setEditing(null)}
              onEdit={setEditing}
              onDeactivate={async (employee) => {
                const confirmed = await confirmDialog({
                  title: "Desativar funcionário?",
                  description: `${employee.name} perderá o acesso ao sistema até ser reativado.`,
                  confirmLabel: "Desativar",
                  tone: "danger",
                });
                if (!confirmed) return;
                await onDeactivateEmployee?.(employee.id);
                setEmployees((current) => current.map((item) => item.id === employee.id ? { ...item, active: false } : item));
              }}
            />
          ) : area === "settings" ? (
            section === "brand" ? (
              <Brand
                settings={settings}
                update={update}
                input={logoInput}
                logo={logo}
              />
            ) : (
              <SettingsContent
                section={section}
                settings={settings}
                update={update}
                openEmployees={() => setArea("employees")}
              />
            )
          ) : (
            <Management
              area={area}
              orders={orders}
              products={products}
              categories={categories}
              onUpdateOrderStatus={async (id, status) => {
                await onUpdateOrderStatus?.(id, status);
              }}
              onEditProduct={setEditingProduct}
              onNewProduct={() => setEditingProduct(null)}
              onCreateCategory={async (name) => { await onCreateCategory?.(name); }}
              onUpdateCategory={async (id, name) => { await onUpdateCategory?.(id, name); }}
              onDeleteCategory={async (id) => { await onDeleteCategory?.(id); }}
            />
          )}
        </S.Content>
      </S.Main>
      {editing !== undefined && (
        <EmployeeDrawer
          employee={editing}
          close={() => setEditing(undefined)}
          save={saveEmployee}
        />
      )}{" "}
      {editingProduct !== undefined && (
        <ProductDrawer
          product={editingProduct}
          categories={categories}
          close={() => setEditingProduct(undefined)}
          save={async (product) => { await onSaveProduct?.(product); setEditingProduct(undefined); }}
          remove={editingProduct ? async () => { await onDeleteProduct?.(editingProduct.id); setEditingProduct(undefined); } : undefined}
        />
      )}
      {mobile && (
        <div
          onClick={() => setMobile(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 55,
            background: "#0005",
          }}
        />
      )}
    </S.Root>
  );
}

function Brand({
  settings,
  update,
  input,
  logo,
}: {
  settings: typeof adminMockSettings;
  update: <K extends keyof typeof adminMockSettings>(
    key: K,
    value: (typeof adminMockSettings)[K],
  ) => void;
  input: React.RefObject<HTMLInputElement | null>;
  logo: (e: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
}) {
  return (
    <S.Stack>
      <S.Card>
        <S.LogoCard>
          <div className="copy">
            <h2>Logotipo do restaurante</h2>
            <p>
              Esse logotipo será exibido no site, cardápio digital e materiais
              de comunicação.
            </p>
          </div>
          <div className="logo">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" />
            ) : (
              "S&C"
            )}
          </div>
          <div className="upload">
            <input
              hidden
              ref={input}
              type="file"
              accept="image/*"
              onChange={logo}
            />
            <button onClick={() => input.current?.click()}>
              <Upload />
              Trocar logotipo
            </button>
            <small>
              Recomendado: 512 × 512 px,
              <br />
              máximo 5 MB.
            </small>
          </div>
        </S.LogoCard>
      </S.Card>
      <S.Card>
        <h2>Identidade da marca</h2>
        <S.FormGrid>
          <S.Field $full>
            Nome do restaurante
            <input
              value={settings.restaurantName}
              onChange={(e) => update("restaurantName", e.target.value)}
            />
          </S.Field>
          <S.Field>
            Cor principal
            <S.Color>
              <input
                type="color"
                value={settings.primaryColor}
                onChange={(e) => update("primaryColor", e.target.value)}
              />
              <input
                value={settings.primaryColor}
                onChange={(e) => update("primaryColor", e.target.value)}
              />
            </S.Color>
          </S.Field>
          <S.Field>
            Descrição do restaurante
            <textarea
              value={settings.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </S.Field>
        </S.FormGrid>
      </S.Card>
      <S.Card>
        <h2>Banners da home</h2>
        <p>Adicione banners para destacar promoções e novidades.</p>
        <S.Banners>
          <button>
            <ImagePlus />
            <b>Banner principal</b>
            <span>1440 × 560 px</span>
          </button>
          <button>
            <ImagePlus />
            <b>Promoção 1</b>
            <span>600 × 400 px</span>
          </button>
          <button>
            <ImagePlus />
            <b>Promoção 2</b>
            <span>600 × 400 px</span>
          </button>
        </S.Banners>
      </S.Card>
    </S.Stack>
  );
}

function SettingsContent({
  section,
  settings,
  update,
  openEmployees,
}: {
  section: SettingsSection;
  settings: typeof adminMockSettings;
  update: <K extends keyof typeof adminMockSettings>(
    key: K,
    value: (typeof adminMockSettings)[K],
  ) => void;
  openEmployees: () => void;
}) {
  const toggles = (items: [string, string, boolean][]) => (
    <S.ToggleRows>
      {items.map(([title, description, checked]) => (
        <div className="toggle-row" key={title}>
          <div>
            <b>{title}</b>
            <span>{description}</span>
          </div>
          <input type="checkbox" defaultChecked={checked} />
        </div>
      ))}
    </S.ToggleRows>
  );
  if (section === "business")
    return (
      <S.SettingSection>
        <S.Card>
          <h2>Informações comerciais</h2>
          <p>Dados legais e de contato do estabelecimento.</p>
          <S.FormGrid>
            <S.Field>
              Razão social
              <input defaultValue="Sabor & Casa Restaurante LTDA" />
            </S.Field>
            <S.Field>
              CNPJ
              <input defaultValue="12.345.678/0001-90" />
            </S.Field>
            <S.Field>
              Telefone
              <input defaultValue="(85) 3333-4455" />
            </S.Field>
            <S.Field>
              E-mail comercial
              <input type="email" defaultValue="contato@saborecasa.com" />
            </S.Field>
          </S.FormGrid>
        </S.Card>
      </S.SettingSection>
    );
  if (section === "address")
    return (
      <S.Card>
        <h2>Endereço do estabelecimento</h2>
        <p>Origem das entregas e local de retirada.</p>
        <S.FormGrid>
          <S.Field>
            CEP
            <input defaultValue="60100-000" />
          </S.Field>
          <S.Field>
            Rua
            <input defaultValue="Rua das Flores" />
          </S.Field>
          <S.Field>
            Número
            <input defaultValue="123" />
          </S.Field>
          <S.Field>
            Complemento
            <input placeholder="Opcional" />
          </S.Field>
          <S.Field>
            Bairro
            <input defaultValue="Centro" />
          </S.Field>
          <S.Field>
            Cidade
            <input defaultValue="Fortaleza - CE" />
          </S.Field>
        </S.FormGrid>
      </S.Card>
    );
  if (section === "hours") {
    const days = [
      "Segunda-feira",
      "Terça-feira",
      "Quarta-feira",
      "Quinta-feira",
      "Sexta-feira",
      "Sábado",
      "Domingo",
    ];
    return (
      <S.Card>
        <h2>Horários de funcionamento</h2>
        <p>Defina o período disponível para receber pedidos.</p>
        {days.map((day, index) => (
          <S.DayRow key={day}>
            <b>{day}</b>
            <input type="time" defaultValue="11:00" disabled={index === 6} />
            <span className="separator">até</span>
            <input type="time" defaultValue="23:00" disabled={index === 6} />
          </S.DayRow>
        ))}
      </S.Card>
    );
  }
  if (section === "orders")
    return (
      <S.SettingSection>
        <S.Card>
          <h2>Fluxo dos pedidos</h2>
          {toggles([
            [
              "Aceitar automaticamente",
              "Novos pedidos entram direto na fila de preparo.",
              false,
            ],
            [
              "Login para rastreamento",
              "Cliente deve entrar na conta para acompanhar o pedido.",
              true,
            ],
            [
              "Notificação sonora",
              "Tocar alerta sempre que um pedido chegar.",
              true,
            ],
          ])}
        </S.Card>
        <S.Card>
          <h2>Prazos de preparo</h2>
          <S.FormGrid>
            <S.Field>
              Tempo médio em minutos
              <input
                type="number"
                value={settings.deliveryTime}
                onChange={(e) => update("deliveryTime", Number(e.target.value))}
              />
            </S.Field>
            <S.Field>
              Limite de pedidos simultâneos
              <input type="number" defaultValue="20" />
            </S.Field>
          </S.FormGrid>
        </S.Card>
      </S.SettingSection>
    );
  if (section === "delivery")
    return (
      <S.SettingSection>
        <S.Card>
          <h2>Canais de atendimento</h2>
          {toggles([
            ["Delivery", "Entregas no endereço do cliente.", true],
            [
              "Retirada no balcão",
              "Cliente retira o pedido no restaurante.",
              true,
            ],
          ])}
        </S.Card>
        <S.Card>
          <h2>Regras de entrega</h2>
          <S.FormGrid>
            <S.Field>
              Pedido mínimo (R$)
              <input
                type="number"
                value={settings.minimumOrder}
                onChange={(e) => update("minimumOrder", Number(e.target.value))}
              />
            </S.Field>
            <S.Field>
              Taxa padrão (R$)
              <input type="number" defaultValue="6" />
            </S.Field>
            <S.Field>
              Raio máximo (km)
              <input type="number" defaultValue="8" />
            </S.Field>
            <S.Field>
              Frete grátis acima de (R$)
              <input type="number" defaultValue="60" />
            </S.Field>
          </S.FormGrid>
        </S.Card>
      </S.SettingSection>
    );
  if (section === "table")
    return (
      <S.SettingSection>
        <S.Card>
          <h2>Cardápio digital de mesa</h2>
          {toggles([
            [
              "Pedidos por QR Code",
              "Cliente escaneia, informa o código e envia o pedido.",
              settings.tableOrderingEnabled,
            ],
            [
              "Chamar garçom",
              "Permite solicitar atendimento pelo cardápio.",
              true,
            ],
            ["Pedir a conta", "Permite solicitar o fechamento da mesa.", true],
          ])}
        </S.Card>
        <S.QrPanel>
          <div>
            <b>Código temporário — Mesa 12</b>
            <br />
            <span>O garçom informa os quatro dígitos ao cliente.</span>
          </div>
          <strong className="code">4827</strong>
          <button>Gerar novo código</button>
        </S.QrPanel>
      </S.SettingSection>
    );
  if (section === "whatsapp")
    return (
      <S.SettingSection>
        <S.Card>
          <h2>Conexão com WhatsApp</h2>
          <S.FormGrid>
            <S.Field>
              Número comercial
              <input
                value={settings.whatsapp}
                onChange={(e) => update("whatsapp", e.target.value)}
              />
            </S.Field>
            <S.Field>
              Nome exibido
              <input defaultValue="Atendimento Sabor & Casa" />
            </S.Field>
            <S.Field $full>
              Mensagem inicial
              <textarea defaultValue="Olá! Como podemos ajudar?" />
            </S.Field>
          </S.FormGrid>
        </S.Card>
        <S.Card>
          <h2>Mensagens automáticas</h2>
          {toggles([
            ["Confirmação de pedido", "Enviar resumo ao confirmar.", true],
            [
              "Pedido saiu para entrega",
              "Avisar o cliente automaticamente.",
              true,
            ],
          ])}
        </S.Card>
      </S.SettingSection>
    );
  if (section === "payments")
    return (
      <S.Card>
        <h2>Formas de pagamento</h2>
        <p>Escolha o que estará disponível no checkout.</p>
        {toggles([
          ["Pix", "Pagamento instantâneo.", true],
          ["Cartão de crédito", "Pagamento online ou na entrega.", true],
          ["Cartão de débito", "Maquininha na entrega.", true],
          ["Dinheiro", "Permitir informar troco.", false],
        ])}
      </S.Card>
    );
  if (section === "social")
    return (
      <S.Card>
        <h2>Redes sociais</h2>
        <p>Links exibidos na Home e no contato.</p>
        <S.FormGrid>
          <S.Field>
            Instagram
            <input
              value={settings.instagram}
              onChange={(e) => update("instagram", e.target.value)}
            />
          </S.Field>
          <S.Field>
            Facebook
            <input
              value={settings.facebook}
              onChange={(e) => update("facebook", e.target.value)}
            />
          </S.Field>
          <S.Field>
            TikTok
            <input placeholder="@seurestaurante" />
          </S.Field>
          <S.Field>
            YouTube
            <input placeholder="URL do canal" />
          </S.Field>
        </S.FormGrid>
      </S.Card>
    );
  if (section === "appearance")
    return (
      <S.SettingSection>
        <S.Card>
          <h2>Aparência</h2>
          <S.FormGrid>
            <S.Field>
              Cor principal
              <S.Color>
                <input
                  type="color"
                  value={settings.primaryColor}
                  onChange={(e) => update("primaryColor", e.target.value)}
                />
                <input
                  value={settings.primaryColor}
                  onChange={(e) => update("primaryColor", e.target.value)}
                />
              </S.Color>
            </S.Field>
            <S.Field>
              Fonte
              <select defaultValue="Inter">
                <option>Inter</option>
                <option>Manrope</option>
                <option>DM Sans</option>
              </select>
            </S.Field>
          </S.FormGrid>
        </S.Card>
        <S.Card>
          <h2>SEO da loja</h2>
          <S.FormGrid>
            <S.Field $full>
              Título da página
              <input defaultValue={`${settings.restaurantName} — Delivery`} />
            </S.Field>
            <S.Field $full>
              Descrição para buscadores
              <textarea defaultValue={settings.description} />
            </S.Field>
          </S.FormGrid>
        </S.Card>
      </S.SettingSection>
    );
  return (
    <S.SettingSection>
      <S.Card>
        <h2>Equipe e segurança</h2>
        {toggles([
          [
            "Autenticação em duas etapas",
            "Proteja o acesso administrativo.",
            true,
          ],
          [
            "Alertas de novo acesso",
            "Receba e-mail quando houver login em outro dispositivo.",
            true,
          ],
        ])}
        <button
          onClick={openEmployees}
          style={{
            marginTop: 16,
            height: 44,
            border: 0,
            borderRadius: 8,
            background: "var(--a)",
            color: "#fff",
            padding: "0 16px",
          }}
        >
          Gerenciar employees
        </button>
      </S.Card>
      <S.Card>
        <h2>Sessões administrativas</h2>
        <S.DataList>
          <div className="data-row">
            <div>
              <b>Chrome no Windows</b>
              <span>Fortaleza, CE • sessão atual</span>
            </div>
            <button>Encerrar outras sessões</button>
          </div>
        </S.DataList>
      </S.Card>
    </S.SettingSection>
  );
}

function Management({
  area,
  orders,
  products,
  categories,
  onUpdateOrderStatus,
  onEditProduct,
  onNewProduct,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
}: {
  area: Exclude<AdminSection, "settings" | "employees">;
  orders: AdminOrder[];
  products: AdminProduct[];
  categories: AdminCategory[];
  onUpdateOrderStatus: (id: number, status: string) => Promise<void>;
  onEditProduct: (product: AdminProduct) => void;
  onNewProduct: () => void;
  onCreateCategory: (name: string) => Promise<void>;
  onUpdateCategory: (id: number, name: string) => Promise<void>;
  onDeleteCategory: (id: number) => Promise<void>;
}) {
  const { confirmDialog, promptDialog } = useAppDialog();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [categoryBusy, setCategoryBusy] = useState(false);
  const [categoryFeedback, setCategoryFeedback] = useState("");
  const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const todayOrders = orders.filter((order) => order.createdAt && new Date(order.createdAt).toDateString() === new Date().toDateString() && order.status !== "CANCELADO");
  const sales = todayOrders.reduce((sum, order) => sum + order.total, 0);
  const customers = Array.from(orders.reduce((map, order) => {
    const key = order.userId || order.customerEmail || order.customerName;
    const value = map.get(key) || { name: order.customerName, email: order.customerEmail || "Sem e-mail", count: 0, total: 0 };
    value.count += 1; value.total += order.total; map.set(key, value); return map;
  }, new Map<string, { name: string; email: string; count: number; total: number }>()).values());
  if (area === "overview")
    return (
      <>
        <S.Metrics>
          <S.Metric>
            <span>Vendas de hoje</span>
            <b>{money(sales)}</b>
            <small>Dados reais de hoje</small>
          </S.Metric>
          <S.Metric>
            <span>Pedidos</span>
            <b>{todayOrders.length}</b>
            <small>{orders.filter((order) => order.status === "PREPARANDO").length} em preparo</small>
          </S.Metric>
          <S.Metric>
            <span>Ticket médio</span>
            <b>{money(todayOrders.length ? sales / todayOrders.length : 0)}</b>
            <small>Hoje</small>
          </S.Metric>
          <S.Metric>
            <span>Clientes ativos</span>
            <b>{customers.length}</b>
            <small>Com pedidos registrados</small>
          </S.Metric>
        </S.Metrics>
        <S.AdminGrid>
          <S.Card>
            <h2>Pedidos recentes</h2>
            <S.DataList>
              {orders.slice(0, 5).map((order) => (
                <div className="data-row" key={order.numericId}>
                  <div>
                    <b>{order.id} • {order.customerName}</b>
                    <span>{order.status.replaceAll("_", " ")}</span>
                  </div>
                  <strong>{money(order.total)}</strong>
                </div>
              ))}
            </S.DataList>
          </S.Card>
          <S.Card>
            <h2>Produtos disponíveis</h2>
            <S.DataList>
              {products.filter((product) => product.active).slice(0, 5).map((product) => (
                <div className="data-row" key={product.id}>{product.image && <img src={product.image} alt="" />}<div><b>{product.name}</b><span>{product.category}</span></div><strong>{money(product.price)}</strong></div>
              ))}
            </S.DataList>
          </S.Card>
        </S.AdminGrid>
      </>
    );
  if (area === "orders")
    {
    const visibleOrders = orders.filter((order) => (!filter || order.status === filter) && `${order.id} ${order.customerName}`.toLowerCase().includes(search.toLowerCase()));
    return (
      <S.Card>
        <S.Toolbar>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar pedido ou cliente" />
          <select value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="">Todos os status</option>
            {["PENDENTE", "PREPARANDO", "PRONTO", "SAIU_PARA_ENTREGA", "ENTREGUE", "CANCELADO"].map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
          </select>
        </S.Toolbar>
        <S.DataList>
          {visibleOrders.map((order) => (
            <div className="data-row" key={order.numericId}>
              <div>
                <b>{order.id} • {order.customerName}</b>
                <span>{order.status.replaceAll("_", " ")}</span>
              </div>
              <strong>{money(order.total)}</strong>
              <select value={order.status} aria-label={`Status do pedido ${order.id}`} onChange={(event) => void onUpdateOrderStatus(order.numericId, event.target.value)}>
                <option value={order.status}>{order.status.replaceAll("_", " ")}</option>
                {(order.status === "PENDENTE" ? ["PREPARANDO", "CANCELADO"] : order.status === "PREPARANDO" ? ["PRONTO"] : order.status === "PRONTO" ? ["SAIU_PARA_ENTREGA", "ENTREGUE"] : order.status === "SAIU_PARA_ENTREGA" ? ["ENTREGUE"] : []).map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
              </select>
            </div>
          ))}
        </S.DataList>
      </S.Card>
    );
    }
  if (area === "catalog")
    {
    const visibleProducts = products.filter((product) => (!filter || String(product.categoryId) === filter) && product.name.toLowerCase().includes(search.toLowerCase()));
    return (
      <>
        <S.Toolbar>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar produto" />
          <select value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="">Todas as categorias</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          <button onClick={onNewProduct}>+ Novo produto</button>
        </S.Toolbar>
        <S.ProductGrid>
          {visibleProducts.map((product) => (
            <S.Product key={product.id}>
              {product.image && <img src={product.image} alt="" />}
              <div>
                <b>{product.name}</b>
                <span>{product.category} • {product.active ? "Disponível" : "Indisponível"}</span>
                <footer>
                  <strong>{money(product.price)}</strong>
                  <button onClick={() => onEditProduct(product)}>Editar</button>
                </footer>
              </div>
            </S.Product>
          ))}
        </S.ProductGrid>
        <S.Card style={{ marginTop: 24 }}>
          <h2>Gerenciar categorias</h2>
          <p>Crie categorias e use as ações ao lado de cada item para renomear ou excluir.</p>
          {categoryFeedback && <p role="alert" style={{ color: categoryFeedback.startsWith("Categoria") ? "#166534" : "#b91c1c" }}>{categoryFeedback}</p>}
          <S.Toolbar>
            <input value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="Nome da nova categoria" />
            <button disabled={categoryBusy || !newCategory.trim()} onClick={() => {
              const name = newCategory.trim(); setCategoryBusy(true); setCategoryFeedback("");
              void onCreateCategory(name).then(() => { setNewCategory(""); setCategoryFeedback("Categoria criada com sucesso."); })
                .catch((error) => setCategoryFeedback(errorMessage(error, "Não foi possível criar a categoria."))).finally(() => setCategoryBusy(false));
            }}>{categoryBusy ? "Salvando..." : "+ Criar categoria"}</button>
          </S.Toolbar>
          <S.DataList>
            {categories.map((category) => <div className="data-row" key={category.id}>
              <div><b>{category.name}</b><span>{products.filter((product) => product.categoryId === category.id).length} produto(s)</span></div>
              <button disabled={categoryBusy} onClick={() => { void (async () => {
                const name = await promptDialog({
                  title: "Renomear categoria",
                  description: "Escolha um nome claro para facilitar a organização do cardápio.",
                  inputLabel: "Novo nome",
                  initialValue: category.name,
                  confirmLabel: "Salvar nome",
                });
                if (!name || name === category.name) return;
                setCategoryBusy(true); setCategoryFeedback("");
                void onUpdateCategory(category.id, name).then(() => setCategoryFeedback("Categoria renomeada com sucesso."))
                  .catch((error) => setCategoryFeedback(errorMessage(error, "Não foi possível renomear a categoria."))).finally(() => setCategoryBusy(false));
              })(); }}>Renomear</button>
              <button disabled={categoryBusy} onClick={() => { void (async () => {
                const confirmed = await confirmDialog({
                  title: "Excluir categoria?",
                  description: `A categoria “${category.name}” será removida. Categorias com produtos não podem ser excluídas.`,
                  confirmLabel: "Excluir categoria",
                  tone: "danger",
                });
                if (!confirmed) return;
                setCategoryBusy(true); setCategoryFeedback("");
                void onDeleteCategory(category.id).then(() => setCategoryFeedback("Categoria excluída com sucesso."))
                  .catch((error) => setCategoryFeedback(errorMessage(error, "Não foi possível excluir a categoria."))).finally(() => setCategoryBusy(false));
              })(); }}>Excluir</button>
            </div>)}
          </S.DataList>
        </S.Card>
      </>
    );
    }
  return (
    <S.Card>
      <S.Toolbar>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cliente" />
      </S.Toolbar>
      <S.DataList>
        {customers.filter((customer) => `${customer.name} ${customer.email}`.toLowerCase().includes(search.toLowerCase())).map((customer) => (
          <div className="data-row" key={`${customer.email}-${customer.name}`}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "#fff0e7",
                color: "var(--a)",
                display: "grid",
                placeItems: "center",
                fontWeight: 800,
              }}
            >
              {customer.name
                .split(" ")
                .map((y) => y[0])
                .join("")}
            </div>
            <div>
              <b>{customer.name}</b>
              <span>{customer.email} • {customer.count} pedidos • {money(customer.total)}</span>
            </div>
          </div>
        ))}
      </S.DataList>
    </S.Card>
  );
}

function Employees({
  employees,
  onNew,
  onEdit,
  onDeactivate,
}: {
  employees: Employee[];
  onNew: () => void;
  onEdit: (e: Employee) => void;
  onDeactivate: (e: Employee) => Promise<void>;
}) {
  return (
    <S.Card>
      <S.EmployeeHeader>
        <div>
          <h2>Funcionários cadastrados</h2>
          <p>
            Cozinheiros, garçons e atendentes são funcionários com permissões
            diferentes.
          </p>
        </div>
        <button onClick={onNew}>
          <Plus />
          Novo funcionário
        </button>
      </S.EmployeeHeader>
      <S.EmployeeList>
        {employees.map((e) => (
          <S.EmployeeRow key={e.id}>
            <div className="avatar">
              {e.name
                .split(" ")
                .map((x) => x[0])
                .slice(0, 2)
                .join("")}
            </div>
            <div className="identity">
              <b>{e.name}</b>
              <span>{e.email}</span>
            </div>
            <div className="role">
              <b>{roleLabel[e.role]}</b>
              <span>
                {e.role === "COOK"
                  ? "Acessa a tela de cozinha"
                  : e.role === "WAITER"
                    ? "Acessa a tela de garçom"
                    : "Operação de pedidos"}
              </span>
            </div>
            <span className="status">{e.active ? "● Ativo" : "○ Inativo"}</span>
            <button className="edit" onClick={() => onEdit(e)}>
              <MoreVertical />
            </button>
            {e.active && <button onClick={() => void onDeactivate(e)}>Desativar</button>}
          </S.EmployeeRow>
        ))}
      </S.EmployeeList>
    </S.Card>
  );
}

function ProductDrawer({ product, categories, close, save, remove }: {
  product: AdminProduct | null;
  categories: AdminCategory[];
  close: () => void;
  save: (product: AdminProduct) => Promise<void>;
  remove?: () => Promise<void>;
}) {
  const { confirmDialog } = useAppDialog();
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [image, setImage] = useState(product?.image ?? "");
  const [price, setPrice] = useState(String(product?.price ?? ""));
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? categories[0]?.id ?? 0);
  const [stock, setStock] = useState(String(product?.stock ?? ""));
  const [active, setActive] = useState(product?.active !== false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError("");
    if (!name.trim() || Number(price) < 0 || !categoryId) { setError("Preencha nome, preço e categoria."); return; }
    setBusy(true);
    try {
      await save({ id: product?.id ?? "", name: name.trim(), description: description.trim(), image: image.trim(),
        price: Number(price), categoryId, category: categories.find((item) => item.id === categoryId)?.name ?? "",
        stock: stock === "" ? undefined : Number(stock), active });
    } catch { setError("Não foi possível salvar o produto."); setBusy(false); }
  };
  return <S.Overlay onMouseDown={(event) => event.target === event.currentTarget && close()}>
    <S.Drawer onSubmit={(event) => void submit(event)}>
      <header><h2>{product ? "Editar produto" : "Novo produto"}</h2><button type="button" onClick={close}><X /></button></header>
      {error && <p role="alert" style={{ color: "#b91c1c" }}>{error}</p>}
      <S.Field>Nome<input required value={name} onChange={(event) => setName(event.target.value)} /></S.Field>
      <S.Field>Descrição<textarea value={description} onChange={(event) => setDescription(event.target.value)} /></S.Field>
      <S.Field>URL da imagem<input value={image} onChange={(event) => setImage(event.target.value)} /></S.Field>
      <S.Field>Preço<input required type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} /></S.Field>
      <S.Field>Categoria<select required value={categoryId} onChange={(event) => setCategoryId(Number(event.target.value))}>
        <option value={0}>Selecione</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select></S.Field>
      <S.Field>Estoque (vazio = ilimitado)<input type="number" min="0" value={stock} onChange={(event) => setStock(event.target.value)} /></S.Field>
      <label><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} /> Produto disponível</label>
      <footer>
        {remove && <button type="button" onClick={() => { void (async () => {
          const confirmed = await confirmDialog({
            title: "Excluir produto?",
            description: `“${product?.name}” será removido permanentemente do cardápio.`,
            confirmLabel: "Excluir produto",
            tone: "danger",
          });
          if (!confirmed) return;
          setBusy(true);
          void remove().catch(() => { setError("Não foi possível excluir o produto."); setBusy(false); });
        })(); }}>Excluir</button>}
        <button type="button" onClick={close}>Cancelar</button><button className="primary" disabled={busy} type="submit">{busy ? "Salvando..." : "Salvar produto"}</button>
      </footer>
    </S.Drawer>
  </S.Overlay>;
}

function EmployeeDrawer({
  employee,
  close,
  save,
}: {
  employee: Employee | null;
  close: () => void;
  save: (e: Omit<Employee, "id">, id?: string) => void;
}) {
  const [name, setName] = useState(employee?.name ?? "");
  const [email, setEmail] = useState(employee?.email ?? "");
  const [role, setRole] = useState<EmployeeRole>(employee?.role ?? "ATTENDANT");
  const [password, setPassword] = useState("");
  const [permissions, setPermissions] = useState(
    employee?.permissions ?? {
      viewOrders: true,
      updateOrderStatus: true,
      manageQrTables: true,
    },
  );
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (name && email.includes("@") && (employee || password.length >= 6))
      save(
        {
          name,
          email,
          role,
          active: employee?.active ?? true,
          permissions,
          ...(password ? { password, confirmPassword: password } : {}),
        } as Omit<Employee, "id">,
        employee?.id,
      );
  };
  return (
    <S.Overlay onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <S.Drawer onSubmit={submit}>
        <header>
          <h2>{employee ? "Editar funcionário" : "Novo funcionário"}</h2>
          <button type="button" onClick={close}>
            <X />
          </button>
        </header>
        <S.Field>
          Nome completo
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </S.Field>
        <S.Field>
          E-mail de acesso
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </S.Field>
        {!employee && (
          <S.Field>
            Senha de acesso
            <input
              type="password"
              value={password}
              placeholder="Mínimo 6 caracteres"
              onChange={(e) => setPassword(e.target.value)}
            />
          </S.Field>
        )}
        <S.Field>
          Cargo
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as EmployeeRole)}
          >
            <option value="COOK">Cozinheiro — acessa a tela de cozinha</option>
            <option value="WAITER">Garçom — acessa a tela de garçom</option>
            <option value="ATTENDANT">
              Atendente — acessa o painel de funcionários
            </option>
          </select>
        </S.Field>
        <div className="permissions">
          <b>Permissões</b>
          {(
            [
              ["viewOrders", "Ver pedidos"],
              ["updateOrderStatus", "Mudar status dos pedidos"],
              ["manageQrTables", "Gerenciar mesas e códigos QR"],
            ] as const
          ).map(([key, label]) => (
            <label key={key}>
              <input
                type="checkbox"
                checked={permissions[key]}
                onChange={() =>
                  setPermissions((p) => ({ ...p, [key]: !p[key] }))
                }
              />
              {label}
            </label>
          ))}
        </div>
        <footer>
          <button type="button" onClick={close}>
            Cancelar
          </button>
          <button className="primary" type="submit">
            {employee ? "Salvar" : "Criar funcionário"}
          </button>
        </footer>
      </S.Drawer>
    </S.Overlay>
  );
}
