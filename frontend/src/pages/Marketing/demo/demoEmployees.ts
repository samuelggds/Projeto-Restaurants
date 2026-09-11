import type { Employee } from '../../admin/types';
import {
  DEMO_DEFAULT_PASSWORD,
  fingerprintDemoPassword,
  type DemoAccount,
  type DemoState,
} from './demoDomain';

export function syncDemoEmployees(
  state: DemoState,
  employees: Employee[],
  previous: Employee[],
  passwords: Record<string, string> = {},
): DemoState {
  const accounts: DemoAccount[] = employees.map((employee) => {
    const old = previous.find((item) => item.id === employee.id);
    const account = state.accounts.find(
      (item) => item.id === `demo-employee-${employee.id}` || item.email === old?.email,
    );
    return {
      id: account?.id ?? `demo-employee-${employee.id}`,
      name: employee.name,
      email: employee.email,
      role: {
        COOK: 'COZINHA' as const,
        WAITER: 'GARCOM' as const,
        ATTENDANT: 'ATENDENTE' as const,
        COURIER: 'MOTOQUEIRO' as const,
      }[employee.role],
      active: employee.active,
      passwordFingerprint: passwords[employee.id]
        ? fingerprintDemoPassword(passwords[employee.id])
        : (account?.passwordFingerprint ?? fingerprintDemoPassword(DEMO_DEFAULT_PASSWORD)),
      createdAt: account?.createdAt ?? new Date().toISOString(),
    };
  });
  return {
    ...state,
    accounts: [
      ...state.accounts.filter((item) => ['ADMIN', 'CLIENTE'].includes(item.role)),
      ...accounts,
    ],
  };
}
