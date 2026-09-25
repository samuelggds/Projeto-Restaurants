import { FormEvent, useMemo, useState } from 'react';
import { PasswordVisibilityField } from '../../../components/PasswordVisibilityField/PasswordVisibilityField';
import { X } from 'lucide-react';
import {
  evaluatePassword,
  PasswordRequirements,
  STANDARD_PASSWORD_POLICY,
} from '../../../features/password-policy';
import * as S from '../Admin.styles';
import type { Employee, EmployeeFormPayload, EmployeeRole } from '../types';

type EmployeeDrawerProps = {
  employee: Employee | null;
  close: () => void;
  save: (employee: EmployeeFormPayload, id?: string) => void | Promise<void>;
};

export function EmployeeDrawer({ employee, close, save }: EmployeeDrawerProps) {
  const [name, setName] = useState(employee?.name ?? '');
  const [username, setUsername] = useState(employee?.username ?? '');
  const [phone, setPhone] = useState(String(employee?.phone ?? ''));
  const [role, setRole] = useState<EmployeeRole>(employee?.role ?? 'ATTENDANT');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const passwordEvaluation = useMemo(
    () => evaluatePassword(password, confirmPassword, STANDARD_PASSWORD_POLICY),
    [confirmPassword, password],
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const normalizedName = name.trim();
    const normalizedUsername = username.trim().normalize('NFC').toLocaleLowerCase('pt-BR');
    const phoneDigits = phone.replace(/\D/g, '');

    if (normalizedName.length < 2) {
      setError('Informe o nome completo do funcionário.');
      return;
    }
    if (!/^[\p{Ll}\p{N}]{3,32}$/u.test(normalizedUsername)) {
      setError(
        'O usuário deve ter de 3 a 32 caracteres, somente letras minúsculas e números, sem espaços ou símbolos.',
      );
      return;
    }
    if (
      (!employee || phoneDigits.length > 0) &&
      phoneDigits.length !== 10 &&
      phoneDigits.length !== 11
    ) {
      setError('Informe um telefone com DDD.');
      return;
    }
    if (!employee && !passwordEvaluation.isValid) {
      setError(passwordEvaluation.errors.join(' '));
      return;
    }

    setError('');
    setSaving(true);
    try {
      const payload: EmployeeFormPayload = {
        name: normalizedName,
        username: normalizedUsername,
        ...(!employee || phoneDigits.length > 0 ? { phone } : {}),
        role,
        active: employee?.active ?? true,
        permissions: employee?.permissions ?? {
          viewOrders: true,
          updateOrderStatus: true,
          manageQrTables: false,
        },
        ...(!employee ? { password, confirmPassword } : {}),
      };
      await save(payload, employee?.id);
    } finally {
      setSaving(false);
    }
  };

  return (
    <S.Overlay onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <S.Drawer
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="employee-drawer-title"
      >
        <header>
          <h2 id="employee-drawer-title">{employee ? 'Editar funcionário' : 'Novo funcionário'}</h2>
          <button type="button" onClick={close} aria-label="Fechar cadastro de funcionário">
            <X aria-hidden="true" />
          </button>
        </header>
        <S.Field>
          Nome completo
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </S.Field>
        <S.Field>
          Usuário de conta
          <input
            type="text"
            inputMode="text"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            minLength={3}
            maxLength={32}
            value={username}
            placeholder="ex.: joaosantos"
            onChange={(event) => setUsername(event.target.value.toLocaleLowerCase('pt-BR'))}
          />
          <small>Somente letras minúsculas e números, tudo junto e sem espaços.</small>
        </S.Field>
        <S.Field>
          Telefone com DDD
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            placeholder="(85) 99999-9999"
            onChange={(event) => setPhone(event.target.value)}
          />
        </S.Field>
        {!employee && (
          <>
            <S.Field>
              Senha de acesso
              <PasswordVisibilityField label="senha">
                <input
                type="password"
                autoComplete="new-password"
                minLength={STANDARD_PASSWORD_POLICY.minLength}
                maxLength={STANDARD_PASSWORD_POLICY.maxLength}
                aria-describedby="employee-password-requirements"
                value={password}
                placeholder="Mínimo de 8 caracteres"
                onChange={(event) => setPassword(event.target.value)}
                />
              </PasswordVisibilityField>
            </S.Field>
            <S.Field>
              Confirmar senha
              <PasswordVisibilityField label="senha">
                <input
                type="password"
                autoComplete="new-password"
                minLength={STANDARD_PASSWORD_POLICY.minLength}
                maxLength={STANDARD_PASSWORD_POLICY.maxLength}
                aria-describedby="employee-password-requirements"
                value={confirmPassword}
                placeholder="Digite a mesma senha"
                onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </PasswordVisibilityField>
            </S.Field>
            <PasswordRequirements
              id="employee-password-requirements"
              password={password}
              confirmation={confirmPassword}
              policy={STANDARD_PASSWORD_POLICY}
            />
          </>
        )}
        <S.Field>
          Cargo
          <select value={role} onChange={(event) => setRole(event.target.value as EmployeeRole)}>
            <option value="COOK">Cozinheiro — acessa a tela de cozinha</option>
            <option value="WAITER">Garçom — acessa a tela de garçom</option>
            <option value="COURIER">Motoqueiro — acessa a área de entregas</option>
            <option value="ATTENDANT">Atendente — acessa o painel de funcionários</option>
          </select>
        </S.Field>
        <p style={{ margin: 0, color: '#6f645f', fontSize: 13 }}>
          O cargo define automaticamente a área operacional disponível para este acesso.
        </p>
        {error && (
          <p role="alert" style={{ margin: 0, color: '#b42318', fontSize: 13 }}>
            {error}
          </p>
        )}
        <footer>
          <button type="button" onClick={close} disabled={saving}>
            Cancelar
          </button>
          <button
            className="primary"
            type="submit"
            disabled={saving || (!employee && !passwordEvaluation.isValid)}
          >
            {saving ? 'Salvando...' : employee ? 'Salvar' : 'Criar funcionário'}
          </button>
        </footer>
      </S.Drawer>
    </S.Overlay>
  );
}
