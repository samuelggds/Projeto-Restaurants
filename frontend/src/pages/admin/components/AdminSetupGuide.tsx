import { useId, useState } from 'react';
import { ArrowRight, BookOpen, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { sectionTitle } from '../config/adminNavigation';
import type { AdminSection, SettingsSection } from '../types';
import { GuideRoot } from './AdminSetupGuide.styles';

type GuideAction = {
  label: string;
  description: string;
} & (
  | { kind: 'settings'; section: SettingsSection }
  | { kind: 'area'; area: AdminSection }
  | { kind: 'store' }
);

type GuideStep = {
  label: string;
  title: string;
  description: string;
  tip: string;
  actions: GuideAction[];
};

const settingsAction = (section: SettingsSection, description: string): GuideAction => ({
  kind: 'settings',
  section,
  label: sectionTitle[section],
  description,
});

const steps: GuideStep[] = [
  {
    label: 'Restaurante',
    title: 'Apresente seu restaurante',
    description:
      'Comece pelas informações que identificam seu negócio e ajudam o cliente a encontrar você.',
    tip: 'Confira os dados e salve as alterações em cada tela antes de seguir.',
    actions: [
      settingsAction('brand', 'Revise o nome, a logo e a identidade do restaurante.'),
      settingsAction('business', 'Preencha os dados do negócio e os contatos de atendimento.'),
      settingsAction('address', 'Confira o endereço completo e a localização do estabelecimento.'),
    ],
  },
  {
    label: 'Cardápio',
    title: 'Organize o que você vende',
    description:
      'Monte um cardápio fácil de explorar, com categorias, produtos e preços atualizados.',
    tip: 'Revise fotos, descrições, adicionais e disponibilidade antes de divulgar seu cardápio.',
    actions: [
      {
        kind: 'area',
        area: 'catalog',
        label: 'Cardápio',
        description:
          'Cadastre categorias e produtos, ajuste preços e organize as opções de cada item.',
      },
    ],
  },
  {
    label: 'Atendimento',
    title: 'Defina como você atende',
    description: 'Ajuste os horários e as modalidades de atendimento à rotina do seu restaurante.',
    tip: 'Configure as modalidades que você usa. Os recursos de mesa seguem a disponibilidade do seu plano.',
    actions: [
      settingsAction('hours', 'Defina os dias e horários em que o restaurante recebe pedidos.'),
      settingsAction('delivery', 'Revise entrega, retirada, taxas e estimativas de prazo.'),
      settingsAction('table', 'Se você atende no salão, confira o cardápio e os pedidos por mesa.'),
    ],
  },
  {
    label: 'Pagamentos',
    title: 'Organize os recebimentos',
    description:
      'Confira as formas de pagamento e as conexões utilizadas para receber dos clientes.',
    tip: 'Na tela de pagamentos, verifique a situação da conexão antes de oferecer pagamentos online.',
    actions: [
      settingsAction(
        'payments',
        'Escolha as formas de pagamento e confira as conexões com os provedores.',
      ),
      settingsAction(
        'table-account',
        'Se você usa mesas, revise a conta, a divisão e as regras de fechamento.',
      ),
    ],
  },
  {
    label: 'Equipe e cozinha',
    title: 'Prepare sua equipe para operar',
    description:
      'Organize os acessos e o recebimento dos pedidos por quem trabalha no restaurante.',
    tip: 'Cada pessoa deve ter os acessos necessários para sua função. Revise as permissões da equipe.',
    actions: [
      {
        kind: 'area',
        area: 'employees',
        label: 'Funcionários',
        description: 'Cadastre sua equipe e confira as funções e os acessos de cada pessoa.',
      },
      settingsAction(
        'printing',
        'Configure a impressão dos pedidos e confira a comunicação com a cozinha.',
      ),
      settingsAction('security', 'Revise as opções de equipe e segurança do painel.'),
    ],
  },
  {
    label: 'Revisar operação',
    title: 'Confira a experiência do seu cliente',
    description:
      'Revise a loja e o fluxo dos pedidos. Volte a este guia sempre que precisar ajustar algo.',
    tip: 'No dia a dia, use Pedidos para acompanhar a operação e Visão geral para consultar os indicadores.',
    actions: [
      {
        kind: 'store',
        label: 'Ver minha loja',
        description: 'Veja como o cardápio e as informações aparecem para o cliente.',
      },
      settingsAction(
        'orders',
        'Confira o aceite, as notificações e as regras de entrada dos pedidos.',
      ),
      {
        kind: 'area',
        area: 'help',
        label: 'Central de ajuda',
        description: 'Fale com o suporte quando precisar de ajuda com o painel.',
      },
    ],
  },
];

export type AdminSetupGuideProps = {
  onNavigate: (area: AdminSection) => void;
  onOpenSettings: (section: SettingsSection) => void;
  onViewStore?: () => void;
};

export default function AdminSetupGuide({
  onNavigate,
  onOpenSettings,
  onViewStore,
}: AdminSetupGuideProps) {
  const [selectedStep, setSelectedStep] = useState(0);
  const [expanded, setExpanded] = useState(true);
  const id = useId();
  const step = steps[selectedStep];
  const actions = step.actions.filter((action) => action.kind !== 'store' || onViewStore);

  const openAction = (action: GuideAction) => {
    if (action.kind === 'settings') onOpenSettings(action.section);
    else if (action.kind === 'area') onNavigate(action.area);
    else onViewStore?.();
  };

  return (
    <GuideRoot aria-labelledby={`${id}-title`}>
      <header className="guide-header">
        <span className="guide-icon" aria-hidden="true">
          <BookOpen size={20} />
        </span>
        <div>
          <h2 id={`${id}-title`}>Seu restaurante, passo a passo</h2>
          <p>
            Um guia para configurar e administrar seu painel. Escolha a etapa que deseja revisar.
          </p>
        </div>
        <button
          className="guide-toggle"
          type="button"
          aria-expanded={expanded}
          aria-controls={`${id}-body`}
          onClick={() => setExpanded(!expanded)}
        >
          <span>{expanded ? 'Recolher guia' : 'Abrir guia'}</span>
          {expanded ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
        </button>
      </header>

      <div id={`${id}-body`} hidden={!expanded}>
        <div
          className="guide-steps"
          role="group"
          aria-label="Etapas de configuração do restaurante"
        >
          {steps.map((item, index) => (
            <button
              key={item.label}
              type="button"
              className="guide-step"
              aria-pressed={selectedStep === index}
              aria-controls={`${id}-content`}
              onClick={() => setSelectedStep(index)}
            >
              <span className="guide-step-number" aria-hidden="true">
                {index + 1}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        <section
          id={`${id}-content`}
          className="guide-content"
          aria-labelledby={`${id}-step-title`}
        >
          <div className="guide-description">
            <span className="guide-step-caption">
              Etapa {selectedStep + 1} de {steps.length}
            </span>
            <h3 id={`${id}-step-title`}>{step.title}</h3>
            <p>{step.description}</p>
          </div>
          <div className="guide-actions">
            {actions.map((action) => (
              <button
                key={action.label}
                type="button"
                className="guide-action"
                onClick={() => openAction(action)}
              >
                <span>
                  <strong>{action.label}</strong>
                  <span className="guide-action-description">{action.description}</span>
                </span>
                {action.kind === 'store' ? (
                  <ExternalLink size={17} aria-hidden="true" />
                ) : (
                  <ArrowRight size={17} aria-hidden="true" />
                )}
              </button>
            ))}
          </div>
          <p className="guide-tip">{step.tip}</p>
        </section>
      </div>
    </GuideRoot>
  );
}
