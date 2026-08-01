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
import * as S from "./Admin.styles";
import type {
  AdminPageProps,
  AdminSection,
  AdminOrder,
  AdminProduct,
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

export function AdminPage({
  initialSettings = adminMockSettings,
  initialEmployees = adminMockEmployees,
  initialOrders = [],
  initialProducts = [],
  onSaveSettings,
  onCreateEmployee,
  onUpdateEmployee,
  onViewStore,
  onLogout,
}: AdminPageProps) {
  const [area, setArea] = useState<AdminSection>("settings");
  const [section, setSection] = useState<SettingsSection>("brand");
  const [settings, setSettings] = useState(initialSettings);
  const [employees, setEmployees] = useState(initialEmployees);
  const [_orders] = useState<AdminOrder[]>(initialOrders);
  const [_products] = useState<AdminProduct[]>(initialProducts);
  const [mobile, setMobile] = useState(false);
  const [editing, setEditing] = useState<Employee | null | undefined>();
  const [saved, setSaved] = useState(false);
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
  const logo = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) update("logoUrl", URL.createObjectURL(file));
  };
  const save = async () => {
    await onSaveSettings?.(settings);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };
  const saveEmployee = async (employee: Omit<Employee, "id">, id?: string) => {
    if (id) {
      const full = { ...employee, id };
      setEmployees((x) => x.map((item) => (item.id === id ? full : item)));
      await onUpdateEmployee?.(full);
    } else {
      const full = { ...employee, id: crypto.randomUUID() };
      setEmployees((x) => [...x, full]);
      await onCreateEmployee?.(employee);
    }
    setEditing(undefined);
  };
  return (
    <S.Root $primary={settings.primaryColor} $settings={area === "settings"}>
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
              setArea("settings");
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
            <Management area={area} />
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
  logo: (e: ChangeEvent<HTMLInputElement>) => void;
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
}: {
  area: Exclude<AdminSection, "settings" | "employees">;
}) {
  const pizza =
    "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=500&q=85";
  const burger =
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=85";
  if (area === "overview")
    return (
      <>
        <S.Metrics>
          <S.Metric>
            <span>Vendas de hoje</span>
            <b>R$ 2.486</b>
            <em>↑ 12% desde ontem</em>
          </S.Metric>
          <S.Metric>
            <span>Pedidos</span>
            <b>38</b>
            <small>7 em preparo</small>
          </S.Metric>
          <S.Metric>
            <span>Ticket médio</span>
            <b>R$ 65,42</b>
            <em>↑ 4,8%</em>
          </S.Metric>
          <S.Metric>
            <span>Clientes ativos</span>
            <b>1.284</b>
            <small>36 novos este mês</small>
          </S.Metric>
        </S.Metrics>
        <S.AdminGrid>
          <S.Card>
            <h2>Pedidos recentes</h2>
            <S.DataList>
              {[
                ["#SC-2051", "Ana Silva", "R$ 69,90"],
                ["#SC-2050", "Lucas Melo", "R$ 42,90"],
                ["#SC-2049", "Marina Costa", "R$ 89,90"],
              ].map((x) => (
                <div className="data-row" key={x[0]}>
                  <div>
                    <b>
                      {x[0]} • {x[1]}
                    </b>
                    <span>Recebido há poucos minutos</span>
                  </div>
                  <strong>{x[2]}</strong>
                </div>
              ))}
            </S.DataList>
          </S.Card>
          <S.Card>
            <h2>Mais vendidos</h2>
            <S.DataList>
              <div className="data-row">
                <img src={pizza} />
                <div>
                  <b>Pizza Margherita</b>
                  <span>84 pedidos</span>
                </div>
                <strong>R$ 54,90</strong>
              </div>
              <div className="data-row">
                <img src={burger} />
                <div>
                  <b>Burger da Casa</b>
                  <span>67 pedidos</span>
                </div>
                <strong>R$ 42,90</strong>
              </div>
            </S.DataList>
          </S.Card>
        </S.AdminGrid>
      </>
    );
  if (area === "orders")
    return (
      <S.Card>
        <S.Toolbar>
          <input placeholder="Buscar pedido ou cliente" />
          <select>
            <option>Todos os status</option>
            <option>Recebido</option>
            <option>Em preparo</option>
            <option>Pronto</option>
          </select>
        </S.Toolbar>
        <S.DataList>
          {[
            ["#SC-2051", "Ana Silva", "Em preparo", "R$ 69,90"],
            ["#SC-2050", "Lucas Melo", "Recebido", "R$ 42,90"],
            ["#SC-2049", "Marina Costa", "Saiu para entrega", "R$ 89,90"],
            ["#SC-2048", "Pedro Alves", "Entregue", "R$ 54,90"],
          ].map((x) => (
            <div className="data-row" key={x[0]}>
              <div>
                <b>
                  {x[0]} • {x[1]}
                </b>
                <span>{x[2]}</span>
              </div>
              <strong>{x[3]}</strong>
              <button>Detalhes</button>
            </div>
          ))}
        </S.DataList>
      </S.Card>
    );
  if (area === "catalog")
    return (
      <>
        <S.Toolbar>
          <input placeholder="Buscar produto" />
          <select>
            <option>Todas as categorias</option>
            <option>Pizzas</option>
            <option>Hambúrgueres</option>
          </select>
          <button>+ Novo produto</button>
        </S.Toolbar>
        <S.ProductGrid>
          {[
            [pizza, "Pizza Margherita", "Pizzas", "R$ 54,90"],
            [burger, "Burger da Casa", "Hambúrgueres", "R$ 42,90"],
            [pizza, "Pizza Calabresa", "Pizzas", "R$ 49,90"],
          ].map((x) => (
            <S.Product key={x[1]}>
              <img src={x[0]} />
              <div>
                <b>{x[1]}</b>
                <span>{x[2]} • Disponível</span>
                <footer>
                  <strong>{x[3]}</strong>
                  <button>Editar</button>
                </footer>
              </div>
            </S.Product>
          ))}
        </S.ProductGrid>
      </>
    );
  return (
    <S.Card>
      <S.Toolbar>
        <input placeholder="Buscar cliente" />
        <select>
          <option>Todos os clientes</option>
          <option>Mais frequentes</option>
          <option>Novos</option>
        </select>
      </S.Toolbar>
      <S.DataList>
        {[
          ["Ana Silva", "ana@email.com", "12 pedidos • R$ 842,50"],
          ["Lucas Melo", "lucas@email.com", "8 pedidos • R$ 486,20"],
          ["Marina Costa", "marina@email.com", "5 pedidos • R$ 319,90"],
        ].map((x, _index) => (
          <div className="data-row" key={x[1]}>
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
              {x[0]
                .split(" ")
                .map((y) => y[0])
                .join("")}
            </div>
            <div>
              <b>{x[0]}</b>
              <span>
                {x[1]} • {x[2]}
              </span>
            </div>
            <button>Ver perfil</button>
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
}: {
  employees: Employee[];
  onNew: () => void;
  onEdit: (e: Employee) => void;
}) {
  return (
    <S.Card>
      <S.EmployeeHeader>
        <div>
          <h2>Employees cadastrados</h2>
          <p>
            Cozinheiros, garçons e atendentes são employees com permissões
            diferentes.
          </p>
        </div>
        <button onClick={onNew}>
          <Plus />
          New employee
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
                {e.permissions.manageQrTables
                  ? "Gerencia mesas QR"
                  : "Operação de pedidos"}
              </span>
            </div>
            <span className="status">{e.active ? "● Ativo" : "○ Inativo"}</span>
            <button className="edit" onClick={() => onEdit(e)}>
              <MoreVertical />
            </button>
          </S.EmployeeRow>
        ))}
      </S.EmployeeList>
    </S.Card>
  );
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
  const [role, setRole] = useState<EmployeeRole>(employee?.role ?? "WAITER");
  const [permissions, setPermissions] = useState(
    employee?.permissions ?? {
      viewOrders: true,
      updateOrderStatus: true,
      manageQrTables: true,
    },
  );
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (name && email.includes("@"))
      save(
        { name, email, role, active: employee?.active ?? true, permissions },
        employee?.id,
      );
  };
  return (
    <S.Overlay onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <S.Drawer onSubmit={submit}>
        <header>
          <h2>{employee ? "Edit employee" : "New employee"}</h2>
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
        <S.Field>
          Função
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as EmployeeRole)}
          >
            <option value="COOK">Cozinheiro</option>
            <option value="WAITER">Garçom</option>
            <option value="ATTENDANT">Atendente</option>
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
            {employee ? "Save employee" : "Create employee"}
          </button>
        </footer>
      </S.Drawer>
    </S.Overlay>
  );
}
