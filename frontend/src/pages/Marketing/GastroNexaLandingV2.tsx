import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpenText,
  Building2,
  Check,
  CheckCircle2,
  ChefHat,
  CircleDollarSign,
  Clock3,
  Layers3,
  LineChart,
  ListChecks,
  LockKeyhole,
  MapPin,
  Menu,
  MessageCircle,
  MessagesSquare,
  PackagePlus,
  Palette,
  Play,
  ReceiptText,
  Rocket,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Store,
  TicketPercent,
  Users,
  WalletCards,
  X,
} from 'lucide-react';
import { MarketingPlans } from './landing/MarketingPlans';
import { SalesContactForm } from './landing/SalesContactForm';
import * as S from './GastroNexaLandingV2.styles';

const quickBenefits = [
  [ShoppingBag, 'Mais conveniência', 'O cliente navega e pede pelo celular, sem baixar aplicativo.'],
  [Clock3, 'Menos atrito', 'Pedidos organizados e informações claras para a equipe.'],
  [Store, 'Sua marca em primeiro lugar', 'Cores, logo, cardápio e experiência de cada operação.'],
  [Layers3, 'Pronto para redes', 'Unidades separadas, visão consolidada e controle por perfil.'],
] as const;

const features = [
  [BookOpenText, 'Cardápio digital', 'Categorias, fotos, disponibilidade e preços atualizados em poucos cliques.', 'QR Code e link próprio'],
  [ReceiptText, 'Pedidos organizados', 'Receba pedidos com itens, observações e status claros para a operação.', 'Salão, retirada e entrega'],
  [PackagePlus, 'Combos e adicionais', 'Monte opções, tamanhos, extras e regras para cada produto sem improviso.', 'Venda com mais contexto'],
  [WalletCards, 'Pagamentos', 'Ofereça formas de pagamento adequadas à jornada de cada restaurante.', 'Experiência mais fluida'],
  [TicketPercent, 'Cupons e promoções', 'Crie incentivos por período, canal ou unidade com regras fáceis de entender.', 'Campanhas sob controle'],
  [Building2, 'Gestão multiunidade', 'Padronize o essencial e preserve particularidades de cada operação.', 'Visão local e consolidada'],
  [Palette, 'Identidade por restaurante', 'Logo, cores, banners e comunicação alinhados à marca que o cliente conhece.', 'White-label de verdade'],
  [BarChart3, 'Visão para decidir', 'Acompanhe o andamento dos pedidos e entenda a rotina da operação.', 'Informação acionável'],
] as const;

const tenantBenefits = [
  'Cada unidade com cardápio, horários e disponibilidade próprios.',
  'Perfis de acesso adequados para franqueadora, gestor e equipe local.',
  'Identidade visual distinta por marca, praça ou restaurante.',
  'Visão consolidada para redes e franquias.',
];

const steps = [
  [MessagesSquare, 'ETAPA 01', 'Conte sobre sua operação', 'Entendemos canais, unidades, cardápio e identidade para definir a melhor configuração.', 'Diagnóstico objetivo'],
  [Settings2, 'ETAPA 02', 'Configure com acompanhamento', 'Organizamos marcas, unidades, produtos, pagamentos e acessos com o seu time.', 'Configuração guiada'],
  [Rocket, 'ETAPA 03', 'Publique e evolua', 'Seu cardápio entra no ar e a operação ganha uma base preparada para os próximos passos.', 'Evolução contínua'],
] as const;

const signals = [
  [ShoppingBag, 'Pedidos por unidade', 'Acompanhe volume e andamento por operação.'],
  [LineChart, 'Ticket e composição', 'Entenda valores, itens, combos e adicionais.'],
  [Activity, 'Operação em tempo real', 'Veja status para agir onde a rotina pede atenção.'],
  [ListChecks, 'Cardápio e disponibilidade', 'Mantenha a oferta coerente em cada praça.'],
] as const;

const faqs = [
  ['A GastroNexa atende apenas delivery?', 'Não. A configuração pode considerar jornadas de salão, retirada e entrega, conforme os canais definidos para cada restaurante.'],
  ['Cada unidade pode ter preços e horários diferentes?', 'Sim. A estrutura multi-tenant permite administrar particularidades como cardápio, disponibilidade, horários e identidade por unidade.'],
  ['O cliente precisa instalar um aplicativo?', 'Não. O cardápio pode ser acessado por link ou QR Code no navegador, reduzindo o atrito para fazer o pedido.'],
  ['Como funciona a implantação?', 'O processo começa com um diagnóstico da operação e segue com configuração acompanhada de marcas, unidades, produtos, acessos e jornadas.'],
  ['É possível controlar acessos por perfil?', 'Sim. A proposta inclui perfis adequados para diferentes responsabilidades, como gestão da rede, liderança local e equipe operacional.'],
  ['A plataforma mantém a identidade do restaurante?', 'Sim. Cada operação pode ter logo, cores, banners e comunicação próprios para preservar a experiência da marca.'],
] as const;

function Brand({ light = false }: { light?: boolean }) {
  return (
    <S.Brand as={Link} to="/" $light={light} aria-label="GastroNexa - página inicial">
      <img src="/gastronexa-logo.svg" alt="" width="36" height="36" />
      <span>Gastro<strong>Nexa</strong></span>
    </S.Brand>
  );
}

function ScrollLink({
  href,
  children,
  className,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return <a href={href} className={className} onClick={onClick}>{children}</a>;
}

export default function GastroNexaLandingV2() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [initialPlan, setInitialPlan] = useState<'BASICO' | 'PREMIUM' | 'UNDECIDED'>('UNDECIDED');
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    document.title = 'GastroNexa | Cardápio, pedidos e gestão em uma só plataforma';
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    const onOutside = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('keydown', onEscape);
    document.addEventListener('pointerdown', onOutside);
    return () => {
      document.removeEventListener('keydown', onEscape);
      document.removeEventListener('pointerdown', onOutside);
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <S.Page>
      <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>

      <S.Header ref={headerRef}>
        <S.HeaderInner>
          <Brand />
          <S.Nav id="marketing-navigation" $open={menuOpen} aria-label="Navegação principal">
            <ScrollLink href="#solucoes" onClick={closeMenu}>Soluções</ScrollLink>
            <ScrollLink href="#redes" onClick={closeMenu}>Para redes</ScrollLink>
            <ScrollLink href="#como-funciona" onClick={closeMenu}>Como funciona</ScrollLink>
            <ScrollLink href="#recursos" onClick={closeMenu}>Recursos</ScrollLink>
            <ScrollLink href="#duvidas" onClick={closeMenu}>Dúvidas</ScrollLink>
          </S.Nav>
          <div className="header-actions">
            <S.PrimaryButton href="#contato" className="desktop-cta">
              Agendar demonstração <ArrowUpRight size={17} />
            </S.PrimaryButton>
            <S.MenuButton
              ref={menuButtonRef}
              type="button"
              aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={menuOpen}
              aria-controls="marketing-navigation"
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </S.MenuButton>
          </div>
        </S.HeaderInner>
      </S.Header>

      <main id="conteudo">
        <S.Hero id="solucoes">
          <img className="hero-accent" src="/marketing-v3/hero-accent.png" alt="" aria-hidden="true" />
          <S.HeroGrid>
            <S.HeroCopy>
              <S.Badge><i /> Cardápio, pedidos e gestão em uma só plataforma</S.Badge>
              <h1>Seu restaurante vende mais. Sua operação fica mais simples.</h1>
              <p>A GastroNexa conecta cardápio digital, pedidos, pagamentos e gestão multiunidade em uma experiência com a identidade de cada restaurante.</p>
              <div className="hero-actions">
                <S.PrimaryButton href="#contato">Quero conhecer <ArrowRight size={17} /></S.PrimaryButton>
                <S.SecondaryButton href="#produto">Ver demonstração <Play size={17} /></S.SecondaryButton>
              </div>
              <div className="assurances">
                {['Implantação acompanhada', 'Sem app para o cliente', 'Pensado para crescer'].map((item) => (
                  <span key={item}><CheckCircle2 size={15} />{item}</span>
                ))}
              </div>
            </S.HeroCopy>

            <S.ProductStage aria-label="Prévia da plataforma GastroNexa">
              <div className="desktop-product">
                <div className="browser-bar">
                  <i /><i /><i />
                  <span>app.gastronexa.com/restaurante</span>
                </div>
                <img
                  data-testid="marketing-hero-image"
                  src="/marketing-v3/hero-desktop-product.png"
                  alt="Prévia do cardápio GastroNexa no desktop"
                  width="588"
                  height="394"
                  fetchPriority="high"
                />
              </div>
              <div className="phone-product">
                <div className="phone-status"><b>9:41</b><span>● ● ▰</span></div>
                <img className="phone-cover" src="/marketing-v3/restaurant-cover.png" alt="" />
                <div className="phone-menu">
                  <b>Brasa &amp; Ponto</b>
                  <small>● Aberto • 25–35 min</small>
                  <div className="phone-categories"><span>Destaques</span><em>Burgers</em><em>Combos</em></div>
                  <div className="phone-item">
                    <div><b>Smash da Casa</b><small>Pão brioche, carne 160g e molho especial</small><strong>R$ 28,90</strong></div>
                    <img src="/marketing-v3/menu-item.png" alt="" />
                  </div>
                  <button type="button" tabIndex={-1}>Ver carrinho <b>R$ 28,90</b></button>
                </div>
              </div>
              <div className="order-badge">
                <span><ReceiptText size={16} /></span>
                <div><small>Novo pedido recebido</small><b>#284 • R$ 76,40</b></div>
              </div>
            </S.ProductStage>
          </S.HeroGrid>
        </S.Hero>

        <S.QuickBenefits>
          {quickBenefits.map(([Icon, title, description]) => (
            <article key={title}>
              <span><Icon size={18} /></span>
              <div><h3>{title}</h3><p>{description}</p></div>
            </article>
          ))}
        </S.QuickBenefits>

        <S.Challenge>
          <S.OperationVisual>
            <img src="/marketing-v3/kitchen-service.png" alt="Operação de restaurante durante o atendimento" />
            <div className="order-alert">
              <div><b>PEDIDO #286</b><span>NOVO</span></div>
              <strong>2 Smash Clássico + 1 Batata</strong>
              <small>Retirada • pagamento via PIX</small>
            </div>
          </S.OperationVisual>
          <S.ChallengeCopy>
            <S.Eyebrow>Da correria ao controle</S.Eyebrow>
            <h2>Quando os canais se espalham, a operação sente.</h2>
            <p>Cardápio desatualizado, pedidos em lugares diferentes e pouca visibilidade entre unidades custam tempo — e deixam a experiência do cliente inconsistente.</p>
            <ul className="problems">
              {[
                'Alterações de preço e disponibilidade feitas manualmente.',
                'Pedidos chegando sem padrão e com informações incompletas.',
                'Cada unidade operando de um jeito, sem visão compartilhada.',
              ].map((item) => <li key={item}><span>×</span>{item}</li>)}
            </ul>
            <div className="solution">
              <h3>A GastroNexa cria uma jornada conectada.</h3>
              <p><i><Check size={13} /></i>Uma base para vender, atender e acompanhar.</p>
              <p><i><Check size={13} /></i>Flexibilidade local sem perder o padrão da rede.</p>
            </div>
            <S.SoftButton href="#produto">Ver a plataforma em ação <ArrowRight size={17} /></S.SoftButton>
          </S.ChallengeCopy>
        </S.Challenge>

        <S.FeaturesSection id="recursos">
          <S.SectionHeading>
            <div>
              <S.Eyebrow>Recursos para a operação</S.Eyebrow>
              <h2>Tudo que seu restaurante precisa para transformar pedidos em rotina.</h2>
              <p>Uma plataforma modular, com recursos que conversam entre si e acompanham o jeito de trabalhar de cada negócio.</p>
            </div>
            <aside><strong>1 plataforma</strong><span>do cardápio à gestão da rede</span></aside>
          </S.SectionHeading>
          <S.FeatureGrid>
            {features.map(([Icon, title, description, note]) => (
              <article key={title}>
                <span className="icon"><Icon size={20} /></span>
                <div><h3>{title}</h3><p>{description}</p></div>
                <small><ArrowRight size={14} />{note}</small>
              </article>
            ))}
          </S.FeatureGrid>
        </S.FeaturesSection>

        <S.MultiTenant id="redes">
          <img className="orange-glow" src="/marketing-v3/orange-glow.png" alt="" aria-hidden="true" />
          <div className="tenant-copy">
            <S.DarkEyebrow>Multi-tenancy sem complicação</S.DarkEyebrow>
            <h2>Uma estrutura para a rede. Uma experiência própria para cada restaurante.</h2>
            <p>A GastroNexa separa dados, configurações e acessos por operação, enquanto a gestão da rede enxerga o conjunto. É governança sem engessar quem está na ponta.</p>
            <ul>
              {tenantBenefits.map((item) => <li key={item}><span><Check size={13} /></span>{item}</li>)}
            </ul>
            <S.PrimaryButton href="#contato">Conversar sobre minha rede <ArrowRight size={17} /></S.PrimaryButton>
          </div>
          <S.NetworkDashboard aria-label="Exemplo de painel multiunidade">
            <header><Brand /><span>Hoje, 30 set. <i>SG</i></span></header>
            <div className="dash-body">
              <nav>
                <span><BarChart3 />Visão geral</span>
                <span className="active"><Building2 />Unidades</span>
                <span><ShoppingBag />Pedidos</span>
                <span><BookOpenText />Cardápio</span>
                <span><Users />Equipe</span>
              </nav>
              <div className="dash-content">
                <div className="dash-title"><div><b>Unidades</b><small>Acompanhe cada operação em um só lugar</small></div><button type="button">+ Nova unidade</button></div>
                <div className="dash-metrics"><span><b>3</b><small>Unidades</small></span><span><b>98</b><small>Pedidos hoje</small></span><span><b>R$ 6,8 mil</b><small>Volume do dia</small></span></div>
                <div className="units">
                  {[['Vila Madalena','42 pedidos','Aberta'],['Moema','37 pedidos','Aberta'],['Pinheiros','19 pedidos','Pausada']].map(([name, orders, status]) => (
                    <div key={name}><span className="pin"><MapPin size={14} /></span><span><b>{name}</b><small>{orders}</small></span><em className={status === 'Aberta' ? 'open' : ''}>{status}</em></div>
                  ))}
                </div>
              </div>
            </div>
          </S.NetworkDashboard>
        </S.MultiTenant>

        <S.StepsSection id="como-funciona">
          <S.CenterHeading>
            <S.Eyebrow>Do primeiro contato ao primeiro pedido</S.Eyebrow>
            <h2>Começar é mais simples quando existe um caminho claro.</h2>
            <p>Nossa implantação organiza o essencial sem tirar seu time da operação.</p>
          </S.CenterHeading>
          <S.StepGrid>
            {steps.map(([Icon, label, title, description, timing], index) => (
              <article key={label} className={index === 1 ? 'featured' : ''}>
                <div className="step-top"><b>{label}</b><span><Icon size={19} /></span></div>
                <div><h3>{title}</h3><p>{description}</p></div>
                <small><Clock3 size={14} />{timing}</small>
              </article>
            ))}
          </S.StepGrid>
        </S.StepsSection>

        <S.ProductSection id="produto">
          <S.SectionHeading>
            <div>
              <S.Eyebrow>Por dentro da GastroNexa</S.Eyebrow>
              <h2>Do pedido do cliente à gestão: uma experiência contínua.</h2>
              <p>Interfaces claras para quem compra, para quem atende e para quem acompanha o negócio.</p>
            </div>
            <S.SecondaryButton href="#contato">Solicitar demonstração <Play size={17} /></S.SecondaryButton>
          </S.SectionHeading>
          <S.Gallery>
            <figure>
              <img src="/marketing-v3/payment-details.png" alt="Tela de detalhes de pagamento da GastroNexa" />
              <figcaption><b>Detalhes de pagamento</b><small>Gestão segura das formas cadastradas</small></figcaption>
            </figure>
            <figure className="featured">
              <img src="/marketing-v3/custom-order.png" alt="Tela de pedido personalizado da GastroNexa" />
              <figcaption><b>Pedido personalizado</b><small>Produto, ponto da carne e adicionais</small></figcaption>
            </figure>
            <figure>
              <img src="/marketing-v3/card-data.png" alt="Tela de dados do cartão da GastroNexa" />
              <figcaption><b>Dados do cartão</b><small>Experiência clara para cada restaurante</small></figcaption>
            </figure>
          </S.Gallery>
          <S.ProductCallouts>
            <article><span><Smartphone /></span><div><b>Feito para o cliente</b><p>Navegação direta, imagens em destaque e decisão sem ruído.</p></div></article>
            <article><span><ChefHat /></span><div><b>Feito para a operação</b><p>Informações organizadas para preparar, conferir e avançar.</p></div></article>
            <article><span><LineChart /></span><div><b>Feito para a gestão</b><p>Visão que conecta cada unidade ao contexto da rede.</p></div></article>
          </S.ProductCallouts>
        </S.ProductSection>

        <S.SignalsSection>
          <S.SectionHeading>
            <div>
              <S.Eyebrow>Métricas sem promessas vazias</S.Eyebrow>
              <h2>Acompanhe o que importa para sua rotina.</h2>
              <p>Os resultados dependem da operação. A GastroNexa ajuda sua equipe a enxergar sinais úteis para tomar decisões com mais contexto.</p>
            </div>
            <aside className="ethics"><ShieldCheck size={22} /><span>Sem clientes fictícios ou números genéricos: sua demonstração usa cenários aderentes ao seu negócio.</span></aside>
          </S.SectionHeading>
          <S.SignalGrid>
            {signals.map(([Icon, title, description]) => <article key={title}><span><Icon /></span><h3>{title}</h3><p>{description}</p></article>)}
          </S.SignalGrid>
        </S.SignalsSection>

        <S.PlansSection id="planos">
          <S.CenterHeading>
            <S.Eyebrow>Antes de começar, saiba escolher</S.Eyebrow>
            <h2>Comece com o que faz sentido. Cresça sem trocar de base.</h2>
            <p>Escolha o plano ideal para o tamanho e necessidade da sua operação.</p>
          </S.CenterHeading>
          <MarketingPlans onSelectPlan={setInitialPlan} />
        </S.PlansSection>

        <S.FaqSection id="duvidas">
          <div className="faq-intro">
            <S.Eyebrow>Perguntas frequentes</S.Eyebrow>
            <h2>Antes de conversar, vale esclarecer.</h2>
            <p>Reunimos as dúvidas mais comuns de donos, gestores e times de expansão.</p>
            <div className="faq-help"><b>Sua operação tem outro cenário?</b><p>Conte para nosso time. A demonstração pode focar nos fluxos que realmente importam para você.</p><a href="#contato">Falar com um especialista →</a></div>
          </div>
          <div className="faq-list">
            {faqs.map(([question, answer], index) => (
              <details key={question} open={index === 0 ? true : undefined}>
                <summary><span className="faq-number">{String(index + 1).padStart(2, '0')}</span><b>{question}</b><i>{index === 0 ? '−' : '+'}</i></summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </S.FaqSection>

        <S.DemoSection id="contato">
          <img className="demo-food" src="/marketing-v3/demo-food.png" alt="" aria-hidden="true" />
          <div className="demo-overlay" aria-hidden="true" />
          <div className="demo-copy">
            <S.DarkEyebrow>Demonstração personalizada</S.DarkEyebrow>
            <h2>Veja a GastroNexa aplicada à realidade do seu restaurante.</h2>
            <p>Preencha o formulário e conte um pouco sobre sua operação. Nosso time prepara uma conversa objetiva, sem compromisso.</p>
            <ul>
              <li><span><Check size={13} /></span>Demonstração focada nos canais que você utiliza.</li>
              <li><span><Check size={13} /></span>Cenário para uma unidade, rede ou franquia.</li>
              <li><span><Check size={13} /></span>Espaço para dúvidas comerciais e operacionais.</li>
            </ul>
            <div className="privacy-note"><LockKeyhole size={20} /><span>Seus dados serão usados apenas para responder ao seu contato e conduzir esta oportunidade comercial.</span></div>
          </div>
          <SalesContactForm initialPlan={initialPlan} onPlanChange={setInitialPlan} />
        </S.DemoSection>

        <S.FinalCta>
          <div><h2>Seu próximo pedido pode começar por uma experiência melhor.</h2><p>Conheça uma plataforma criada para respeitar sua marca e acompanhar o crescimento da operação.</p></div>
          <a href="#contato">Quero conhecer <ArrowUpRight size={17} /></a>
        </S.FinalCta>
      </main>

      <S.Footer>
        <div className="footer-top">
          <div className="footer-brand">
            <Brand light />
            <p>Plataforma SaaS multi-tenant para cardápio digital, pedidos e gestão de restaurantes.</p>
            <div className="socials"><a href="#contato" aria-label="Instagram"><MessageCircle /></a><a href="#contato" aria-label="LinkedIn"><LineChart /></a><a href="#contato" aria-label="WhatsApp"><MessageCircle /></a></div>
          </div>
          <div><b>Plataforma</b><a href="#recursos">Recursos</a><a href="#redes">Multiunidade</a><a href="#solucoes">Cardápio digital</a><a href="#recursos">Pedidos</a><a href="#recursos">Pagamentos</a></div>
          <div><b>Para seu negócio</b><a href="#solucoes">Restaurantes</a><a href="#redes">Redes e franquias</a><a href="#contato">Demonstração</a><a href="#contato">Fale com vendas</a></div>
          <div><b>Institucional</b><a href="#conteudo">Sobre a GastroNexa</a><a href="#duvidas">Ajuda e suporte</a><a href="/termos/">Termos de uso</a><a href="/privacidade/">Privacidade</a></div>
        </div>
        <div className="footer-bottom"><span>© {new Date().getFullYear()} GastroNexa. Todos os direitos reservados.</span><nav aria-label="Links legais"><a href="/privacidade/">Privacidade</a><a href="/termos/">Termos</a><a href="/cookies/">Cookies</a></nav></div>
      </S.Footer>
    </S.Page>
  );
}
