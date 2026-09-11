import axios from 'axios';
import { createDemoAdminApi } from './demoAdminApi';
import { readDemoAdminData, DEMO_ADMIN_STORAGE_KEY } from './demoAdminData';
import type { DemoState } from './demoDomain';

export async function reprintDemoOrder(state: DemoState, id: string) {
  if (!state.orders.some((order) => String(order.id) === id))
    throw new Error('Pedido fictício não encontrado.');
  const data = readDemoAdminData();
  const client = axios.create({
    adapter: createDemoAdminApi(
      () => state,
      () => undefined,
      data.runtime,
      (runtime) => {
        localStorage.setItem(DEMO_ADMIN_STORAGE_KEY, JSON.stringify({ ...data, runtime }));
        window.dispatchEvent(new Event('demo-admin-data'));
      },
    ),
  });
  await client.post(`/kitchen-printing/orders/${id}/reprint`);
}
