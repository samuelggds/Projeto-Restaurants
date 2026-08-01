import type { AdminSettings, Employee } from './types'

export const adminMockSettings: AdminSettings = {
  restaurantName: 'Sabor & Casa',
  primaryColor: '#d64d08',
  description: 'Cozinha autoral que celebra ingredientes frescos, técnicas contemporâneas e o aconchego de verdade. Uma experiência acolhedora do almoço ao jantar.',
  whatsapp: '(85) 99999-9999',
  instagram: '@saborecasa',
  facebook: 'Sabor & Casa',
  minimumOrder: 25,
  deliveryTime: 40,
  tableOrderingEnabled: true,
}

export const adminMockEmployees: Employee[] = [
  { id: '1', name: 'Marcos Lima', email: 'marcos@restaurante.com', role: 'COOK', active: true, permissions: { viewOrders: true, updateOrderStatus: true, manageQrTables: false } },
  { id: '2', name: 'Júlia Costa', email: 'julia@restaurante.com', role: 'WAITER', active: true, permissions: { viewOrders: true, updateOrderStatus: true, manageQrTables: true } },
  { id: '3', name: 'Rafael Alves', email: 'rafael@restaurante.com', role: 'ATTENDANT', active: true, permissions: { viewOrders: true, updateOrderStatus: true, manageQrTables: false } },
]
