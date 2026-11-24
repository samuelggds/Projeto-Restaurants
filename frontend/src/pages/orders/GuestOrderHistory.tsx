import { Headphones, MapPin, Search, ShoppingBag } from 'lucide-react';
import {
  Empty,
  Main,
  MobileHeader,
  OrderCard,
  OrderStack,
  SearchBox,
  TitleBlock,
} from './GuestOrderHistory.styles';

import type { GuestOrderCard } from './guestOrderCard';

export function GuestOrderHistory({
  orders,
  restaurantName,
  search,
  onSearch,
  onTrack,
  onHelp,
  loading = false,
  description = 'Acompanhe seus pedidos recentes feitos como visitante',
  searchPlaceholder = 'Buscar por número do pedido ou telefone...',
}: {
  orders: GuestOrderCard[];
  restaurantName: string;
  search: string;
  onSearch: (value: string) => void;
  onTrack: (id: number) => void;
  onHelp?: (id: number) => void;
  loading?: boolean;
  description?: string;
  searchPlaceholder?: string;
}) {
  return (
    <Main>
      <TitleBlock>
        <div>
          <h1 className="desktop-title">Seus Pedidos Recentes</h1>
          <h1 className="mobile-title">Acompanhar Pedido</h1>
          <p>{description}</p>
        </div>
        <SearchBox>
          <Search aria-hidden="true" />
          <input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label="Buscar pedido"
          />
        </SearchBox>
      </TitleBlock>

      <OrderStack>
        {loading ? (
          <Empty>Carregando seus pedidos...</Empty>
        ) : orders.length ? (
          orders.map((order) => {
            const { id, current, image } = order;
            return (
              <OrderCard key={id}>
                <div className="order-head">
                  <div className="restaurant-info">
                    <span className="thumb">
                      {image ? <img src={image} alt="" /> : restaurantName.slice(0, 1)}
                    </span>
                    <span>
                      <b>{restaurantName}</b>
                      <small>
                        Pedido #{id} · {order.date}
                      </small>
                    </span>
                  </div>
                  <span className={'status ' + order.statusClass}>{order.statusLabel}</span>
                </div>

                <div className="divider" />

                <div className="order-body">
                  <p>{order.summary || 'Pedido sem itens disponíveis para exibição.'}</p>
                  <strong>{order.total}</strong>
                </div>

                {order.steps.length > 0 ? (
                  <div className="progress">
                    <div className="line">
                      {order.steps.map((_, index) => (
                        <span className="segment" key={index}>
                          <i className={index <= current ? 'done' : ''} />
                          {index < order.steps.length - 1 ? (
                            <em className={index < current ? 'done' : ''} />
                          ) : null}
                        </span>
                      ))}
                    </div>
                    <div className="labels">
                      {order.steps.map((label, index) => (
                        <span key={label} className={index === current ? 'current' : ''}>
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {order.action ? (
                  <button className="track" type="button" onClick={() => onTrack(id)}>
                    <MapPin aria-hidden="true" />
                    {order.action}
                  </button>
                ) : null}

                {onHelp && (
                  <button className="help" type="button" onClick={() => onHelp(id)}>
                    <Headphones aria-hidden="true" />
                    Precisa de ajuda?
                  </button>
                )}
              </OrderCard>
            );
          })
        ) : (
          <Empty>
            <ShoppingBag />
            <strong>Nenhum pedido encontrado</strong>
            <span>Os pedidos feitos como visitante neste navegador aparecerão aqui.</span>
          </Empty>
        )}
      </OrderStack>
    </Main>
  );
}

export function GuestOrderMobileHeader({
  restaurantName,
  restaurantLogo,
  onHome,
  onSearch,
}: {
  restaurantName: string;
  restaurantLogo?: string;
  onHome: () => void;
  onSearch?: () => void;
}) {
  return (
    <MobileHeader>
      <button className="brand" type="button" onClick={onHome}>
        <span className="logo">
          {restaurantLogo ? <img src={restaurantLogo} alt="" /> : restaurantName.slice(0, 1)}
        </span>
        <span>
          <b>{restaurantName}</b>
          <small>Pedidos recentes</small>
        </span>
      </button>
      {onSearch && (
        <button className="search" type="button" aria-label="Buscar no cardápio" onClick={onSearch}>
          <Search aria-hidden="true" />
        </button>
      )}
    </MobileHeader>
  );
}
