import { AlertTriangle, LogOut, RefreshCw } from 'lucide-react';
import { type CSSProperties, useState } from 'react';
import type {
  AttendantOrder,
  AttendantRestaurantBrand,
  AttendantView,
  AttendantWorkspaceSnapshot,
  AttendantWorkspaceState,
} from './types';
import {
  Shell,
  Sidebar,
  Brand,
  Nav,
  Profile,
  Main,
  Topbar,
  Content,
  ErrorBanner,
} from './operation-center/layout.styles';
import { AttendantMobileNavigation } from './AttendantMobileNavigation';
import { viewMeta, type OperationDestination } from './operation-center/navigation';
import { snapshotTime } from './operation-center/format';
import { Overview } from './operation-center/Overview';
import { OrderDrawer } from './operation-center/OrderDrawer';
import { Orders } from './operation-center/Orders';
import { CreateOrder } from './operation-center/CreateOrder';
import { Calls, Tables, Deliveries } from './operation-center/SalonViews';
import { Support } from './operation-center/Support';
import { EmptyState } from './operation-center/EmptyState';
import {
  OperationServicesContext,
  productionOperationServices,
  type OperationServices,
} from './operation-center/services';

type Props = {
  attendantId: number;
  attendantName: string;
  restaurantId: number;
  restaurant: AttendantRestaurantBrand;
  snapshot: AttendantWorkspaceSnapshot;
  workspaceState: AttendantWorkspaceState;
  onRefresh: () => void | Promise<void>;
  onLogout: () => void;
  services?: OperationServices;
};

export function AttendantOperationCenterV2({
  attendantId,
  attendantName,
  restaurantId,
  restaurant,
  snapshot,
  workspaceState,
  onRefresh,
  onLogout,
  services = productionOperationServices,
}: Props) {
  const [destination, setDestination] = useState<OperationDestination>({ view: 'overview' });
  const view = destination.view;
  const setView = (view: AttendantView) => setDestination({ view });
  const [selectedOrder, setSelectedOrder] = useState<AttendantOrder | null>(null);
  const meta = viewMeta[view];
  const initialError = Boolean(workspaceState.error && !workspaceState.lastUpdatedAt);
  const updating = workspaceState.loading || workspaceState.refreshing;
  const lastUpdate = workspaceState.lastUpdatedAt
    ? new Date(workspaceState.lastUpdatedAt).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;
  const initials =
    attendantName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'AT';
  const shellStyle = { '--brand': restaurant.primaryColor } as CSSProperties;

  return (
    <OperationServicesContext.Provider value={services}>
      <Shell style={shellStyle}>
        <Sidebar>
          <Brand>
            <span>{restaurant.monogram}</span>
            <div>
              <strong>{restaurant.name}</strong>
              <small>Central do atendente</small>
            </div>
          </Brand>
          <Nav aria-label="Navegação do atendente">
            {(Object.keys(viewMeta) as AttendantView[]).map((id) => {
              const Icon = viewMeta[id].icon;
              return (
                <button
                  type="button"
                  key={id}
                  className={view === id ? 'active' : ''}
                  aria-current={view === id ? 'page' : undefined}
                  onClick={() => setView(id)}
                >
                  <Icon />
                  <span>{viewMeta[id].label}</span>
                </button>
              );
            })}
          </Nav>
          <Profile>
            <span>{initials}</span>
            <div>
              <b>{attendantName}</b>
              <small>Atendente</small>
            </div>
            <button type="button" onClick={onLogout} aria-label="Sair">
              <LogOut />
            </button>
          </Profile>
        </Sidebar>
        <AttendantMobileNavigation
          view={view}
          name={attendantName}
          onGo={setView}
          onLogout={onLogout}
        />
        <Main>
          <Topbar>
            <div>
              <span className="eyebrow">Operação em tempo real</span>
              <h1>{meta.title}</h1>
              <p>{meta.subtitle}</p>
            </div>
            <div className="sync">
              <div className="sync-copy">
                <span
                  className={workspaceState.error ? 'offline' : updating ? 'syncing' : 'online'}
                >
                  {workspaceState.error
                    ? 'Atualização pendente'
                    : updating
                      ? 'Atualizando operação...'
                      : 'Operação atualizada'}
                </span>
                {lastUpdate && <small>Última atualização às {lastUpdate}</small>}
              </div>
              <button type="button" onClick={() => void onRefresh()} disabled={updating}>
                <RefreshCw /> {updating ? 'Atualizando...' : 'Atualizar'}
              </button>
            </div>
          </Topbar>
          {workspaceState.error && (
            <ErrorBanner role="alert">
              <AlertTriangle />
              <div>
                <b>
                  {initialError
                    ? 'Ainda não foi possível consultar a operação'
                    : 'Não conseguimos atualizar agora'}
                </b>
                <span>{workspaceState.error}</span>
              </div>
            </ErrorBanner>
          )}
          <Content>
            {workspaceState.loading ? (
              <EmptyState
                icon={RefreshCw}
                title="Carregando a operação..."
                text="Buscando pedidos, mesas e chamados."
              />
            ) : initialError && view !== 'create' && view !== 'support' ? (
              <EmptyState
                icon={AlertTriangle}
                title="Aguardando dados da operação"
                text="Use Atualizar para tentar novamente. Sem conexão, não é possível saber se há pedidos, mesas ou chamados pendentes."
              />
            ) : view === 'overview' ? (
              <Overview snapshot={snapshot} onGo={setDestination} onOpen={setSelectedOrder} />
            ) : destination.view === 'orders' ? (
              <Orders
                key={`orders:${destination.status ?? 'ALL'}:${destination.day ?? 'ALL'}`}
                initialStatus={destination.status}
                initialDay={destination.day}
                snapshot={snapshot}
                onOpen={setSelectedOrder}
              />
            ) : view === 'create' ? (
              <CreateOrder
                restaurantId={restaurantId}
                onCreated={() => {
                  void onRefresh();
                  setView('orders');
                }}
              />
            ) : view === 'support' ? (
              <Support />
            ) : view === 'deliveries' ? (
              <Deliveries snapshot={snapshot} onOpen={setSelectedOrder} />
            ) : destination.view === 'tables' ? (
              <Tables
                key={`tables:${destination.day ?? 'ALL'}`}
                initialDay={destination.day}
                snapshot={snapshot}
              />
            ) : destination.view === 'calls' ? (
              <Calls
                key={`calls:${destination.mode ?? 'ACTIVE'}:${destination.day ?? 'ALL'}`}
                referenceTime={snapshotTime(snapshot)}
                initialMode={destination.mode}
                initialDay={destination.day}
                calls={snapshot.calls}
                attendantId={attendantId}
                onChanged={() => void onRefresh()}
              />
            ) : null}
          </Content>
        </Main>
        {selectedOrder && (
          <OrderDrawer
            key={selectedOrder.orderId}
            orderId={selectedOrder.orderId}
            fallback={selectedOrder}
            onClose={() => setSelectedOrder(null)}
            onCompleted={() => void onRefresh()}
          />
        )}
      </Shell>
    </OperationServicesContext.Provider>
  );
}
