import { useMemo, useState } from 'react';
import {
  BriefcaseBusiness,
  CircleOff,
  MoreVertical,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  UserRoundX,
  UsersRound,
} from 'lucide-react';
import * as S from './AdminPeople.styles';
import type { Employee, EmployeeRole } from '../types';

const roleLabel: Record<EmployeeRole, string> = {
  COOK: 'Cozinheiro',
  WAITER: 'Garçom',
  ATTENDANT: 'Atendente',
  COURIER: 'Motoqueiro',
};

const roleDescription: Record<EmployeeRole, string> = {
  COOK: 'Acessa a tela de cozinha',
  WAITER: 'Acessa a tela de garçom',
  ATTENDANT: 'Acompanha a operação de pedidos',
  COURIER: 'Acessa a área do motoqueiro',
};

type EmployeeStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';
type EmployeeRoleFilter = 'ALL' | EmployeeRole;

type EmployeeListProps = {
  employees: Employee[];
  onNew: () => void;
  onEdit: (employee: Employee) => void;
  onDeactivate: (employee: Employee) => Promise<void>;
  onReactivate: (employee: Employee) => Promise<void>;
};

const EMPLOYEE_BATCH_SIZE = 12;

function normalize(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
}

function getInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toLocaleUpperCase('pt-BR');
  return initials || 'FN';
}

export function EmployeeList({
  employees,
  onNew,
  onEdit,
  onDeactivate,
  onReactivate,
}: EmployeeListProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<EmployeeStatusFilter>('ALL');
  const [roleFilter, setRoleFilter] = useState<EmployeeRoleFilter>('ALL');
  const [visibleLimit, setVisibleLimit] = useState(EMPLOYEE_BATCH_SIZE);
  const activeEmployees = useMemo(
    () => employees.filter((employee) => employee.active).length,
    [employees],
  );
  const inactiveEmployees = employees.length - activeEmployees;
  const representedRoles = useMemo(
    () => new Set(employees.map((employee) => employee.role)).size,
    [employees],
  );
  const visibleEmployees = useMemo(() => {
    const query = normalize(search);
    return employees.filter((employee) => {
      const matchesSearch =
        !query ||
        normalize(`${employee.name} ${employee.email} ${employee.phone ?? ''}`).includes(query);
      const matchesStatus =
        statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? employee.active : !employee.active);
      const matchesRole = roleFilter === 'ALL' || employee.role === roleFilter;
      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [employees, roleFilter, search, statusFilter]);
  const displayedEmployees = visibleEmployees.slice(0, visibleLimit);

  const resetLimit = () => setVisibleLimit(EMPLOYEE_BATCH_SIZE);

  return (
    <S.PeopleWorkspace>
      <S.PeopleHero aria-labelledby="employees-hero-title">
        <S.HeroCopy>
          <span className="eyebrow">
            <Sparkles aria-hidden="true" /> Equipe e acessos
          </span>
          <h2 id="employees-hero-title">
            {employees.length
              ? 'Sua equipe pronta para cada etapa da operação'
              : 'Monte a equipe que vai cuidar da operação'}
          </h2>
          <p>Organize cargos, acompanhe acessos ativos e gerencie cada funcionário com clareza.</p>
          <div className="hero-status" aria-label="Resumo da equipe">
            <span>
              <UsersRound aria-hidden="true" /> {employees.length}{' '}
              {employees.length === 1 ? 'funcionário cadastrado' : 'funcionários cadastrados'}
            </span>
            <span>
              <UserRoundCheck aria-hidden="true" /> {activeEmployees} com acesso ativo
            </span>
            <span>
              <BriefcaseBusiness aria-hidden="true" /> {representedRoles}{' '}
              {representedRoles === 1 ? 'cargo representado' : 'cargos representados'}
            </span>
          </div>
        </S.HeroCopy>
        <S.HeroAside>
          <small>Equipe disponível</small>
          <strong>
            {activeEmployees}/{employees.length} ativos
          </strong>
          <span>Somente pessoas ativas conseguem entrar na área operacional do seu cargo.</span>
          <button type="button" onClick={onNew}>
            <Plus aria-hidden="true" /> Novo funcionário
          </button>
        </S.HeroAside>
      </S.PeopleHero>

      <S.PeopleMetrics aria-label="Indicadores da equipe">
        <S.PeopleMetric>
          <span className="metric-icon primary" aria-hidden="true">
            <UsersRound />
          </span>
          <span className="metric-copy">
            <small>Total da equipe</small>
            <strong>{employees.length}</strong>
            <em>Acessos cadastrados</em>
          </span>
        </S.PeopleMetric>
        <S.PeopleMetric>
          <span className="metric-icon success" aria-hidden="true">
            <UserRoundCheck />
          </span>
          <span className="metric-copy">
            <small>Acessos ativos</small>
            <strong>{activeEmployees}</strong>
            <em>Podem entrar no sistema</em>
          </span>
        </S.PeopleMetric>
        <S.PeopleMetric>
          <span className="metric-icon warning" aria-hidden="true">
            <UserRoundX />
          </span>
          <span className="metric-copy">
            <small>Acessos inativos</small>
            <strong>{inactiveEmployees}</strong>
            <em>Bloqueados temporariamente</em>
          </span>
        </S.PeopleMetric>
        <S.PeopleMetric>
          <span className="metric-icon info" aria-hidden="true">
            <BriefcaseBusiness />
          </span>
          <span className="metric-copy">
            <small>Cargos na equipe</small>
            <strong>{representedRoles}</strong>
            <em>Áreas operacionais cobertas</em>
          </span>
        </S.PeopleMetric>
      </S.PeopleMetrics>

      <S.DirectoryPanel aria-labelledby="employees-directory-title">
        <S.DirectoryHeader>
          <div>
            <span className="section-icon" aria-hidden="true">
              <ShieldCheck />
            </span>
            <span>
              <small>Gestão de acessos</small>
              <h2 id="employees-directory-title">Funcionários cadastrados</h2>
            </span>
          </div>
        </S.DirectoryHeader>
        <S.DirectoryDescription>
          Encontre uma pessoa, confira sua área de trabalho e ative ou bloqueie o acesso quando
          precisar.
        </S.DirectoryDescription>

        <S.DirectoryToolbar>
          <label>
            <span>Buscar</span>
            <span className="control">
              <Search aria-hidden="true" />
              <input
                aria-label="Buscar funcionário por nome, e-mail ou telefone"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  resetLimit();
                }}
                placeholder="Buscar funcionário"
              />
            </span>
          </label>
          <label>
            <span>Status</span>
            <select
              aria-label="Filtrar funcionários por status"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as EmployeeStatusFilter);
                resetLimit();
              }}
            >
              <option value="ALL">Todos os status</option>
              <option value="ACTIVE">Ativos</option>
              <option value="INACTIVE">Inativos</option>
            </select>
          </label>
          <label>
            <span>Cargo</span>
            <select
              aria-label="Filtrar funcionários por cargo"
              value={roleFilter}
              onChange={(event) => {
                setRoleFilter(event.target.value as EmployeeRoleFilter);
                resetLimit();
              }}
            >
              <option value="ALL">Todos os cargos</option>
              {Object.entries(roleLabel).map(([role, label]) => (
                <option key={role} value={role}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <S.ResultCount aria-live="polite">
            {visibleEmployees.length}{' '}
            {visibleEmployees.length === 1 ? 'funcionário encontrado' : 'funcionários encontrados'}
          </S.ResultCount>
        </S.DirectoryToolbar>

        {displayedEmployees.length ? (
          <S.PeopleList aria-label="Lista de funcionários">
            {displayedEmployees.map((employee) => (
              <S.EmployeeRow key={employee.id}>
                <span className="avatar" aria-hidden="true">
                  {getInitials(employee.name)}
                </span>
                <span className="identity">
                  <b>{employee.name}</b>
                  <span>{employee.email}</span>
                </span>
                <span className="role">
                  <b>{roleLabel[employee.role]}</b>
                  <span>{roleDescription[employee.role]}</span>
                </span>
                <span className={`status${employee.active ? '' : ' inactive'}`}>
                  {employee.active ? 'Acesso ativo' : 'Acesso inativo'}
                </span>
                <span className="row-actions">
                  <button
                    className="edit"
                    type="button"
                    onClick={() => onEdit(employee)}
                    aria-label={`Editar ${employee.name}`}
                    title={`Editar ${employee.name}`}
                  >
                    <MoreVertical aria-hidden="true" />
                  </button>
                  {employee.active ? (
                    <button
                      className="toggle-access deactivate"
                      type="button"
                      onClick={() => void onDeactivate(employee)}
                      aria-label={`Desativar ${employee.name}`}
                    >
                      <UserRoundX aria-hidden="true" />
                      Desativar
                    </button>
                  ) : (
                    <button
                      className="toggle-access reactivate"
                      type="button"
                      onClick={() => void onReactivate(employee)}
                      aria-label={`Reativar ${employee.name}`}
                    >
                      <UserRoundCheck aria-hidden="true" />
                      Reativar
                    </button>
                  )}
                </span>
              </S.EmployeeRow>
            ))}
          </S.PeopleList>
        ) : (
          <S.EmptyState>
            <div>
              <CircleOff aria-hidden="true" />
              <strong>
                {employees.length ? 'Nenhum funcionário encontrado' : 'Sua equipe está vazia'}
              </strong>
              <span>
                {employees.length
                  ? 'Ajuste a busca ou os filtros para encontrar outra pessoa.'
                  : 'Cadastre o primeiro funcionário para liberar um acesso operacional.'}
              </span>
            </div>
          </S.EmptyState>
        )}

        {visibleLimit < visibleEmployees.length && (
          <S.LoadMoreButton
            type="button"
            onClick={() => setVisibleLimit((current) => current + EMPLOYEE_BATCH_SIZE)}
          >
            Mostrar mais funcionários
          </S.LoadMoreButton>
        )}
      </S.DirectoryPanel>
    </S.PeopleWorkspace>
  );
}
