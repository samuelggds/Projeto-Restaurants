import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/authContext';
import ordersService from '../../Services/ordersService';
import restaurantSettingsService from '../../Services/restaurantSettingsService';
import tablesService from '../../Services/tablesService';
import { WaiterModule } from './WaiterModule';
import type { EmployeeWorkspaceData, RestaurantBrand, RestaurantTable, TableStatus } from './types';
import { mapOperationalOrders, mapRestaurantBrand } from '../operations/orderAdapter';

const POLL_MS = 30_000;

function mapTables(raw: unknown[]): RestaurantTable[] {
  return (raw as Record<string, unknown>[])
    .filter((t) => t.active !== false)
    .map((t) => {
      const sessions = (t.tableSessions as Record<string, unknown>[] | undefined) ?? [];
      const openSession = sessions.find((s) => s.status === 'OPEN');
      const status: TableStatus = openSession ? 'OCCUPIED' : 'FREE';
      return {
        id: String(t.id),
        number: Number(t.number || 0),
        status,
        guests: 0,
        total: 0,
      };
    });
}

export default function WaiterPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<EmployeeWorkspaceData>({
    orders: [],
    tables: [],
    calls: [],
  });
  const [restaurant, setRestaurant] = useState<RestaurantBrand>({
    restaurantName: '',
    monogram: 'R',
    primaryColor: '#d64d08',
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restaurantId = Number((user as Record<string, unknown>)?.restaurantId || 0) || null;

  useEffect(() => {
    if (!restaurantId) return;
    restaurantSettingsService
      .getPublicSettings(restaurantId)
      .then((s: Record<string, unknown>) => {
        setRestaurant(mapRestaurantBrand(s));
      })
      .catch(() => {});
  }, [restaurantId]);

  useEffect(() => {
    const load = async () => {
      try {
        const [rawOrders, rawTables] = await Promise.all([
          ordersService.listRestaurantOrders(),
          tablesService.listTables(),
        ]);
        setData((prev) => ({
          ...prev,
          orders: mapOperationalOrders(Array.isArray(rawOrders) ? rawOrders : []),
          tables: mapTables(Array.isArray(rawTables) ? rawTables : []),
        }));
      } catch {
        /* silent */
      }
    };
    load();
    intervalRef.current = setInterval(load, POLL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [restaurantId]);

  const u = user as Record<string, unknown>;
  const employee = {
    id: String(u?.id || ''),
    name: String(u?.name || 'Garçom'),
    email: String(u?.email || ''),
    role: 'WAITER' as const,
    shift: new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };

  return (
    <WaiterModule
      employee={employee}
      restaurant={restaurant}
      data={data}
      onGenerateAccessCode={async (tableId) => {
        const result = await tablesService.openTableSession(tableId);
        const pin = String(result?.pin || '').trim();

        if (!/^\d{4}$/.test(pin)) {
          throw new Error('Código de acesso inválido retornado pelo servidor.');
        }

        return pin;
      }}
      onLogout={() => {
        logout();
        navigate('/login');
      }}
    />
  );
}
