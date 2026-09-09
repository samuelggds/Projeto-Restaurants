import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChefHat,
  CircleDollarSign,
  Clock3,
  Menu,
  MessageCircleMore,
  MonitorSmartphone,
  PackageCheck,
  QrCode,
  ShoppingBag,
  Sparkles,
  Store,
  Truck,
  Users,
  Utensils,
  X,
} from 'lucide-react';
import * as S from './GastroNexaMarketing.styles';

const contactUrl = String(import.meta.env.VITE_SALES_CONTACT_URL || '').trim();

const features = [
  {
    icon: <ShoppingBag size={22} />,
    title: 'Pedidos em um só lugar',
    text: 'Acompanhe pedidos de mesa, retirada e delivery com status claros para toda a operação.',
  },
  {
    icon: <QrCode size={22} />,
    title: 'Cardápio digital por QR Code',
    text: 'Cada restaurante recebe seu próprio link e pode levar o cliente direto para o cardápio da mesa.',
  },
  {
    icon: <ChefHat size={22} />,
    title: 'Fluxo para cozinha',
    text: 'A equipe visualiza o que precisa ser preparado e acompanha o andamento sem depender de papel.',
  },
  {
    icon: <Truck size={22} />,
    title: 'Delivery organizado',
    text: 'Centralize os pedidos de entrega e acompanhe o fluxo desde o recebimento até a saída.',
  },
  {
    icon: <BarChart3 size={22} />,
    title: 'Visão administrativa',
    text: 'Acompanhe vendas, pedidos, ticket médio, clientes e outros indicadores importantes do restaurante.',
  },
  {
    icon: <Users size={22} />,
    title: 'Equipe com acessos separados',
    text: 'Administração, cozinha, atendimento e entrega podem trabalhar com telas adequadas para cada função.',
  },
];

const audiences = [
  {
    icon: <Utensils size={21} />,
    title: 'Restaurantes',
    text: 'Operação completa de salão, retirada e delivery.',
  },
  {
    icon: <Store size={21} />,
    title: 'Pizzarias',
    text: 'Cardápio digital, pedidos e produção organizados.',
  },
  {
    icon: <ShoppingBag size={21} />,
    title: 'Hamburguerias',
    text: 'Mais clareza entre balcão, cozinha e entrega.',
  },
  {
    icon: <ChefHat size={21} />,
    title: 'Operações em crescimento',
    text: 'Uma base preparada para centralizar processos e equipe.',
  },
];

function BrandMark() {
  return (
    <S.Brand as={Link} to="/" aria-label="GastroNexa - página inicial">
      <span aria-hidden="true">G</span>
      <span>GastroNexa</span>
    </S.Brand>
  );
}

export default function GastroNexaLanding() {
  const [menuOpen, setMenuOpen] = useState(false);
  const salesHref = contactUrl || '#contato';

  useEffect(() => {
    document.title = 'GastroNexa | Gestão completa para restaurantes';
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <S.Page>
      <S.Header>
        <S.HeaderInner>
          <BrandMark />
          <S.Nav $open={menuOpen} aria-label="Navegação principal">
            <a href="#recursos" onClick={closeMenu}>
              Recursos
            </a>
            <a href="#como-funciona" onClick={closeMenu}>
              Como funciona
            </a>
            <Link to="/demonstracao" onClick={closeMenu}>
              Demonstração
            </Link>
            <a href="#contato" onClick={closeMenu}>
              Contato
            </a>
          </S.Nav>
          <S.HeaderActions>
            <S.Button href={salesHref} $compact>
              Falar com a GastroNexa <ArrowRight size={16} />
            </S.Button>
            <S.MenuButton
              type="button"
              aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((current) => !current)}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </S.MenuButton>
          </S.HeaderActions>
        </S.HeaderInner>
      </S.Header>

      <S.Hero>
        <S.HeroGrid>
          <S.HeroCopy>
            <S.Eyebrow>
              <Sparkles size={15} /> Gestão para restaurantes
            </S.Eyebrow>
            <h1>
              Sua operação mais <span>organizada</span>, do pedido à gestão.
            </h1>
            <p>
              A GastroNexa reúne pedidos, cardápio digital, cozinha, delivery, clientes e gestão
              administrativa em uma experiência pensada para o dia a dia do restaurante.
            </p>
            <S.HeroActions>
              <S.Button as={Link} to="/demonstracao">
                Ver demonstração <ArrowRight size={18} />
              </S.Button>
              <S.Button href={salesHref} $secondary>
                <MessageCircleMore size={18} /> Quero conhecer
              </S.Button>
            </S.HeroActions>
            <S.TrustRow>
              <span>
                <CheckCircle2 size={17} /> Painel administrativo
              </span>
              <span>
                <CheckCircle2 size={17} /> Cardápio por QR Code
              </span>
              <span>
                <CheckCircle2 size={17} /> Operação multiusuário
              </span>
            </S.TrustRow>
          </S.HeroCopy>

          <S.DashboardFrame aria-label="Prévia visual do painel GastroNexa">
            <S.Dashboard>
              <S.DashboardTop>
                <div>
                  <strong>GastroNexa Burger</strong>
                  <small>Painel administrativo</small>
                </div>
                <span>Operação online</span>
              </S.DashboardTop>
              <S.DashboardBody>
                <S.DashboardNav aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </S.DashboardNav>
                <S.DashboardContent>
                  <S.MetricGrid>
                    <S.Metric>
                      <small>Vendas hoje</small>
                      <strong>R$ 4.580</strong>
                    </S.Metric>
                    <S.Metric>
                      <small>Pedidos</small>
                      <strong>87</strong>
                    </S.Metric>
                    <S.Metric>
                      <small>Ticket médio</small>
                      <strong>R$ 52,65</strong>
                    </S.Metric>
                    <S.Metric>
                      <small>Clientes</small>
                      <strong>412</strong>
                    </S.Metric>
                  </S.MetricGrid>
                  <S.OrdersMock>
                    <div>
                      <strong>Pedidos recentes</strong>
                      <span>Ver todos</span>
                    </div>
                    <S.OrderRow>
                      <strong>#1054 · Ana</strong>
                      <span>Delivery</span>
                      <span>Em preparo</span>
                    </S.OrderRow>
                    <S.OrderRow>
                      <strong>#1053 · Mesa 08</strong>
                      <span>Mesa</span>
                      <span>Pronto</span>
                    </S.OrderRow>
                    <S.OrderRow>
                      <strong>#1052 · Carlos</strong>
                      <span>Retirada</span>
                      <span>Entregue</span>
                    </S.OrderRow>
                    <S.OrderRow>
                      <strong>#1051 · Mesa 03</strong>
                      <span>Mesa</span>
                      <span>Confirmado</span>
                    </S.OrderRow>
                  </S.OrdersMock>
                </S.DashboardContent>
              </S.DashboardBody>
            </S.Dashboard>
            <S.FloatingBadge>
              <PackageCheck size={22} />
              <div>
                <strong>5 pedidos em preparo</strong>
                <small>Visão rápida da operação</small>
              </div>
            </S.FloatingBadge>
          </S.DashboardFrame>
        </S.HeroGrid>
      </S.Hero>

      <S.Section id="recursos" $soft>
        <S.Container>
          <S.SectionHeading>
            <S.Eyebrow>Recursos</S.Eyebrow>
            <h2>Uma plataforma para conectar as áreas do restaurante.</h2>
            <p>
              O objetivo é reduzir a fragmentação da operação e dar ao administrador uma visão
              clara do que está acontecendo em cada etapa.
            </p>
          </S.SectionHeading>
          <S.FeatureGrid>
            {features.map((feature) => (
              <S.FeatureCard key={feature.title}>
                <span>{feature.icon}</span>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </S.FeatureCard>
            ))}
          </S.FeatureGrid>
        </S.Container>
      </S.Section>

      <S.Section id="como-funciona">
        <S.Container>
          <S.Split>
            <div>
              <S.SectionHeading>
                <S.Eyebrow>Como funciona</S.Eyebrow>
                <h2>Do cardápio ao painel administrativo, tudo segue o contexto do restaurante.</h2>
                <p>
                  Cada cliente da GastroNexa recebe um endereço próprio dentro da plataforma. O
                  restaurante mantém sua identidade e sua operação separadas dos demais clientes.
                </p>
              </S.SectionHeading>
              <S.Button as={Link} to="/demonstracao">
                Explorar o painel demo <ArrowRight size={18} />
              </S.Button>
            </div>
            <S.Steps>
              <S.Step>
                <span>1</span>
                <div>
                  <strong>Seu restaurante recebe um endereço próprio</strong>
                  <p>Exemplo: gastronexa.com.br/seu-restaurante.</p>
                </div>
              </S.Step>
              <S.Step>
                <span>2</span>
                <div>
                  <strong>Clientes acessam cardápio e QR Codes</strong>
                  <p>O fluxo direciona o pedido para o restaurante correto e para a operação certa.</p>
                </div>
              </S.Step>
              <S.Step>
                <span>3</span>
                <div>
                  <strong>A equipe acompanha cada etapa</strong>
                  <p>Administração, cozinha, atendimento e entrega trabalham dentro do mesmo fluxo.</p>
                </div>
              </S.Step>
            </S.Steps>
          </S.Split>
        </S.Container>
      </S.Section>

      <S.Section $dark>
        <S.Container>
          <S.DemoCard>
            <S.Eyebrow>Experiência demonstrativa</S.Eyebrow>
            <h3>Veja o painel como um administrador antes de falar com a equipe.</h3>
            <p>
              Criamos uma demonstração visual com dados fictícios para você conhecer a organização
              do painel, os indicadores e o fluxo de pedidos sem acessar dados de restaurantes reais.
            </p>
            <S.Button as={Link} to="/demonstracao">
              Abrir demonstração <MonitorSmartphone size={18} />
            </S.Button>
            <S.DemoMini>
              <div>
                <small>Pedidos hoje</small>
                <strong>87</strong>
              </div>
              <div>
                <small>Vendas hoje</small>
                <strong>R$ 4.580,90</strong>
              </div>
              <div>
                <small>Em preparo</small>
                <strong>5 pedidos</strong>
              </div>
            </S.DemoMini>
          </S.DemoCard>
        </S.Container>
      </S.Section>

      <S.Section $soft>
        <S.Container>
          <S.SectionHeading>
            <S.Eyebrow>Para quem é</S.Eyebrow>
            <h2>Feito para negócios de alimentação que precisam organizar a operação.</h2>
          </S.SectionHeading>
          <S.AudienceGrid>
            {audiences.map((audience) => (
              <S.AudienceCard key={audience.title}>
                {audience.icon}
                <strong>{audience.title}</strong>
                <p>{audience.text}</p>
              </S.AudienceCard>
            ))}
          </S.AudienceGrid>
        </S.Container>
      </S.Section>

      <S.Section>
        <S.Container>
          <S.SectionHeading>
            <S.Eyebrow>Perguntas frequentes</S.Eyebrow>
            <h2>O essencial antes de conhecer a plataforma.</h2>
          </S.SectionHeading>
          <S.Faq>
            <details>
              <summary>A demonstração usa dados de restaurantes reais?</summary>
              <p>Não. A área demonstrativa utiliza somente informações fictícias para apresentar a interface.</p>
            </details>
            <details>
              <summary>Cada restaurante tem um endereço próprio?</summary>
              <p>
                Sim. A estrutura da plataforma usa um identificador do restaurante na URL, como
                gastronexa.com.br/nome-do-restaurante.
              </p>
            </details>
            <details>
              <summary>O sistema atende mesa, retirada e delivery?</summary>
              <p>
                A plataforma foi estruturada para trabalhar com esses fluxos e apresentar as informações
                de forma centralizada para a equipe.
              </p>
            </details>
            <details>
              <summary>Posso conversar com a GastroNexa antes de contratar?</summary>
              <p>
                Sim. Use a área de contato abaixo para iniciar uma conversa comercial e apresentar sua operação.
              </p>
            </details>
          </S.Faq>
        </S.Container>
      </S.Section>

      <S.Section id="contato" $soft>
        <S.Container>
          <S.ContactPanel>
            <div>
              <S.Eyebrow>Contato comercial</S.Eyebrow>
              <h2>Quer entender como a GastroNexa pode funcionar no seu restaurante?</h2>
              <p>
                Conheça primeiro a demonstração e, quando estiver pronto, fale com a GastroNexa para
                apresentar o seu cenário e tirar dúvidas sobre a plataforma.
              </p>
              <S.TrustRow>
                <span>
                  <Clock3 size={17} /> Conversa focada na sua operação
                </span>
                <span>
                  <CircleDollarSign size={17} /> Sem cobrança pela demonstração
                </span>
              </S.TrustRow>
            </div>
            <S.ContactActions>
              <S.Button href={salesHref}>
                <MessageCircleMore size={18} /> Falar com a GastroNexa
              </S.Button>
              <S.Button as={Link} to="/demonstracao" $secondary>
                Ver demonstração primeiro <ArrowRight size={17} />
              </S.Button>
              {!contactUrl && (
                <small>
                  O canal comercial será conectado ao publicar a configuração de contato da GastroNexa.
                </small>
              )}
            </S.ContactActions>
          </S.ContactPanel>
        </S.Container>
      </S.Section>

      <S.Footer>
        <S.FooterInner>
          <BrandMark />
          <span>© {new Date().getFullYear()} GastroNexa. Tecnologia para operações de alimentação.</span>
        </S.FooterInner>
      </S.Footer>
    </S.Page>
  );
}
