import { MoreVertical, Plus, UserRoundCheck, UserRoundX } from 'lucide-react';
import * as S from '../Admin.styles';
import type { Employee, EmployeeRole } from '../types';

const roleLabel: Record<EmployeeRole, string> = {
  COOK: 'Cozinheiro',
  WAITER: 'Garçom',
  ATTENDANT: 'Atendente',
};

type EmployeeListProps = {
  employees: Employee[];
  onNew: () => void;
  onEdit: (employee: Employee) => void;
  onDeactivate: (employee: Employee) => Promise<void>;
  onReactivate: (employee: Employee) => Promise<void>;
};

export function EmployeeList({
  employees,
  onNew,
  onEdit,
  onDeactivate,
  onReactivate,
}: EmployeeListProps) {
  return (
    <S.Card>
      <S.EmployeeHeader>
        <div>
          <h2>Funcionários cadastrados</h2>
          <p>Cozinheiros, garçons e atendentes são funcionários com permissões diferentes.</p>
        </div>
        <button onClick={onNew}>
          <Plus />
          Novo funcionário
        </button>
      </S.EmployeeHeader>
      <S.EmployeeList>
        {employees.map((employee) => (
          <S.EmployeeRow key={employee.id}>
            <div className="avatar">
              {employee.name
                .split(' ')
                .map((part) => part[0])
                .slice(0, 2)
                .join('')}
            </div>
            <div className="identity">
              <b>{employee.name}</b>
              <span>{employee.email}</span>
            </div>
            <div className="role">
              <b>{roleLabel[employee.role]}</b>
              <span>
                {employee.role === 'COOK'
                  ? 'Acessa a tela de cozinha'
                  : employee.role === 'WAITER'
                    ? 'Acessa a tela de garçom'
                    : 'Operação de pedidos'}
              </span>
            </div>
            <span className="status">{employee.active ? '● Ativo' : '○ Inativo'}</span>
            <button className="edit" onClick={() => onEdit(employee)}>
              <MoreVertical />
            </button>
            {employee.active && (
              <button
                className="deactivate"
                type="button"
                onClick={() => void onDeactivate(employee)}
                aria-label={`Desativar ${employee.name}`}
              >
                <UserRoundX size={15} aria-hidden="true" />
                Desativar
              </button>
            )}
            {!employee.active && (
              <button
                className="reactivate"
                type="button"
                onClick={() => void onReactivate(employee)}
                aria-label={`Reativar ${employee.name}`}
              >
                <UserRoundCheck size={15} aria-hidden="true" />
                Reativar
              </button>
            )}
          </S.EmployeeRow>
        ))}
      </S.EmployeeList>
    </S.Card>
  );
}
