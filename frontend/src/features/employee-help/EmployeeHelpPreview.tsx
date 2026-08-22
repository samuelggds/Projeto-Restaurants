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

function Metrics({
  labels,
  markerStart,
  values,
}: {
  labels: string[];
  markerStart: number;
  values?: string[];
}) {
  return (
    <div className="mock-metrics">
      {labels.map((label, index) => (
        <article className="mock-metric" key={label} data-marker={markerStart + index}>
          <span>{label}</span>
          <strong>{values?.[index] ?? '0'}</strong>
          <small>{values ? 'Molde ilustrativo' : 'Atualizado agora'}</small>
        </article>
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
          <div className="mock-queue-toolbar">
            <span className="mock-input" data-marker={3}>
              ⌕ Buscar pedido ou mesa
            </span>
            <div className="mock-channel-tabs" data-marker={4}>
              <span className="active">Mesa</span>
              <span>Retirada</span>
              <span>Delivery</span>
            </div>
            <span className="mock-select" data-marker={5}>
              Todos os status
            </span>
            <span className="mock-live" data-marker={6}>
              ● Atualização em tempo real
            </span>
          </div>
          <Metrics
            labels={['Pendentes', 'Preparando', 'Prontos', 'Tempo médio']}
            markerStart={7}
            values={['—', '—', '—', '— min']}
          />
          <div className="mock-layout triple mock-queue-columns">
            {['Pendente', 'Preparando', 'Pronto'].map((item, index) => (
              <Panel
                title={item}
                detail="Nenhum pedido neste status."
                key={item}
                marker={11 + index}
              >
                <Empty>Nenhum pedido neste status.</Empty>
              </Panel>
            ))}
          </div>
        </>
      );
    case 'kitchen-ready':
      return (
        <>
          <div className="mock-ready-toolbar">
            <div className="mock-channel-tabs" data-marker={3}>
              <span className="active">Mesa</span>
              <span>Retirada</span>
              <span>Delivery</span>
            </div>
            <span className="mock-live" data-marker={4}>
              ● Atualização em tempo real
            </span>
          </div>
          <Metrics labels={['Prontos', 'Maior espera']} markerStart={5} values={['—', '—:—']} />
          <section className="mock-ready-section">
            <header data-marker={7}>
              <div>
                <h5>Aguardando retirada</h5>
                <p>A cozinha finalizou estes pedidos; não é necessário alterar outro status.</p>
              </div>
              <i data-marker={9}>✓</i>
            </header>
            <div className="mock-ready-empty" data-marker={8}>
              <i>✓</i>
              <span>Nenhum pedido pronto neste canal.</span>
            </div>
          </section>
        </>
      );
    case 'kitchen-history':
      return (
        <>
          <div className="mock-history-toolbar">
            <div className="mock-channel-tabs" data-marker={3}>
              <span className="active">Mesa</span>
              <span>Retirada</span>
              <span>Delivery</span>
            </div>
            <span className="mock-input" data-marker={4}>
              ⌕ Buscar no histórico
            </span>
          </div>
          <Metrics
            labels={['Concluídos hoje', 'Cancelados', 'Tempo médio']}
            markerStart={5}
            values={['—', '—', '— min']}
          />
          <section className="mock-history-section">
            <header data-marker={8}>
              <div>
                <h5>Histórico do turno</h5>
                <p>Pedidos finalizados e cancelados.</p>
              </div>
              <i data-marker={11}>↶</i>
            </header>
            <div className="mock-history-table" data-marker={9}>
              <div className="mock-history-head">
                <span>Pedido</span>
                <span>Canal</span>
                <span>Horário</span>
                <span>Status</span>
                <span>Total</span>
              </div>
              <div className="mock-history-empty" data-marker={10}>
                <i>↶</i>
                <span>Nenhum pedido encontrado neste canal.</span>
              </div>
            </div>
          </section>
        </>
      );
    default:
      return null;
  }
}

function WaiterPreview({ guide }: EmployeeHelpPreviewProps) {
  switch (guide.preview) {
    case 'waiter-overview':
      return (
        <>
          <Metrics
            labels={['Prontos para entregar', 'Chamados aguardando', 'Mesas ocupadas']}
            markerStart={3}
            values={['—', '—', '—']}
          />
          <div className="mock-waiter-overview">
            <Panel
              title="Prontos para entregar"
              detail="O status é atualizado exclusivamente pela cozinha."
              marker={6}
            >
              <div className="mock-waiter-empty" data-marker={7}>
                <i>◷</i>
                <span>Nenhum pedido pronto.</span>
              </div>
            </Panel>
            <div className="mock-waiter-side">
              <Panel
                title="Chamados do salão"
                detail="Atenda primeiro o chamado mais antigo."
                marker={8}
              >
                <div className="mock-waiter-empty" data-marker={9}>
                  <i>♧</i>
                  <span>Nenhum chamado aguardando.</span>
                </div>
              </Panel>
              <Panel
                title="Códigos solicitados"
                detail="Informe o código após o cliente escanear o QR."
                marker={10}
              >
                <div className="mock-waiter-empty" data-marker={11}>
                  <i>⌘</i>
                  <span>Nenhum código solicitado.</span>
                </div>
              </Panel>
            </div>
          </div>
        </>
      );
    case 'waiter-deliveries':
      return (
        <>
          <div className="mock-deliveries-toolbar">
            <span className="mock-input" data-marker={3}>
              ⌕ Buscar número da mesa ou pedido
            </span>
            <span className="mock-select" data-marker={4}>
              Todas as mesas
            </span>
            <span className="mock-live" data-marker={5}>
              ● Atualização em tempo real
            </span>
          </div>
          <Metrics
            labels={['Prontos para entregar', 'Maior espera', 'Mesas ocupadas']}
            markerStart={6}
            values={['—', '—:—', '—']}
          />
          <Panel
            title="Prontos para entregar"
            detail="Somente leitura: a cozinha controla todos os status."
            marker={9}
          >
            <div className="mock-deliveries-empty" data-marker={10}>
              <i>◷</i>
              <span>Nenhum pedido pronto para os filtros selecionados.</span>
            </div>
          </Panel>
        </>
      );
    case 'waiter-tables':
      return (
        <>
          <div className="mock-tables-toolbar">
            <span className="mock-input" data-marker={3}>
              ⌕ Buscar número da mesa
            </span>
            <span className="mock-select" data-marker={4}>
              Todos os status
            </span>
            <span className="mock-print-action" data-marker={5}>
              ▣ Imprimir QR Codes
            </span>
          </div>
          <Metrics
            labels={['Mesas', 'Ocupadas', 'Livres', 'Aguardando código']}
            markerStart={6}
            values={['—', '—', '—', '—']}
          />
          <Panel
            title="Mesas e QR Codes"
            detail="Consulte mesas e códigos de acesso do salão."
            marker={10}
          >
            <div className="mock-tables-empty" data-marker={11}>
              <i>▦</i>
              <span>Nenhuma mesa encontrada para os filtros selecionados.</span>
            </div>
          </Panel>
        </>
      );
    case 'waiter-calls':
      return (
        <>
          <div className="mock-calls-toolbar">
            <span className="mock-input" data-marker={3}>
              ⌕ Buscar mesa
            </span>
            <span className="mock-select" data-marker={4}>
              Todos os status
            </span>
            <span className="mock-live" data-marker={5}>
              ● Atualização em tempo real
            </span>
          </div>
          <Metrics
            labels={['Aguardando', 'Em atendimento', 'Tempo médio', 'Atendidos hoje']}
            markerStart={6}
            values={['—', '—', '—:—', '—']}
          />
          <div className="mock-calls-panels">
            <Panel
              title="Aguardando atendimento"
              detail="Ordenados pelo maior tempo de espera."
              marker={10}
            >
              <div className="mock-calls-empty" data-marker={11}>
                <i>♧</i>
                <span>Nenhum chamado aguardando.</span>
              </div>
            </Panel>
            <Panel title="Em atendimento" detail="Chamados assumidos pelos garçons." marker={12}>
              <div className="mock-calls-empty" data-marker={13}>
                <i>✓</i>
                <span>Nenhum chamado em atendimento.</span>
              </div>
            </Panel>
          </div>
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
          <div className="mock-location courier-location" data-marker={3}>
            ◎ Ative a localização para o cliente acompanhar a entrega.
          </div>
          <section className="mock-dark-hero">
            <div>
              <small>RESUMO DO TURNO</small>
              <strong>Olá, motoqueiro</strong>
              <span>Acompanhe entregas e ganhos em um só lugar.</span>
            </div>
            <div className="mock-mini-metrics">
              {['Para retirar', 'Em rota', 'Entregues'].map((item, index) => (
                <span key={item} data-marker={4 + index}>
                  <b>—</b>
                  {item}
                </span>
              ))}
            </div>
          </section>
          <Panel title="Resumo financeiro" detail="Seus ganhos do turno.">
            <div className="mock-finance">
              {['Hoje', 'Semana', 'Mês', 'A receber'].map((item, index) => (
                <span key={item} data-marker={7 + index}>
                  <small>{item}</small>
                  <strong>R$ —</strong>
                </span>
              ))}
            </div>
          </Panel>
          <Panel
            title="Pedidos aguardando você"
            detail="Próximas retiradas disponíveis."
            marker={11}
          >
            <Empty>Nenhum pedido aguardando retirada.</Empty>
          </Panel>
          <Action marker={12}>{guide.action}</Action>
        </>
      );
    case 'courier-route':
      return (
        <>
          <section className="mock-route-notice" data-marker={3}>
            <i>◎</i>
            <span>
              <b>Localização necessária durante a rota</b>
              <small>Ative a localização para o cliente acompanhar a entrega.</small>
            </span>
            <button type="button" data-marker={4}>
              ➤ Ativar localização
            </button>
          </section>
          <div className="mock-route-empty" data-marker={5}>
            Nenhuma rota ativa no momento.
          </div>
        </>
      );
    case 'courier-profile':
      return (
        <>
          <section className="mock-profile-card">
            <header data-marker={3}>
              <i>◯</i>
              <span>
                <b>Motoqueiro</b>
                <small>Motoqueiro</small>
              </span>
              <button type="button" data-marker={4}>
                ✎ Editar
              </button>
            </header>
            <div className="mock-profile-fields">
              <span data-marker={5}>
                <small>✉ E-MAIL</small>
                <b>contato@exemplo.com</b>
              </span>
              <span data-marker={6}>
                <small>⌕ TELEFONE</small>
                <b>Não informado</b>
              </span>
              <span data-marker={7}>
                <small>▣ CPF</small>
                <b>Não informado</b>
              </span>
              <span data-marker={8}>
                <small>♙ CARGO</small>
                <b>Motoqueiro</b>
              </span>
            </div>
          </section>
        </>
      );
    case 'courier-history':
      return (
        <>
          <div className="mock-location courier-location" data-marker={3}>
            ◎ Ative a localização para o cliente acompanhar a entrega.
          </div>
          <div className="mock-toolbar courier-pickup-toolbar">
            <span data-marker={4}>⌕ Buscar pelo número do pedido</span>
            <button type="button" data-marker={5}>
              ↻ Atualizar
            </button>
          </div>
          <div className="mock-delivery-cards history-cards">
            {[1, 2, 3, 4].map((card) => (
              <article
                className="mock-pickup-card"
                key={card}
                data-marker={card === 1 ? 6 : undefined}
              >
                <header>
                  <strong>Pedido #—</strong>
                  <small data-marker={card === 1 ? 7 : undefined}>Entregue</small>
                  <b>R$ —</b>
                </header>
                <div className="pickup-chips" data-marker={card === 1 ? 8 : undefined}>
                  <span>♙ Cliente</span>
                  <span>▣ Pago</span>
                </div>
                <p data-marker={card === 1 ? 9 : undefined}>⌖ Endereço ilustrativo da entrega</p>
              </article>
            ))}
          </div>
        </>
      );
    case 'courier-delivery':
      return (
        <>
          <div className="mock-location courier-location" data-marker={3}>
            ◎ Ative a localização para o cliente acompanhar a entrega.
          </div>
          <div className="mock-toolbar courier-pickup-toolbar">
            <span data-marker={4}>⌕ Buscar pelo número do pedido</span>
            <button type="button" data-marker={5}>
              ↻ Atualizar
            </button>
          </div>
          <div className="mock-delivery-cards">
            {[1, 2, 3].map((card) => (
              <article className="mock-pickup-card" key={card}>
                <header data-marker={card === 1 ? 6 : undefined}>
                  <strong>Pedido #—</strong>
                  <small>Em entrega</small>
                  <b>R$ —</b>
                </header>
                <div className="pickup-chips" data-marker={card === 1 ? 7 : undefined}>
                  <span>♙ Cliente</span>
                  <span>▣ Pagamento</span>
                </div>
                <p data-marker={card === 1 ? 8 : undefined}>⌖ Endereço ilustrativo do cliente</p>
                <em data-marker={card === 1 ? 9 : undefined}>
                  Peça os 4 últimos dígitos do celular para concluir a entrega.
                </em>
                <input
                  aria-label="Quatro últimos dígitos ilustrativos"
                  placeholder="4 últimos dígitos do celular"
                />
                <button type="button" data-marker={card === 1 ? 10 : undefined}>
                  ✓ Marcar como Entregue
                </button>
              </article>
            ))}
          </div>
        </>
      );
    case 'courier-pickup':
      return (
        <>
          <div className="mock-location courier-location" data-marker={3}>
            ◎ Ative a localização para o cliente acompanhar a entrega.
          </div>
          <div className="mock-toolbar courier-pickup-toolbar">
            <span data-marker={4}>⌕ Buscar pelo número do pedido</span>
            <button type="button" data-marker={5}>
              ↻ Atualizar
            </button>
          </div>
          <article className="mock-pickup-card">
            <header data-marker={6}>
              <strong>Pedido #—</strong>
              <small>Pronto para retirada</small>
              <b>R$ —</b>
            </header>
            <div className="pickup-chips">
              <span data-marker={7}>♙ Cliente</span>
              <span data-marker={8}>▣ Pix · Não pago</span>
            </div>
            <p data-marker={9}>⌖ Endereço ilustrativo do cliente</p>
            <em data-marker={10}>Confirme a retirada somente quando o pedido estiver com você.</em>
            <button type="button" data-marker={11}>
              Retirar e iniciar entrega
            </button>
          </article>
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
      <span
        className="mock-help-context"
        data-marker={callouts.length}
        title="Acione o administrador quando necessário"
      >
        ?
      </span>
      <h4 data-marker={2}>{guide.area}</h4>
      <p>{guide.helper}</p>
      <div className="mock-body">{rolePreview}</div>
    </div>
  );
}
