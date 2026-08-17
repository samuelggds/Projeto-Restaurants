import type { ReactNode } from 'react';
import type { EmployeeHelpGuide } from './employeeHelpGuides';
import { employeeHelpCallouts } from './employeeHelpCallouts';

type EmployeeHelpPreviewProps = {
  guide: EmployeeHelpGuide;
};

type ToolbarProps = {
  search?: string;
  filter?: string;
  markerStart: number;
};

function Toolbar({ search = 'Buscar ou selecionar', filter, markerStart }: ToolbarProps) {
  return (
    <div className="mock-toolbar">
      <span className="mock-input" data-marker={markerStart}>
        ⌕ {search}
      </span>
      {filter && (
        <span className="mock-select" data-marker={markerStart + 1}>
          {filter}
        </span>
      )}
    </div>
  );
}

function Empty({ children = 'Nenhum item exibido neste molde.' }: { children?: string }) {
  return (
    <div className="mock-empty">
      <i>○</i>
      {children}
    </div>
  );
}

function Panel({
  title,
  detail,
  children,
  marker,
}: {
  title: string;
  detail?: string;
  children: ReactNode;
  marker?: number;
}) {
  return (
    <section className="mock-panel" data-marker={marker}>
      <header>
        <div>
          <h5>{title}</h5>
          {detail && <p>{detail}</p>}
        </div>
        <i>⌁</i>
      </header>
      {children}
    </section>
  );
}

function Metrics({ labels, markerStart }: { labels: string[]; markerStart: number }) {
  return (
    <div className="mock-metrics">
      {labels.map((label, index) => (
        <article className="mock-metric" key={label} data-marker={markerStart + index}>
          <span>{label}</span>
          <strong>0</strong>
          <small>Atualizado agora</small>
        </article>
      ))}
    </div>
  );
}

function FormGrid({ labels, markerStart }: { labels: string[]; markerStart: number }) {
  return (
    <div className="mock-form-grid">
      {labels.map((label, index) => (
        <label className="mock-field" key={label} data-marker={markerStart + index}>
          {label}
          <span />
        </label>
      ))}
    </div>
  );
}

function Action({ children, marker }: { children: string; marker: number }) {
  return (
    <div className="mock-action-wrap">
      <span className="mock-action" data-marker={marker}>
        {children}
      </span>
    </div>
  );
}

function Rows({ count = 3 }: { count?: number }) {
  return (
    <div className="mock-rows" aria-label="Linhas demonstrativas sem dados reais">
      {Array.from({ length: count }, (_, index) => (
        <span key={index}>
          <i />
          <b />
        </span>
      ))}
    </div>
  );
}

function KitchenPreview({ guide }: EmployeeHelpPreviewProps) {
  switch (guide.preview) {
    case 'kitchen-overview':
      return (
        <>
          <Metrics
            labels={['Pedidos ativos', 'Pendentes', 'Preparando', 'Prontos']}
            markerStart={3}
          />
          <div className="mock-layout split">
            <Panel
              title="Prioridade da cozinha"
              detail="Pedidos com maior tempo de espera."
              marker={7}
            >
              <Empty>Pedidos prioritários aparecerão aqui.</Empty>
            </Panel>
            <Panel title="Resumo por canal" detail="Pedidos ativos neste turno." marker={8}>
              <div className="mock-summary-list">
                {['Mesa', 'Retirada', 'Delivery'].map((item) => (
                  <span key={item}>
                    {item}
                    <b>—</b>
                  </span>
                ))}
              </div>
            </Panel>
          </div>
          <Action marker={9}>{guide.action}</Action>
        </>
      );
    case 'kitchen-queue':
      return (
        <>
          <Toolbar search="Buscar pedido ou mesa" filter="Todos os status" markerStart={3} />
          <div className="mock-layout triple">
            {['Pendente', 'Preparando', 'Pronto'].map((item, index) => (
              <Panel
                title={item}
                detail="Nenhum pedido neste status."
                key={item}
                marker={5 + index}
              >
                <Empty>Nenhum pedido listado.</Empty>
              </Panel>
            ))}
          </div>
          <Action marker={8}>{guide.action}</Action>
        </>
      );
    case 'kitchen-ready':
      return (
        <>
          <Toolbar search="Buscar pedido pronto" filter="Todos os canais" markerStart={3} />
          <Panel title="Aguardando retirada" detail="A cozinha finalizou estes pedidos." marker={5}>
            <Empty>Pedidos finalizados aparecerão nesta área.</Empty>
          </Panel>
          <Action marker={6}>{guide.action}</Action>
        </>
      );
    default:
      return (
        <>
          <Toolbar search="Buscar no histórico" filter="Todos os períodos" markerStart={3} />
          <Panel title="Histórico do turno" detail="Pedidos finalizados e cancelados." marker={5}>
            <Rows />
          </Panel>
          <Action marker={6}>{guide.action}</Action>
        </>
      );
  }
}

function WaiterPreview({ guide }: EmployeeHelpPreviewProps) {
  switch (guide.preview) {
    case 'waiter-overview':
      return (
        <>
          <Metrics labels={['Pedidos prontos', 'Mesas ativas', 'Chamados']} markerStart={3} />
          <div className="mock-layout triple">
            {['Pedidos prontos', 'Mesas em atendimento', 'Chamados do salão'].map((item, index) => (
              <Panel title={item} detail="Nenhum item pendente." key={item} marker={6 + index}>
                <Empty>Sem dados exibidos.</Empty>
              </Panel>
            ))}
          </div>
          <Action marker={9}>{guide.action}</Action>
        </>
      );
    case 'waiter-tables':
      return (
        <>
          <Toolbar search="Buscar mesa" filter="Todos os status" markerStart={3} />
          <Panel title="Mesas e códigos" detail="Acesse o cardápio digital pela mesa correta.">
            <div className="mock-table-cards">
              <article data-marker={5}>
                <b>Mesa 00</b>
                <span className="table-state free">LIVRE</span>
                <small>0 clientes</small>
              </article>
              <article data-marker={6}>
                <b>Status</b>
                <span className="table-state occupied">OCUPADA</span>
                <small>Ver pedido</small>
              </article>
              <article data-marker={7}>
                <b>Código QR</b>
                <span className="table-state code">CÓDIGO</span>
                <small>Informe ao cliente</small>
              </article>
              <article data-marker={8}>
                <b>Ação</b>
                <span className="table-state action">GERAR</span>
                <small>Gerar novo código</small>
              </article>
            </div>
          </Panel>
          <Action marker={9}>{guide.action}</Action>
        </>
      );
    case 'waiter-calls':
      return (
        <>
          <Toolbar search="Buscar chamado ou mesa" markerStart={3} />
          <Panel
            title="Aguardando atendimento"
            detail="Ordenados pelo maior tempo de espera."
            marker={4}
          >
            <Empty>Os chamados aparecerão nesta lista.</Empty>
          </Panel>
          <Action marker={5}>{guide.action}</Action>
        </>
      );
    default:
      return (
        <>
          <Toolbar search="Buscar pedido pronto" filter="Todos os tipos" markerStart={3} />
          <Panel
            title="Prontos para entregar"
            detail="A cozinha controla todos os status."
            marker={5}
          >
            <Empty>Pedidos prontos para servir aparecerão aqui.</Empty>
          </Panel>
          <Action marker={6}>{guide.action}</Action>
        </>
      );
  }
}

function CourierPreview({ guide }: EmployeeHelpPreviewProps) {
  switch (guide.preview) {
    case 'courier-overview':
      return (
        <>
          <section className="mock-dark-hero">
            <div>
              <small>RESUMO DO TURNO</small>
              <strong>Olá, motoqueiro</strong>
              <span>Acompanhe entregas e ganhos em um só lugar.</span>
            </div>
            <div className="mock-mini-metrics">
              {['Para retirar', 'Em rota', 'Entregues'].map((item, index) => (
                <span key={item} data-marker={3 + index}>
                  <b>—</b>
                  {item}
                </span>
              ))}
            </div>
          </section>
          <Panel title="Resumo financeiro" detail="Seus ganhos do turno.">
            <div className="mock-finance">
              {['Hoje', 'Semana', 'Mês', 'A receber'].map((item, index) => (
                <span key={item} data-marker={6 + index}>
                  <small>{item}</small>
                  <strong>R$ —</strong>
                </span>
              ))}
            </div>
          </Panel>
          <Panel
            title="Pedidos aguardando você"
            detail="Próximas retiradas disponíveis."
            marker={10}
          >
            <Empty>Nenhum pedido aguardando retirada.</Empty>
          </Panel>
          <Action marker={11}>{guide.action}</Action>
        </>
      );
    case 'courier-route':
      return (
        <>
          <div className="mock-location" data-marker={3}>
            ◎ Localização ativa
          </div>
          <section className="mock-map" data-marker={4}>
            <span>Mapa da rota</span>
            <i>⌖</i>
            <small>Aguardando localização e entrega em rota.</small>
          </section>
          <Action marker={5}>{guide.action}</Action>
        </>
      );
    case 'courier-profile':
      return (
        <>
          <Panel title="Meu perfil" detail="Dados da sua conta de motoqueiro.">
            <FormGrid labels={['Nome', 'Telefone', 'E-mail', 'Disponibilidade']} markerStart={3} />
          </Panel>
          <Action marker={7}>{guide.action}</Action>
        </>
      );
    case 'courier-history':
      return (
        <>
          <Toolbar search="Buscar entrega concluída" filter="Todos os períodos" markerStart={3} />
          <Panel title="Histórico" detail="Entregas concluídas por você." marker={5}>
            <Rows />
          </Panel>
          <Action marker={6}>{guide.action}</Action>
        </>
      );
    case 'courier-delivery':
      return (
        <>
          <Toolbar search="Buscar pelo número do pedido" markerStart={3} />
          <Panel
            title="Entregas em andamento"
            detail="Pedidos atribuídos a você e em rota."
            marker={4}
          >
            <Empty>As entregas atribuídas a você aparecerão aqui.</Empty>
          </Panel>
          <Action marker={5}>{guide.action}</Action>
        </>
      );
    default:
      return (
        <>
          <Toolbar search="Buscar pedido para retirar" markerStart={3} />
          <Panel
            title="Prontos para retirada"
            detail="Assuma um pedido quando ele estiver com você."
            marker={4}
          >
            <Empty>Os pedidos disponíveis para retirada aparecerão aqui.</Empty>
          </Panel>
          <Action marker={5}>{guide.action}</Action>
        </>
      );
  }
}

export function EmployeeHelpPreview({ guide }: EmployeeHelpPreviewProps) {
  const callouts = employeeHelpCallouts[guide.preview];
  const rolePreview = guide.preview.startsWith('kitchen') ? (
    <KitchenPreview guide={guide} />
  ) : guide.preview.startsWith('waiter') ? (
    <WaiterPreview guide={guide} />
  ) : (
    <CourierPreview guide={guide} />
  );

  return (
    <div className="canvas">
      <div className="crumb">PAINEL / {guide.area.toUpperCase()}</div>
      <h4 data-marker={2}>{guide.area}</h4>
      <p>{guide.helper}</p>
      <div className="mock-body">{rolePreview}</div>
      <div className="mock-support" data-marker={callouts.length}>
        Se algo divergir, acione o administrador.
      </div>
    </div>
  );
}
