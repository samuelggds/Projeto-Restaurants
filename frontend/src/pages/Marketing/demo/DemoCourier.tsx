import { lazy, Suspense, useState } from 'react';
const DeliveryMap = lazy(() => import('../../Courier/components/DeliveryMap'));
const ProfilePanel = lazy(() => import('../../Courier/components/ProfilePanel'));
import { Bike, CheckCircle2, PackageCheck } from 'lucide-react';
import { CourierNavigation } from '../../Courier/CourierNavigation';
import OrderCard from '../../Courier/components/OrderCard';
import { CourierPickupQueue } from '../../Courier/components/CourierPickupQueue';
import { CourierSyncControl } from '../../Courier/components/CourierSyncControl';
import { CourierLocationStatus } from '../../Courier/components/CourierLocationStatus';
import { EmployeeHelpCenter } from '../../../features/employee-help/EmployeeHelpCenter';
import * as S from '../../Courier/styles';
import { COURIER_VIEW_TITLES, type CourierView } from '../../Courier/courierViewMeta';
import { useDemoHomeData } from './useDemoHomeData';
import { demoCourierOrders } from './demoCourierAdapter';
import { addDemoSupportMessage } from './demoSupport';
import { toggleDemoOrderPaid, updateDemoOrderStatus, type DemoState } from './demoDomain';

export function DemoCourier({
  state,
  onState,
  onLogout,
  initialView = 'overview',
}: {
  initialView?: CourierView;
  state: DemoState;
  onState: (state: DemoState) => void;
  onLogout: () => void;
}) {
  const data = useDemoHomeData();
  const [view, setView] = useState<CourierView>(initialView);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 820);
  const [profile, setProfile] = useState(
    state.courierProfile ?? {
      name: 'Motoqueiro Demo',
      email: 'motoqueiro@demo.gastronexa.com.br',
      phone: '',
      role: 'MOTOQUEIRO',
    },
  );
  const [routeStep, setRouteStep] = useState(0);
  const path = [
    { latitude: -23.5505, longitude: -46.6333 },
    { latitude: -23.549, longitude: -46.6333 },
    { latitude: -23.549, longitude: -46.6305 },
    { latitude: -23.548, longitude: -46.6305 },
  ];
  const [search, setSearch] = useState('');
  const orders = demoCourierOrders(state);
  const ready = orders.filter((order) => order.status === 'PRONTO');
  const route = orders.filter((order) => order.status === 'SAIU_PARA_ENTREGA');
  const delivered = orders.filter((order) => order.status === 'ENTREGUE');
  const visible = (view === 'ready' ? ready : view === 'route' ? route : delivered).filter(
    (order) => `${order.id} ${order.customerName}`.toLowerCase().includes(search.toLowerCase()),
  );
  const go = (next: CourierView) => {
    setSearch('');
    setView(next);
  };
  const title = COURIER_VIEW_TITLES[view];
  return (
    <S.CourierShell $primary={data.brand.primaryColor} $sidebarOpen={sidebarOpen}>
      <CourierNavigation
        view={view}
        restaurantName={data.brand.name}
        userName={profile.name}
        readyCount={ready.length}
        routeCount={route.length}
        deliveredCount={delivered.length}
        sidebarOpen={sidebarOpen}
        onSidebarOpen={() => setSidebarOpen(true)}
        onSidebarClose={() => setSidebarOpen(false)}
        onGo={go}
        onLogout={onLogout}
        chatNotificationsEnabled={false}
      />
      <S.CourierMain>
        <S.CourierTop>
          <div>
            <h1>{title[0]}</h1>
            <p>{title[1]}</p>
          </div>
          {view !== 'help' && view !== 'profile' && (
            <CourierLocationStatus
              connected
              label="Localização demonstrativa"
              message="Trajeto fictício"
              hint="Simulação: seu GPS não será acessado."
            />
          )}
          <CourierSyncControl
            lastUpdatedAt={new Date()}
            loading={false}
            failed={false}
            connected
            onRefresh={() => undefined}
          />
        </S.CourierTop>
        <S.CourierContent>
          {view === 'overview' && route[0] && (
            <S.ActiveDeliveryCard aria-label="Entrega em andamento">
              <div>
                <small>
                  <Bike /> EM ENTREGA
                </small>
                <h2>Pedido #{route[0].id}</h2>
                <p>{route[0].customerName}</p>
                <strong>Rua Exemplo, 100 · Centro</strong>
              </div>
              <S.ActiveDeliveryActions>
                <button type="button" onClick={() => go('route')}>
                  Continuar entrega #{route[0].id}
                </button>
              </S.ActiveDeliveryActions>
            </S.ActiveDeliveryCard>
          )}
          {view === 'overview' && (
            <>
              <S.OverviewHero>
                <div>
                  <small>RESUMO DO TURNO</small>
                  <h2>Olá, Motoqueiro</h2>
                  <p>Acompanhe entregas e ganhos em um só lugar.</p>
                </div>
                <S.OverviewCounters>
                  {(
                    [
                      ['ready', ready.length, 'Para retirar', PackageCheck],
                      ['route', route.length, 'Em rota', Bike],
                      ['history', delivered.length, 'Entregues', CheckCircle2],
                    ] as const
                  ).map(([next, count, label, Icon]) => (
                    <button type="button" key={next} onClick={() => go(next)}>
                      <Icon />
                      <b>{count}</b>
                      <small>{label}</small>
                    </button>
                  ))}
                </S.OverviewCounters>
              </S.OverviewHero>
              <S.EarningsPanel>
                <S.EarningsHeading>
                  <div>
                    <h2>Ganhos do turno</h2>
                  </div>
                  <strong>
                    {(delivered.length * 5).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </strong>
                </S.EarningsHeading>
                <p>R$ 5,00 por entrega concluída neste cenário.</p>
              </S.EarningsPanel>
              <CourierPickupQueue
                ready={ready}
                loading={false}
                loadError=""
                onOpenOrder={(order) => {
                  setView('ready');
                  setSearch(String(order.id));
                }}
              />
            </>
          )}
          {['ready', 'route', 'history'].includes(view) && (
            <>
              <label>
                Buscar pedido
                <input
                  aria-label="Buscar pedido"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Número ou cliente"
                  style={{
                    display: 'block',
                    minHeight: 44,
                    padding: 12,
                    width: '100%',
                    marginTop: 8,
                  }}
                />
              </label>
              <S.OrdersList>
                {visible.map((order) => (
                  <div key={order.id}>
                    {order.status === 'SAIU_PARA_ENTREGA' && (
                      <p>
                        Código de entrega fictício: <b>1234</b>
                        {!order.paid && (
                          <>
                            {' '}
                            ·{' '}
                            <button
                              type="button"
                              onClick={() => onState(toggleDemoOrderPaid(state, order.id))}
                            >
                              Simular recebimento em dinheiro
                            </button>
                          </>
                        )}
                      </p>
                    )}
                    <OrderCard
                      order={order}
                      customerContactEnabled={false}
                      loadDeliveryPayment={async () => null}
                      digitalPaymentMethods={new Set(['PIX', 'CARTAO'])}
                      paymentLabel={{ PIX: 'Pix', CARTAO: 'Cartão', DINHEIRO: 'Dinheiro' }}
                      statusLabel={{
                        PRONTO: { label: 'Pronto para retirada', color: '#c18119' },
                        SAIU_PARA_ENTREGA: { label: 'Em entrega', color: '#2563eb' },
                        ENTREGUE: { label: 'Entregue', color: '#16a34a' },
                      }}
                      onClaimDelivery={async (id) => {
                        const current = state.orders.find((item) => item.id === id);
                        if (
                          !current ||
                          current.channel !== 'DELIVERY' ||
                          current.status !== 'PRONTO'
                        )
                          throw new Error('Pedido indisponível para entrega.');
                        onState(updateDemoOrderStatus(state, id, 'SAIU_PARA_ENTREGA'));
                        setView('route');
                      }}
                      onMarkDelivered={async (id, code) => {
                        const current = state.orders.find((item) => item.id === id);
                        if (
                          !current ||
                          current.channel !== 'DELIVERY' ||
                          current.status !== 'SAIU_PARA_ENTREGA' ||
                          !current.paid ||
                          code !== '1234'
                        )
                          throw new Error('Confirme o pagamento e use o código fictício 1234.');
                        onState(updateDemoOrderStatus(state, id, 'ENTREGUE'));
                      }}
                    />
                  </div>
                ))}
              </S.OrdersList>
              {visible.length === 0 && (
                <S.EmptyState>
                  <PackageCheck />
                  <p>Nenhum pedido nesta etapa.</p>
                </S.EmptyState>
              )}
            </>
          )}
          {view === 'help' && (
            <EmployeeHelpCenter
              role="courier"
              notificationsEnabled={false}
              onReport={async (payload) => onState(addDemoSupportMessage(state, payload))}
            />
          )}
          {view === 'profile' && (
            <Suspense fallback={<p>Carregando perfil...</p>}>
              <ProfilePanel
                user={profile}
                onUpdated={(next) => {
                  const updated = { ...profile, ...next };
                  setProfile(updated);
                  onState({ ...state, courierProfile: updated });
                }}
                saveProfile={async (next) => next}
              />
            </Suspense>
          )}
          {view === 'map' && (
            <S.RouteSection>
              <h2>Trajeto demonstrativo</h2>
              {route.length ? (
                <>
                  <p>Rua Exemplo, 100 · percurso fictício, sem GPS.</p>
                  <Suspense fallback={<p>Carregando trajeto...</p>}>
                    <DeliveryMap
                      tilesEnabled={false}
                      points={path.slice(0, routeStep + 1)}
                      routePath={path}
                      destination={{ ...path[3], label: 'Endereço fictício' }}
                      label={profile.name}
                      statusMessage="Simulação de entrega"
                      statusDetail="Movimente o marcador para experimentar o acompanhamento."
                    />
                  </Suspense>
                  <button
                    type="button"
                    onClick={() => setRouteStep((step) => (step + 1) % path.length)}
                    style={{ minHeight: 44 }}
                  >
                    Avançar no trajeto fictício
                  </button>
                </>
              ) : (
                <S.EmptyState>
                  <Bike />
                  <p>Retire um pedido para iniciar a rota.</p>
                </S.EmptyState>
              )}
            </S.RouteSection>
          )}
        </S.CourierContent>
      </S.CourierMain>
    </S.CourierShell>
  );
}
