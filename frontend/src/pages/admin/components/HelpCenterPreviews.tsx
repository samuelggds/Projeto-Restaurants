import { type ElementType } from 'react';
import * as S from './HelpCenter.styles';

type PreviewField = { label: string; value: string };

type FaithfulGuidePreviewProps = {
  title: string;
  icon: ElementType;
  area: string;
  path: string;
  helper: string;
  fields: PreviewField[];
  action: string;
};

const mainNavigation = [
  'Visão geral',
  'Pedidos',
  'Cardápio',
  'Clientes',
  'Funcionários',
  'Cobranças e assinaturas',
  'Configurações',
];
const settingsNavigation = [
  'Marca e identidade',
  'Dados do negócio',
  'Endereço',
  'Horários',
  'Pedidos',
  'Delivery e retirada',
  'Cardápio de mesa',
  'WhatsApp',
  'Pagamentos',
  'Redes sociais',
  'Aparência e SEO',
  'Equipe e segurança',
];

function Marker({ number }: { number: number }) {
  return <strong className="guide-marker">{number}</strong>;
}

function AdminNavigation({ active }: { active: string }) {
  return (
    <aside className="faithful-navigation">
      {mainNavigation.map((item) => (
        <span className={item === active ? 'active' : ''} key={item}>
          {item === active && <Marker number={1} />}
          {item}
        </span>
      ))}
    </aside>
  );
}

function SettingsNavigation({ active }: { active: string }) {
  return (
    <aside className="settings-navigation">
      <input placeholder="Buscar configuração" readOnly />
      <small>RESTAURANTE</small>
      {settingsNavigation.map((item) => (
        <span className={item === active ? 'active' : ''} key={item}>
          {item === active && <Marker number={1} />}
          {item}
        </span>
      ))}
    </aside>
  );
}

function Header({
  area,
  path,
  helper,
  Icon,
  marker = 2,
}: {
  area: string;
  path: string;
  helper: string;
  Icon: ElementType;
  marker?: number;
}) {
  return (
    <header className="faithful-header">
      <Icon />
      <div>
        <small>PAINEL / {area.toUpperCase()}</small>
        <h4>{path}</h4>
        <p>{helper}</p>
      </div>
      <Marker number={marker} />
    </header>
  );
}

function OverviewPreview({ icon: Icon, area, path, helper }: FaithfulGuidePreviewProps) {
  return (
    <S.Preview aria-label="Representação da aba Visão geral">
      <div className="faithful-shell overview-shell">
        <AdminNavigation active={area} />
        <main>
          <Header Icon={Icon} area={area} path={path} helper={helper} />
          <div className="overview-stat-cards">
            {['Vendas de hoje', 'Pedidos', 'Ticket médio', 'Clientes ativos'].map((item, index) => (
              <article key={item}>
                <small>{item}</small>
                {index === 0 && <Marker number={3} />}
                <b>—</b>
                <span>Indicador atualizado</span>
              </article>
            ))}
          </div>
          <div className="overview-data-panels">
            <section>
              <h5>
                Pedidos recentes
                <Marker number={4} />
              </h5>
              <div className="mock-filter-row">
                <span>⌕ Buscar por ID ou cliente</span>
                <span>Todos os status</span>
              </div>
              <div className="empty-lines">
                <i />
                <i />
                <i />
              </div>
              <footer>
                <small>Sem cadastros exibidos</small>
                <button type="button">Voltar aos 10</button>
                <button type="button">Mostrar mais 10</button>
              </footer>
            </section>
            <section>
              <h5>
                Produtos disponíveis
                <Marker number={5} />
              </h5>
              <div className="mock-filter-row">
                <span>⌕ Buscar por ID ou produto</span>
                <span>Disponíveis</span>
              </div>
              <div className="empty-lines">
                <i />
                <i />
                <i />
              </div>
              <footer>
                <small>Sem cadastros exibidos</small>
                <button type="button">
                  <Marker number={6} />
                  Mostrar mais 10
                </button>
              </footer>
            </section>
          </div>
        </main>
      </div>
      <figcaption>
        <b>Representação visual:</b> mostra apenas a estrutura real da tela; nenhum pedido ou
        produto cadastrado é usado aqui.
      </figcaption>
    </S.Preview>
  );
}

function OrdersPreview({ icon: Icon, area, path, helper }: FaithfulGuidePreviewProps) {
  return (
    <S.Preview aria-label="Representação da aba Pedidos">
      <div className="faithful-shell">
        <AdminNavigation active={area} />
        <main>
          <Header Icon={Icon} area={area} path={path} helper={helper} />
          <section className="orders-preview">
            <div className="mock-filter-row">
              <span>
                ⌕ Buscar pedido ou cliente
                <Marker number={3} />
              </span>
              <span>
                Todos os status
                <Marker number={4} />
              </span>
            </div>
            <div className="empty-list large">
              <i />
              <i />
              <i />
              <i />
            </div>
            <footer>
              <small>Nenhum pedido selecionado</small>
              <button type="button">
                <Marker number={5} />
                Aplicar filtros
              </button>
            </footer>
          </section>
        </main>
      </div>
      <figcaption>
        <b>Representação visual:</b> pesquise, filtre e acompanhe pedidos sem mostrar dados de
        clientes no manual.
      </figcaption>
    </S.Preview>
  );
}

function MenuPreview({ icon: Icon, area, path, helper }: FaithfulGuidePreviewProps) {
  return (
    <S.Preview aria-label="Representação da aba Cardápio">
      <div className="faithful-shell">
        <AdminNavigation active={area} />
        <main>
          <Header Icon={Icon} area={area} path={path} helper={helper} />
          <section className="menu-preview">
            <div className="mock-filter-row">
              <span>
                ⌕ Buscar produto
                <Marker number={3} />
              </span>
              <span>
                Todas as categorias
                <Marker number={4} />
              </span>
              <button type="button">
                <Marker number={5} />+ Novo produto
              </button>
            </div>
            <div className="mock-product-grid">
              {Array.from({ length: 3 }, (_, index) => (
                <article key={index}>
                  <i />
                  <b>Produto</b>
                  <span>Categoria · Estoque</span>
                  <em>R$ —</em>
                  <strong>⋮</strong>
                </article>
              ))}
            </div>
            <div className="category-panel">
              <h5>
                Gerenciar categorias
                <Marker number={6} />
              </h5>
              <span>Nome da nova categoria</span>
              <button type="button">+ Criar categoria</button>
            </div>
          </section>
        </main>
      </div>
      <figcaption>
        <b>Representação visual:</b> os cards são apenas espaços demonstrativos; não utilizam
        produtos ou imagens cadastradas.
      </figcaption>
    </S.Preview>
  );
}

function SettingsPreview({
  icon: Icon,
  area,
  path,
  helper,
  fields,
  action,
}: FaithfulGuidePreviewProps) {
  return (
    <S.Preview aria-label={`Representação da configuração ${path}`}>
      <div className="settings-shell">
        <AdminNavigation active="Configurações" />
        <SettingsNavigation active={path} />
        <main>
          <Header Icon={Icon} area={area} path={path} helper={helper} />
          <section className="settings-form-preview">
            <div className="save-actions">
              <button type="button">Ver loja</button>
              <button type="button">
                <Marker number={fields.length + 3} />
                {action}
              </button>
            </div>
            <div className="settings-fields">
              {fields.map((field, index) => (
                <label key={field.label}>
                  <b>
                    {field.label}
                    <Marker number={index + 3} />
                  </b>
                  <span>{field.value}</span>
                </label>
              ))}
            </div>
          </section>
        </main>
      </div>
      <figcaption>
        <b>Representação visual:</b> abra a configuração destacada, preencha os campos indicados e
        salve no botão laranja.
      </figcaption>
    </S.Preview>
  );
}

function ManagementPreview({
  icon: Icon,
  area,
  path,
  helper,
  fields,
  action,
}: FaithfulGuidePreviewProps) {
  return (
    <S.Preview aria-label={`Representação da aba ${area}`}>
      <div className="faithful-shell">
        <AdminNavigation active={area} />
        <main>
          <Header Icon={Icon} area={area} path={path} helper={helper} />
          <section className="management-preview">
            <div className="mock-filter-row">
              <span>
                ⌕ Buscar por nome, ID ou e-mail
                <Marker number={3} />
              </span>
              <span>
                Todos os status
                <Marker number={4} />
              </span>
            </div>
            <div className="management-list">
              {Array.from({ length: 4 }, (_, index) => (
                <article key={index}>
                  <i />
                  <div>
                    <b>{fields[index % fields.length]?.label}</b>
                    <span>{fields[index % fields.length]?.value}</span>
                  </div>
                  <em>—</em>
                </article>
              ))}
            </div>
            <footer>
              <small>Sem dados reais no manual</small>
              <button type="button">
                <Marker number={5} />
                {action}
              </button>
            </footer>
          </section>
        </main>
      </div>
      <figcaption>
        <b>Representação visual:</b> a lista reproduz o formato da aba e preserva dados reais de
        clientes, equipe e cobranças.
      </figcaption>
    </S.Preview>
  );
}

export function FaithfulGuidePreview(props: FaithfulGuidePreviewProps) {
  if (props.area === 'Visão geral') return <OverviewPreview {...props} />;
  if (props.area === 'Pedidos') return <OrdersPreview {...props} />;
  if (props.area === 'Cardápio') return <MenuPreview {...props} />;
  if (props.area === 'Configurações') return <SettingsPreview {...props} />;
  return <ManagementPreview {...props} />;
}
