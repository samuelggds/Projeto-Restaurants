import { describe, expect, it } from 'vitest';
import { mapEmployeeRoleToApi } from './Admin';

describe('mapEmployeeRoleToApi', () => {
  it.each([
    ['COOK', { role: 'FUNCIONARIO', subRole: 'COZINHA' }],
    ['WAITER', { role: 'FUNCIONARIO', subRole: 'GARCOM' }],
    ['ATTENDANT', { role: 'FUNCIONARIO', subRole: 'ATENDENTE' }],
    ['COURIER', { role: 'MOTOQUEIRO', subRole: null }],
  ] as const)('mapeia %s para a identidade persistida correta', (role, expected) => {
    expect(mapEmployeeRoleToApi(role)).toEqual(expected);
  });
});
