import { FormEvent, useState } from "react";
import { X } from "lucide-react";
import * as S from "../Admin.styles";
import type { Employee, EmployeeRole } from "../types";

type EmployeeDrawerProps = {
  employee: Employee | null;
  close: () => void;
  save: (employee: Omit<Employee, "id">, id?: string) => void;
};

export function EmployeeDrawer({ employee, close, save }: EmployeeDrawerProps) {
  const [name, setName] = useState(employee?.name ?? "");
  const [email, setEmail] = useState(employee?.email ?? "");
  const [role, setRole] = useState<EmployeeRole>(employee?.role ?? "ATTENDANT");
  const [password, setPassword] = useState("");
  const [permissions, setPermissions] = useState(employee?.permissions ?? {
    viewOrders: true,
    updateOrderStatus: true,
    manageQrTables: true,
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name || !email.includes("@") || (!employee && password.length < 6)) return;
    save({
      name,
      email,
      role,
      active: employee?.active ?? true,
      permissions,
      ...(password ? { password, confirmPassword: password } : {}),
    } as Omit<Employee, "id">, employee?.id);
  };

  return (
    <S.Overlay onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <S.Drawer onSubmit={submit}>
        <header>
          <h2>{employee ? "Editar funcionário" : "Novo funcionário"}</h2>
          <button type="button" onClick={close}><X /></button>
        </header>
        <S.Field>Nome completo<input value={name} onChange={(event) => setName(event.target.value)} /></S.Field>
        <S.Field>E-mail de acesso<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></S.Field>
        {!employee && <S.Field>Senha de acesso<input type="password" value={password} placeholder="Mínimo 6 caracteres" onChange={(event) => setPassword(event.target.value)} /></S.Field>}
        <S.Field>
          Cargo
          <select value={role} onChange={(event) => setRole(event.target.value as EmployeeRole)}>
            <option value="COOK">Cozinheiro — acessa a tela de cozinha</option>
            <option value="WAITER">Garçom — acessa a tela de garçom</option>
            <option value="ATTENDANT">Atendente — acessa o painel de funcionários</option>
          </select>
        </S.Field>
        <div className="permissions">
          <b>Permissões</b>
          {([
            ["viewOrders", "Ver pedidos"],
            ["updateOrderStatus", "Mudar status dos pedidos"],
            ["manageQrTables", "Gerenciar mesas e códigos QR"],
          ] as const).map(([key, label]) => (
            <label key={key}>
              <input type="checkbox" checked={permissions[key]} onChange={() => setPermissions((current) => ({ ...current, [key]: !current[key] }))} />
              {label}
            </label>
          ))}
        </div>
        <footer>
          <button type="button" onClick={close}>Cancelar</button>
          <button className="primary" type="submit">{employee ? "Salvar" : "Criar funcionário"}</button>
        </footer>
      </S.Drawer>
    </S.Overlay>
  );
}
