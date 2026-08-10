import { useMemo, useState } from "react";
import * as S from "../Admin.styles";
import type { AdminOrder } from "../types";
import { filterCustomerSummaries, summarizeCustomers } from "../domain/adminOverview";

type AdminCustomersProps = {
  orders: AdminOrder[];
  money: (value: number) => string;
};

export function AdminCustomers({ orders, money }: AdminCustomersProps) {
  const [search, setSearch] = useState("");
  const customers = useMemo(() => summarizeCustomers(orders), [orders]);
  const visibleCustomers = useMemo(() => filterCustomerSummaries(customers, search), [customers, search]);

  return (
    <S.Card>
      <S.Toolbar>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cliente" />
      </S.Toolbar>
      <S.DataList>
        {visibleCustomers.map((customer) => (
          <div className="data-row" key={`${customer.email}-${customer.name}`}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#fff0e7", color: "var(--a)", display: "grid", placeItems: "center", fontWeight: 800 }}>
              {customer.name.split(" ").map((part) => part[0]).join("")}
            </div>
            <div>
              <b>{customer.name}</b>
              <span>{customer.email} • {customer.count} pedidos • {money(customer.total)}</span>
            </div>
          </div>
        ))}
      </S.DataList>
    </S.Card>
  );
}
