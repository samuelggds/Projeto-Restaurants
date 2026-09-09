import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  ChefHat,
  Menu,
  MessageCircleMore,
  MonitorSmartphone,
  PackageCheck,
  QrCode,
  ShoppingBag,
  Store,
  Truck,
  Users,
  Utensils,
  X,
} from 'lucide-react';
import * as S from './GastroNexaLandingV2.styles';

const contactUrl = String(import.meta.env.VITE_SALES_CONTACT_URL || '').trim();

const features = [
  {
    icon: <ShoppingBag size={21} />,
    title: 'Pedidos centralizados',
    text: 'Delivery, retirada e mesa organizados em uma mesma operação, com status claros para cada equipe.',
  },
  {
    icon: <QrCode size={21} />,
    title: 'Cardápio digital e QR Code',
    text: 'O restaurante ganha seu próprio endereço e pode receber pedidos diretamente pelo cardápio digital.',
  },
  {
    icon: <ChefHat size={21} />,
    title: 'Cozinha conectada',
    text: 'A cozinha recebe a fila, inicia o preparo e libera os pedidos para salão, retirada ou entrega.',
  },
  {
    icon: <Truck size={21} />,
    title: 'Entrega organizada',
    text: 'Motoqueiros acompanham pedidos disponíveis, em rota e concluídos sem misturar funções.',
  },
  {
    icon: <BarChart3 size={21} />,
    title: 'Painel administrativo',
    text: 'Indicadores, pedidos, cardápio, clientes, funcionários, cobranças e configurações em um só painel.',
  },
  {
    icon: <Users size={21} />,
    title: 'Acessos por função',
    text: 'Atendente, garçom, cozinha e motoqueiro trabalham em experiências desenhadas para suas rotinas.',
  },
];

const audiences = [
  {
    icon: <Utensils size={20} />,
    title: 'Restaurantes',
    text: 'Salão, retirada e delivery no mesmo fluxo.',
  },
  {
    icon: <Store size={20} />,
    title: 'Pizzarias',
    text: 'Cardápio, produção e pedidos organizados.',
  },
  {
    icon: <ShoppingBag size={20} />,
    title: 'Hamburguerias',
    text: 'Mais clareza entre balcão, cozinha e entrega.',
  },
  {
    icon: <ChefHat size={20} />,
    title: 'Operações em crescimento',
    text: 'Uma base pronta para equipe e novos canais.',
  },
];

const plans = [
  {
    name: 'Básico',
    price: 'R$ 149,90',
    description: 'O essencial para receber e gerenciar pedidos de delivery.',
    features: ['Sistema de delivery', 'Suporte padrão'],
    featured: false,
  },
  {
    name: 'Premium',
    price: 'R$ 249,90',
    description: 'A operação completa, com delivery e atendimento nas mesas por QR Code.',
    features: [
      'Sistema de delivery',
      'Cardápio digital com QR Code de mesa',
      'Suporte prioritário',
    ],
    featured: true,
  },
];

function Brand({ light = false }: { light?: boolean }) {
  return (
    <S.Brand as={Link} to="/" $light={light} aria-label="GastroNexa - página inicial">
      <img
        src="/gastronexa-logo.png"
        alt=""
        width="48"
        height="42"
        style={{ objectFit: 'contain', borderRadius: 4, background: '#fff' }}
      />
      <span>GastroNexa</span>
    </S.Brand>
  );
}

export default function GastroNexaLandingV2() {
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
          <Brand />
          <S.Nav $open={menuOpen} aria-label="Navegação principal">
            <a href="#recursos" onClick={closeMenu}>
              Recursos
            </a>
            <a href="#como-funciona" onClick={closeMenu}>
              Como funciona
            </a>
            <a href="#planos" onClick={closeMenu}>
              Planos
            </a>
            <Link to="/demonstracao" onClick={closeMenu}>
              Demonstração
            </Link>
            <a href="#contato" onClick={closeMenu}>
              Contato
            </a>
          </S.Nav>
          <S.HeaderActions>
            <S.Button href={salesHref} $small>
              Falar com a GastroNexa <ArrowRight size={15} />
            </S.Button>
            <S.MenuButton
              type="button"
              aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((current) => !current)}
            >
              {menuOpen ? <X size={19} /> : <Menu size={19} />}
            </S.MenuButton>
          </S.HeaderActions>
        </S.HeaderInner>
      </S.Header>

      <S.Hero>
        <S.HeroGrid>
          <S.HeroCopy>
            <S.Eyebrow>Operação conectada para restaurantes</S.Eyebrow>
            <h1>
              Seu restaurante em <span>um só fluxo.</span>
            </h1>
            <p>
              GastroNexa conecta cardápio, pedidos, cozinha, salão, delivery, clientes e gestão
              administrativa em uma experiência moderna construída para a rotina real do
              restaurante.
            </p>
            <S.HeroActions>
              <S.Button as={Link} to="/demonstracao">
                Experimentar demonstração <ArrowRight size={17} />
              </S.Button>
              <S.Button href={salesHref} $secondary>
                <MessageCircleMore size={17} /> Falar com a equipe
              </S.Button>
            </S.HeroActions>
            <S.HeroProof>
              <span>
                <CheckCircle2 size={16} /> 30 dias de teste nos planos
              </span>
              <span>
                <CheckCircle2 size={16} /> Perfis separados por função
              </span>
              <span>
                <CheckCircle2 size={16} /> Mesa, retirada e delivery
              </span>
            </S.HeroProof>
          </S.HeroCopy>

          <S.ProductPreview aria-label="Prévia do painel administrativo GastroNexa">
            <S.AppWindow>
              <S.AppTop>
                <div className="identity">
                  <span className="mark">GN</span>
                  <span>
                    <b>GastroNexa Burger</b>
                    <small>Painel administrativo</small>
                  </span>
                </div>
                <span>Operação online</span>
              </S.AppTop>
              <S.AppBody>
                <S.AppNav aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </S.AppNav>
                <S.AppContent>
                  <S.MetricGrid>
                    <S.Metric>
                      <small>Vendas hoje</small>
                      <strong>R$ 4.580,90</strong>
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
                  <S.Orders>
                    <header>
                      <strong>Movimento recente</strong>
                      <span>Pedidos</span>
                    </header>
                    <S.Order>
                      <b>#1058 · Marina</b>
                      <span>Delivery</span>
                      <span>Pronto</span>
                    </S.Order>
                    <S.Order>
                      <b>#1057 · Mesa 08</b>
                      <span>Mesa</span>
                      <span>Em preparo</span>
                    </S.Order>
                    <S.Order>
                      <b>#1056 · Carlos</b>
                      <span>Retirada</span>
                      <span>Pendente</span>
                    </S.Order>
                    <S.Order>
                      <b>#1055 · Ana</b>
                      <span>Delivery</span>
                      <span>Em rota</span>
                    </S.Order>
                  </S.Orders>
                </S.AppContent>
              </S.AppBody>
            </S.AppWindow>
            <S.FloatingCard>
              <PackageCheck size={21} />
              <span>
                <b>Pedidos sincronizados</b>
                <small>Da cozinha até a entrega</small>
              </span>
            </S.FloatingCard>
          </S.ProductPreview>
        </S.HeroGrid>
      </S.Hero>

      <S.Section id="recursos">
        <S.Container>
          <S.Heading>
            <S.Eyebrow>Recursos</S.Eyebrow>
            <h2>As áreas do restaurante falando a mesma língua.</h2>
            <p>
              O visual e os fluxos foram pensados para reduzir ruído entre quem recebe, prepara,
              atende, entrega e administra os pedidos.
            </p>
          </S.Heading>
          <S.Features>
            {features.map((feature) => (
              <S.Feature key={feature.title}>
                <span className="icon">{feature.icon}</span>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </S.Feature>
            ))}
          </S.Features>
        </S.Container>
      </S.Section>

      <S.Section id="como-funciona" $soft>
        <S.Container>
          <S.Workflow>
            <S.Heading>
              <S.Eyebrow>Como funciona</S.Eyebrow>
              <h2>Da entrada do pedido até o fechamento da operação.</h2>
              <p>
                Cada restaurante trabalha dentro do seu próprio contexto e cada função recebe apenas
                a experiência necessária para executar bem sua etapa.
              </p>
              <S.HeroActions>
                <S.Button as={Link} to="/demonstracao">
                  Testar os perfis <ArrowRight size={16} />
                </S.Button>
              </S.HeroActions>
            </S.Heading>
            <S.Steps>
              <S.Step>
                <span>1</span>
                <div>
                  <b>Cliente faz o pedido</b>
                  <p>Cardápio digital, mesa, retirada ou delivery.</p>
                </div>
              </S.Step>
              <S.Step>
                <span>2</span>
                <div>
                  <b>Equipe recebe e prepara</b>
                  <p>Atendente acompanha e cozinha executa a fila de produção.</p>
                </div>
              </S.Step>
              <S.Step>
                <span>3</span>
                <div>
                  <b>Salão ou entrega conclui</b>
                  <p>Garçom cuida das mesas e motoqueiro acompanha as entregas.</p>
                </div>
              </S.Step>
              <S.Step>
                <span>4</span>
                <div>
                  <b>Admin acompanha tudo</b>
                  <p>Indicadores, clientes, equipe, cardápio, assinatura e configurações.</p>
                </div>
              </S.Step>
            </S.Steps>
          </S.Workflow>
        </S.Container>
      </S.Section>

      <S.Section $dark>
        <S.Container>
          <S.DemoBand>
            <div>
              <S.Eyebrow>Restaurante demonstrativo</S.Eyebrow>
              <h2>Entre como cliente, equipe ou administrador.</h2>
              <p>
                Use contas prontas e percorra o fluxo completo de pedidos em uma experiência
                isolada, com telas inspiradas diretamente nas áreas reais do GastroNexa.
              </p>
            </div>
            <S.Button as={Link} to="/demonstracao" $dark>
              Abrir demonstração <MonitorSmartphone size={17} />
            </S.Button>
          </S.DemoBand>
        </S.Container>
      </S.Section>

      <S.Section id="planos">
        <S.Container>
          <S.Heading style={{ marginInline: 'auto', textAlign: 'center' }}>
            <S.Eyebrow style={{ marginInline: 'auto' }}>Planos</S.Eyebrow>
            <h2>Escolha o nível de operação ideal para o seu restaurante.</h2>
            <p>Os dois planos incluem 30 dias de teste antes da cobrança mensal.</p>
          </S.Heading>
          <S.PlanGrid>
            {plans.map((plan) => (
              <S.Plan key={plan.name} $featured={plan.featured}>
                {plan.featured && <span className="badge">Mais completo</span>}
                <h3>{plan.name}</h3>
                <p className="description">{plan.description}</p>
                <div className="price">
                  <strong>{plan.price}</strong>
                  <span>/mês</span>
                </div>
                <span className="trial">30 dias de teste</span>
                <ul>
                  {plan.features.map((feature) => (
                    <li key={feature}>
                      <Check size={16} /> {feature}
                    </li>
                  ))}
                </ul>
                <S.Button href={salesHref} $secondary={!plan.featured}>
                  Quero este plano <ArrowRight size={15} />
                </S.Button>
              </S.Plan>
            ))}
          </S.PlanGrid>
        </S.Container>
      </S.Section>

      <S.Section $soft>
        <S.Container>
          <S.Heading>
            <S.Eyebrow>Para quem é</S.Eyebrow>
            <h2>Feito para operações que querem menos improviso no dia a dia.</h2>
          </S.Heading>
          <S.Audience>
            {audiences.map((item) => (
              <S.AudienceCard key={item.title}>
                {item.icon}
                <b>{item.title}</b>
                <p>{item.text}</p>
              </S.AudienceCard>
            ))}
          </S.Audience>
        </S.Container>
      </S.Section>

      <S.Section>
        <S.Container>
          <S.Heading>
            <S.Eyebrow>Perguntas frequentes</S.Eyebrow>
            <h2>O que você precisa saber antes de testar.</h2>
          </S.Heading>
          <S.Faq>
            <details>
              <summary>A demonstração altera dados reais?</summary>
              <p>
                Não. A experiência demonstrativa usa somente dados fictícios dentro do navegador.
              </p>
            </details>
            <details>
              <summary>Quais perfis consigo testar?</summary>
              <p>
                Cliente, administrador e os perfis de equipe: atendente, garçom, cozinha e
                motoqueiro.
              </p>
            </details>
            <details>
              <summary>O sistema atende mesa, retirada e delivery?</summary>
              <p>Sim. Esses fluxos fazem parte da estrutura operacional do GastroNexa.</p>
            </details>
            <details>
              <summary>Posso conhecer antes de contratar?</summary>
              <p>
                Sim. A demonstração fica disponível para você percorrer os principais fluxos antes
                de conversar com a equipe.
              </p>
            </details>
          </S.Faq>
        </S.Container>
      </S.Section>

      <S.Section id="contato" $soft>
        <S.Container>
          <S.Contact>
            <div>
              <S.Eyebrow>Contato comercial</S.Eyebrow>
              <h2>Quer levar esse fluxo para o seu restaurante?</h2>
              <p>
                Experimente a demonstração e depois fale com a GastroNexa para entender qual plano
                combina com a sua operação.
              </p>
            </div>
            <div className="actions">
              <S.Button href={salesHref}>
                <MessageCircleMore size={17} /> Falar com a GastroNexa
              </S.Button>
              <S.Button as={Link} to="/demonstracao" $secondary>
                Ver demonstração <ArrowRight size={16} />
              </S.Button>
            </div>
          </S.Contact>
        </S.Container>
      </S.Section>

      <S.Footer>
        <S.FooterInner>
          <Brand light />
          <span>
            © {new Date().getFullYear()} GastroNexa. Tecnologia para operações de alimentação.
          </span>
        </S.FooterInner>
      </S.Footer>
    </S.Page>
  );
}
