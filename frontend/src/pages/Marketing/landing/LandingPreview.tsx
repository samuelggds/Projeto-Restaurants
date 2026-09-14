import { useRef, useState } from 'react';
import {
  BarChart3,
  Bike,
  Check,
  ChefHat,
  ChevronRight,
  CircleDot,
  Clock3,
  ShoppingBag,
  UtensilsCrossed,
} from 'lucide-react';
import * as P from './LandingPreview.styles';

const workspaces = [
  {
    id: 'gestao',
    label: 'Gestão',
    icon: BarChart3,
    description: 'Enxergue o movimento e acompanhe sua operação.',
    title: 'Seu restaurante, em um olhar',
    metrics: [
      ['Pedidos hoje', '24'],
      ['Em preparo', '04'],
      ['Concluídos', '18'],
    ],
    columns: ['Pedido', 'Canal', 'Situação'],
    rows: [
      ['#1058 · Marina', 'Delivery', 'Em preparo'],
      ['#1057 · Mesa 08', 'Salão', 'Pronto'],
      ['#1056 · Carlos', 'Retirada', 'Recebido'],
    ],
    footer: 'Cada pedido com seu lugar. Cada etapa com seu status.',
  },
  {
    id: 'cozinha',
    label: 'Cozinha',
    icon: ChefHat,
    description: 'Uma fila clara, do recebimento ao pedido pronto.',
    title: 'O próximo preparo está aqui',
    metrics: [
      ['Na fila', '03'],
      ['Preparando', '04'],
      ['Prontos', '02'],
    ],
    columns: ['Pedido', 'Destino', 'Situação'],
    rows: [
      ['#1058 · Pizza da casa', 'Delivery', 'Em preparo'],
      ['#1057 · 2 burgers', 'Mesa 08', 'Pronto'],
      ['#1056 · Combo da casa', 'Retirada', 'Recebido'],
    ],
    footer: 'Observações e itens acompanham a comanda.',
  },
  {
    id: 'salao',
    label: 'Salão',
    icon: UtensilsCrossed,
    description: 'Da leitura do QR Code ao atendimento na mesa.',
    title: 'Mais atenção a quem está à mesa',
    metrics: [
      ['Mesas abertas', '06'],
      ['Para entregar', '02'],
      ['Chamados', '01'],
    ],
    columns: ['Mesa', 'Atendimento', 'Situação'],
    rows: [
      ['Mesa 08', '2 burgers', 'Pronto'],
      ['Mesa 03', 'Chamar garçom', 'Chamado'],
      ['Mesa 12', 'Conta da mesa', 'Em aberto'],
    ],
    footer: 'O garçom acompanha as mesas e os pedidos do salão.',
  },
  {
    id: 'delivery',
    label: 'Delivery',
    icon: Bike,
    description: 'Retirada e entrega com a informação na mão.',
    title: 'Do balcão até o cliente',
    metrics: [
      ['Para retirar', '02'],
      ['Em entrega', '03'],
      ['Entregues', '12'],
    ],
    columns: ['Pedido', 'Cliente', 'Situação'],
    rows: [
      ['#1058', 'Marina', 'Para retirar'],
      ['#1054', 'Pedro', 'Em entrega'],
      ['#1051', 'Ana', 'Entregue'],
    ],
    footer: 'O motoqueiro recebe os pedidos de delivery.',
  },
] as const;

export function LandingPreview() {
  const [selected, setSelected] = useState(0);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const current = workspaces[selected];
  const Icon = current.icon;
  return (
    <P.Showcase>
      <div className="showcase-copy">
        <span className="eyebrow">CADA PESSOA, NO SEU LUGAR</span>
        <h2>
          Uma equipe conectada.
          <br />
          <em>Um dia mais leve.</em>
        </h2>
        <p>Informação no lugar certo, para cada pessoa saber qual é o próximo passo.</p>
        <P.Tabs
          role="tablist"
          aria-label="Conheça as áreas da GastroNexa"
          aria-orientation="vertical"
        >
          {workspaces.map((workspace, index) => {
            const TabIcon = workspace.icon;
            return (
              <button
                key={workspace.id}
                ref={(element) => {
                  tabs.current[index] = element;
                }}
                id={`tab-${workspace.id}`}
                role="tab"
                aria-label={workspace.label}
                type="button"
                aria-selected={selected === index}
                aria-controls="workspace-preview"
                tabIndex={selected === index ? 0 : -1}
                onClick={() => setSelected(index)}
                onKeyDown={(event) => {
                  const next =
                    event.key === 'ArrowDown'
                      ? (index + 1) % workspaces.length
                      : event.key === 'ArrowUp'
                        ? (index + workspaces.length - 1) % workspaces.length
                        : event.key === 'Home'
                          ? 0
                          : event.key === 'End'
                            ? workspaces.length - 1
                            : null;
                  if (next === null) return;
                  event.preventDefault();
                  setSelected(next);
                  tabs.current[next]?.focus();
                }}
              >
                <span className="tab-icon">
                  <TabIcon size={20} />
                </span>
                <span>
                  <b>{workspace.label}</b>
                  <small>{workspace.description}</small>
                </span>
                <ChevronRight size={17} />
              </button>
            );
          })}
        </P.Tabs>
      </div>
      <P.PreviewPanel
        id="workspace-preview"
        role="tabpanel"
        aria-labelledby={`tab-${current.id}`}
        tabIndex={0}
      >
        <div className="window-bar">
          <span className="dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>GastroNexa · {current.label}</span>
          <span className="sample">PRÉVIA</span>
        </div>
        <div className="window-content">
          <div className="window-heading">
            <span className="workspace-icon">
              <Icon size={22} />
            </span>
            <div>
              <small>GASTRONEXA BURGER</small>
              <h3>{current.title}</h3>
            </div>
            <span className="live-dot" aria-hidden="true" />
          </div>
          <div className="metrics">
            {current.metrics.map(([label, value]) => (
              <div key={label}>
                <small>{label}</small>
                <b>{value}</b>
              </div>
            ))}
          </div>
          <div className="orders-title">
            <h4>{selected === 2 ? 'Atendimento do salão' : 'Acompanhe os pedidos'}</h4>
            <span>
              <Clock3 size={12} /> Agora
            </span>
          </div>
          <div
            className="order-table"
            role="table"
            aria-label={`Exemplo de ${current.label.toLowerCase()}`}
          >
            <div className="table-head" role="row">
              {current.columns.map((column) => (
                <span role="columnheader" key={column}>
                  {column}
                </span>
              ))}
            </div>
            {current.rows.map(([order, channel, status]) => (
              <div role="row" key={order}>
                <b role="cell">{order}</b>
                <span role="cell">{channel}</span>
                <span role="cell">
                  <i
                    className={
                      ['Pronto', 'Entregue'].includes(status)
                        ? 'ready'
                        : ['Em preparo', 'Em entrega'].includes(status)
                          ? 'preparing'
                          : ''
                    }
                  >
                    {status}
                  </i>
                </span>
              </div>
            ))}
          </div>
          <div className="window-note">
            <Check size={15} />
            <span>{current.footer}</span>
          </div>
        </div>
        <P.Flow aria-label="Etapas de um pedido">
          <span>
            <ShoppingBag size={17} />
            Pedido recebido
          </span>
          <ChevronRight size={14} />
          <span>
            <ChefHat size={17} />
            Em preparo
          </span>
          <ChevronRight size={14} />
          <span>
            <CircleDot size={17} />
            Pronto para seguir
          </span>
        </P.Flow>
        <p className="preview-caption">
          Prévia ilustrativa com dados fictícios. Explore as telas na demonstração.
        </p>
      </P.PreviewPanel>
    </P.Showcase>
  );
}
