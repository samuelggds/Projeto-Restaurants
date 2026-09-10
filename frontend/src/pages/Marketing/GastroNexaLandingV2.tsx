import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChefHat,
  ClipboardList,
  Coffee,
  HeartHandshake,
  Menu,
  MessageSquareText,
  Pizza,
  Play,
  QrCode,
  ShoppingBag,
  Sparkles,
  Store,
  Truck,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { LandingPreview } from './landing/LandingPreview';
import { SalesContactForm } from './landing/SalesContactForm';
import * as S from './GastroNexaLandingV2.styles';

const features = [
  {
    icon: QrCode,
    title: 'Um cardápio com a sua cara.',
    text: 'Sua marca, seus produtos e um caminho simples para pedir. No delivery, na retirada ou pelo QR Code da mesa.',
    detail: 'Do primeiro olhar ao primeiro pedido',
    className: 'menu-card',
    tags: ['Sua marca', 'Delivery', 'QR Code'],
  },
  {
    icon: ChefHat,
    title: 'Da comanda para a cozinha.',
    text: 'Pedidos organizados por etapa, com os itens e as observações que a equipe precisa para preparar tudo com cuidado.',
    detail: 'Todo mundo sabe o próximo passo',
    className: 'kitchen-card',
    tags: ['Recebido', 'Em preparo', 'Pronto'],
  },
  {
    icon: ClipboardList,
    title: 'Sua operação, bem cuidada.',
    text: 'Acompanhe pedidos, clientes e equipe. Tenha uma visão do restaurante, com acessos próprios para cada função.',
    detail: 'Mais clareza para tomar decisões',
    className: 'management-card',
    tags: ['Gestão', 'Equipe', 'Clientes'],
  },
];
const plans = [
  {
    id: 'BASICO' as const,
    name: 'Básico',
    price: '149,90',
    description: 'Para organizar seu delivery e começar uma nova fase.',
    features: ['Sistema de delivery', 'Gestão dos pedidos de entrega', 'Suporte padrão'],
    featured: false,
  },
  {
    id: 'PREMIUM' as const,
    name: 'Premium',
    price: '249,90',
    description: 'Para conectar o delivery e o atendimento das suas mesas.',
    features: [
      'Tudo do plano Básico',
      'Cardápio digital com QR Code de mesa',
      'Suporte prioritário',
    ],
    featured: true,
  },
];
const questions = [
  [
    'Posso conhecer o sistema antes de contratar?',
    'Sim. A demonstração é aberta e já vem com contas e produtos fictícios. Você pode fazer um pedido, acompanhar o preparo e conhecer o trabalho de cada função antes de conversar com a nossa equipe.',
  ],
  [
    'A GastroNexa funciona no salão e no delivery?',
    'Sim. O sistema organiza delivery, retirada no balcão e pedidos de mesa. O plano Básico inclui o delivery; o Premium também inclui o cardápio digital com QR Code para as mesas.',
  ],
  [
    'Cada funcionário tem seu próprio acesso?',
    'Sim. Administrador, atendente, cozinha, garçom e motoqueiro têm áreas próprias. A cozinha acompanha o preparo, o garçom cuida dos pedidos de mesa e o motoqueiro das entregas de delivery.',
  ],
  [
    'A demonstração faz pedidos ou cobranças reais?',
    'Não. Os pedidos, produtos, contas e pagamentos da demonstração são fictícios. Você pode explorar a experiência sem enviar pedidos a um restaurante real.',
  ],
  [
    'Como funciona o período de teste?',
    'Os planos apresentados incluem 30 dias de teste antes da cobrança mensal. Envie seu contato para entender o início do teste e escolher o plano adequado à sua operação.',
  ],
];

function Brand({ light = false }: { light?: boolean }) {
  return (
    <S.Brand as={Link} to="/" $light={light} aria-label="GastroNexa - página inicial">
      <img src="/gastronexa-logo.png" alt="" width="42" height="38" />
      <span>
        GastroNexa<span className="brand-dot">.</span>
      </span>
    </S.Brand>
  );
}

export default function GastroNexaLandingV2() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [initialPlan, setInitialPlan] = useState<'BASICO' | 'PREMIUM' | 'UNDECIDED'>('UNDECIDED');
  const header = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    document.title = 'GastroNexa | Seu restaurante, no seu melhor';
  }, []);
  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    };
    const closeOutside = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const closeOnDesktop = () => {
      if (window.innerWidth > 960) setMenuOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('pointerdown', closeOutside);
    window.addEventListener('resize', closeOnDesktop);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('pointerdown', closeOutside);
      window.removeEventListener('resize', closeOnDesktop);
    };
  }, [menuOpen]);
  const closeMenu = () => setMenuOpen(false);
  return (
    <S.Page>
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      <S.Header ref={header}>
        <S.HeaderInner>
          <Brand />
          <S.Nav id="marketing-navigation" $open={menuOpen} aria-label="Navegação principal">
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
            <S.Button href="#contato" $small>
              Falar com a equipe <ArrowUpRight size={16} />
            </S.Button>
            <S.MenuButton
              ref={menuButton}
              type="button"
              aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
              aria-controls="marketing-navigation"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((value) => !value)}
            >
              {menuOpen ? <X size={21} /> : <Menu size={21} />}
            </S.MenuButton>
          </S.HeaderActions>
        </S.HeaderInner>
      </S.Header>
      <main id="conteudo">
        <S.Hero>
          <S.HeroGrid>
            <S.HeroCopy>
              <S.HeroBadge>
                <span /> TECNOLOGIA COM JEITO DE RESTAURANTE
              </S.HeroBadge>
              <h1>
                Seu restaurante,
                <br />
                no seu <em>melhor.</em>
              </h1>
              <p>
                Você cuida do sabor e de quem chega.
                <br className="desktop-break" /> A GastroNexa conecta os pedidos, a cozinha e a
                equipe para a operação acontecer com mais clareza.
              </p>
              <S.HeroActions>
                <S.Button as={Link} to="/demonstracao">
                  Experimentar demonstração <ArrowUpRight size={18} />
                </S.Button>
                <S.TextLink href="#como-funciona">
                  <span className="play-icon">
                    <Play size={12} fill="currentColor" />
                  </span>
                  Conhecer o sistema
                </S.TextLink>
              </S.HeroActions>
              <S.HeroProof>
                <span>
                  <CheckCircle2 size={16} /> Explore antes de contratar
                </span>
                <span>
                  <CheckCircle2 size={16} /> Do salão ao delivery
                </span>
              </S.HeroProof>
              <S.HeroFootnote>
                <span className="small-line" /> Feito para quem faz da comida o seu negócio.
              </S.HeroFootnote>
            </S.HeroCopy>
            <S.HeroVisual>
              <div className="photo-wrap">
                <img
                  data-testid="marketing-hero-image"
                  src="/marketing/restaurant-owner.png"
                  alt="Restauradora usando um tablet em um restaurante acolhedor"
                  width="1122"
                  height="1402"
                  fetchPriority="high"
                />
                <div className="photo-shade" />
                <p className="photo-caption">
                  Mais presença no salão.
                  <br />
                  <em>Mais cuidado em cada pedido.</em>
                </p>
              </div>
              <div className="photo-sticker">
                <Sparkles size={16} />
                <span>
                  Feito para a<br />
                  <b>sua rotina.</b>
                </span>
              </div>
              <div className="order-notice" aria-label="Exemplo de aviso de pedido">
                <span className="notice-icon">
                  <ShoppingBag size={21} />
                </span>
                <div>
                  <b>Um novo pedido chegou</b>
                  <small>Mesa 08 · enviado para a cozinha</small>
                </div>
                <span className="notice-check">
                  <Check size={14} />
                </span>
                <span className="sample-label">Exemplo ilustrativo</span>
              </div>
            </S.HeroVisual>
          </S.HeroGrid>
          <S.AudienceStrip>
            <span>UM SISTEMA. MUITOS SABORES.</span>
            <div>
              <span>
                <UtensilsCrossed />
                Restaurantes
              </span>
              <span>
                <Pizza />
                Pizzarias
              </span>
              <span>
                <ShoppingBag />
                Hamburguerias
              </span>
              <span>
                <Coffee />
                Cafés e bistrôs
              </span>
            </div>
          </S.AudienceStrip>
        </S.Hero>
        <S.Section id="recursos">
          <S.Container>
            <S.SectionHeading>
              <div>
                <S.Eyebrow>SIMPLES NO USO. COMPLETO NA ROTINA.</S.Eyebrow>
                <h2>
                  Menos tarefas soltas.
                  <br />
                  <em>Mais restaurante.</em>
                </h2>
              </div>
              <p>
                Do pedido à entrega, as ferramentas certas para organizar o trabalho e cuidar da
                experiência de quem escolhe você.
              </p>
            </S.SectionHeading>
            <S.Features>
              {features.map((feature, index) => (
                <S.Feature key={feature.title} className={feature.className}>
                  <div className="feature-top">
                    <span className="feature-icon">
                      <feature.icon size={26} strokeWidth={1.6} />
                    </span>
                    <span className="feature-number">0{index + 1}</span>
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{feature.text}</p>
                  <div className="feature-tags">
                    {feature.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                  <div className="feature-bottom">
                    <small>{feature.detail}</small>
                    <ArrowUpRight size={19} />
                  </div>
                </S.Feature>
              ))}
            </S.Features>
          </S.Container>
        </S.Section>
        <S.Section id="como-funciona" $soft>
          <S.Container>
            <LandingPreview />
          </S.Container>
        </S.Section>
        <S.DemoSection>
          <S.Container>
            <S.DemoBand>
              <div>
                <S.Eyebrow>CONHEÇA NA PRÁTICA</S.Eyebrow>
                <h2>
                  Antes de decidir,
                  <br />
                  <em>experimente.</em>
                </h2>
                <p>
                  Faça um pedido como cliente. Veja chegar na cozinha. Acompanhe o salão e a
                  entrega. Conheça a GastroNexa por dentro, no seu tempo.
                </p>
                <S.Button as={Link} to="/demonstracao" $lime>
                  Abrir demonstração <ArrowUpRight size={18} />
                </S.Button>
                <small className="demo-note">
                  Contas prontas e dados fictícios. É só entrar e explorar.
                </small>
              </div>
              <div className="demo-journey">
                <span className="journey-label">UM PEDIDO, UMA EQUIPE CONECTADA</span>
                <div className="journey-step">
                  <span>
                    <ShoppingBag size={23} />
                  </span>
                  <div>
                    <small>01 · CLIENTE</small>
                    <b>Escolhe. Pede. Acompanha.</b>
                  </div>
                  <CheckCircle2 size={18} />
                </div>
                <div className="journey-line" />
                <div className="journey-step">
                  <span>
                    <ChefHat size={23} />
                  </span>
                  <div>
                    <small>02 · COZINHA</small>
                    <b>Recebe. Prepara. Libera.</b>
                  </div>
                  <CheckCircle2 size={18} />
                </div>
                <div className="journey-line" />
                <div className="journey-step">
                  <span>
                    <Truck size={23} />
                  </span>
                  <div>
                    <small>03 · SALÃO E DELIVERY</small>
                    <b>Cada pedido no seu destino.</b>
                  </div>
                  <ArrowRight size={18} />
                </div>
                <p>
                  <HeartHandshake size={16} /> Experimente como cliente, equipe ou admin.
                </p>
              </div>
            </S.DemoBand>
          </S.Container>
        </S.DemoSection>
        <S.Section id="planos">
          <S.Container>
            <S.CenterHeading>
              <S.Eyebrow>UM PLANO PARA O SEU MOMENTO</S.Eyebrow>
              <h2>
                O próximo passo
                <br />
                <em>começa do seu jeito.</em>
              </h2>
              <p>
                Escolha o que faz sentido para a sua operação.
                <br />
                Os dois planos incluem 30 dias de teste.
              </p>
            </S.CenterHeading>
            <S.PlanGrid>
              {plans.map((plan) => (
                <S.Plan key={plan.id} $featured={plan.featured}>
                  <div className="plan-top">
                    <span className="plan-icon">
                      {plan.featured ? <Sparkles size={23} /> : <Store size={23} />}
                    </span>
                    {plan.featured && <span className="plan-badge">OPERAÇÃO COMPLETA</span>}
                  </div>
                  <h3>{plan.name}</h3>
                  <p className="description">{plan.description}</p>
                  <div className="price">
                    <span>R$</span>
                    <strong>{plan.price}</strong>
                    <small>/mês</small>
                  </div>
                  <span className="trial">
                    <CheckCircle2 size={14} />
                    30 dias de teste
                  </span>
                  <S.Button
                    href="#contato"
                    $secondary={!plan.featured}
                    $lime={plan.featured}
                    onClick={() => setInitialPlan(plan.id)}
                  >
                    Quero o {plan.name} <ArrowUpRight size={17} />
                  </S.Button>
                  <ul>
                    {plan.features.map((feature) => (
                      <li key={feature}>
                        <Check size={16} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </S.Plan>
              ))}
            </S.PlanGrid>
            <p className="plan-help">
              Ainda não sabe qual escolher?{' '}
              <a href="#contato" onClick={() => setInitialPlan('UNDECIDED')}>
                Vamos entender sua operação <ArrowRight size={14} />
              </a>
            </p>
          </S.Container>
        </S.Section>
        <S.Section id="duvidas" $soft>
          <S.Container>
            <S.FaqLayout>
              <div>
                <S.Eyebrow>PODE PERGUNTAR</S.Eyebrow>
                <h2>
                  Vamos deixar
                  <br />
                  <em>tudo mais claro.</em>
                </h2>
                <p>Algumas respostas para você dar o próximo passo com tranquilidade.</p>
                <S.TextLink href="#contato">
                  Tenho outra dúvida <ArrowUpRight size={16} />
                </S.TextLink>
              </div>
              <S.Faq>
                {questions.map(([question, answer]) => (
                  <details key={question}>
                    <summary>
                      {question}
                      <span aria-hidden="true">+</span>
                    </summary>
                    <p>{answer}</p>
                  </details>
                ))}
              </S.Faq>
            </S.FaqLayout>
          </S.Container>
        </S.Section>
        <S.Section id="contato">
          <S.Container>
            <S.ContactLayout>
              <div className="contact-copy">
                <S.Eyebrow>VAMOS CONVERSAR</S.Eyebrow>
                <h2>
                  Conte um pouco
                  <br />
                  do seu <em>restaurante.</em>
                </h2>
                <p>
                  Queremos conhecer a sua rotina e ajudar a encontrar o plano que combina com o seu
                  negócio.
                </p>
                <div className="contact-promise">
                  <span>
                    <MessageSquareText size={22} />
                  </span>
                  <div>
                    <b>Uma conversa, sem complicação.</b>
                    <p>
                      Envie suas informações e nossa equipe entra em contato para tirar suas
                      dúvidas.
                    </p>
                  </div>
                </div>
                <ul>
                  <li>
                    <Check size={16} /> Atendimento sobre a sua operação
                  </li>
                  <li>
                    <Check size={16} /> Sem precisar de CNPJ neste primeiro contato
                  </li>
                  <li>
                    <Check size={16} /> Seus dados usados para responder à solicitação
                  </li>
                </ul>
                <a className="contact-demo" href="/demonstracao">
                  Prefere explorar primeiro? Abra a demonstração <ArrowUpRight size={15} />
                </a>
              </div>
              <SalesContactForm initialPlan={initialPlan} onPlanChange={setInitialPlan} />
            </S.ContactLayout>
          </S.Container>
        </S.Section>
      </main>
      <S.Footer>
        <S.Container>
          <div className="footer-top">
            <div>
              <Brand light />
              <p>
                Tecnologia que conecta.
                <br />
                Cuidado que faz a diferença.
              </p>
            </div>
            <div className="footer-links">
              <a href="#recursos">Recursos</a>
              <a href="#planos">Planos</a>
              <Link to="/demonstracao">Demonstração</Link>
              <a href="#contato">Contato</a>
            </div>
            <a className="back-top" href="#conteudo" aria-label="Voltar ao início">
              <ArrowDown size={17} />
            </a>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} GastroNexa. Todos os direitos reservados.</span>
            <span>Feito para quem serve bem.</span>
          </div>
        </S.Container>
      </S.Footer>
    </S.Page>
  );
}
