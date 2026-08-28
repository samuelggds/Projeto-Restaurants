import { AlertTriangle, Clock3, CreditCard, DollarSign } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Invoice, PaymentStatus, SuperAdminData } from '../types';
import {
  downloadCsv,
  formatCurrency,
  formatDate,
  normalizeSearch,
  statusTone,
} from '../domain/superAdminDomain';
import { Chart, Empty, Metrics, Toolbar } from '../components/Shared';
import * as S from '../SuperAdmin.styles';

const paymentLabels: Record<PaymentStatus, string> = {
  PAID: 'Paga',
  PENDING: 'Pendente',
  OVERDUE: 'Em atraso',
  CANCELED: 'Cancelada',
  REFUNDED: 'Estornada',
};
export function BillingPage({
  data,
  onSelect,
}: {
  data: SuperAdminData;
  onSelect: (invoice: Invoice) => void;
}) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'ALL' | PaymentStatus>('ALL');
  const visible = useMemo(() => {
    const search = normalizeSearch(query);
    return data.invoices.filter(
      (i) =>
        (!search || normalizeSearch(`${i.restaurant} ${i.code}`).includes(search)) &&
        (status === 'ALL' || i.status === status),
    );
  }, [data.invoices, query, status]);
  const exportRows = () =>
    downloadCsv(
      'faturamento.csv',
      [
        'Código',
        'Restaurante',
        'Vencimento',
        'Mensalidade',
        'Taxas',
        'Total',
        'Status',
        'Pagamento',
      ],
      visible.map((i) => [
        i.code,
        i.restaurant,
        i.dueDate,
        i.monthlyFee,
        i.systemFees,
        i.value,
        i.status,
        i.paidAt,
      ]),
    );
  return (
    <S.PageStack>
      <Toolbar
        query={query}
        onQuery={setQuery}
        placeholder="Buscar restaurante ou código da fatura"
        onExport={exportRows}
        resultCount={visible.length}
      >
        <select
          aria-label="Filtrar faturas por status"
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
        >
          <option value="ALL">Todos os status</option>
          {Object.entries(paymentLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Toolbar>
      <Metrics
        items={[
          {
            label: 'MRR de assinaturas',
            value: formatCurrency(data.metrics.mrr, data.settings.currency, data.settings.locale),
            icon: <DollarSign />,
          },
          {
            label: 'Total faturado',
            value: formatCurrency(
              data.metrics.totalGenerated,
              data.settings.currency,
              data.settings.locale,
            ),
            icon: <CreditCard />,
            hint: 'Todas as faturas emitidas',
          },
          {
            label: 'Total em aberto',
            value: formatCurrency(
              data.metrics.pendingInvoicesTotal,
              data.settings.currency,
              data.settings.locale,
            ),
            icon: <Clock3 />,
          },
          {
            label: 'Faturas em aberto',
            value: data.metrics.pendingInvoicesCount,
            icon: <AlertTriangle />,
          },
        ]}
      />
      <S.Grid>
        <S.Card>
          <S.SectionHeading>
            <div>
              <h2>Receita recebida por mês</h2>
              <p>Valores efetivamente pagos, agrupados pela data de liquidação.</p>
            </div>
          </S.SectionHeading>
          <Chart data={data.metrics.monthlyRevenue} valueKey="value" />
        </S.Card>
        <S.Card>
          <S.SectionHeading>
            <div>
              <h2>Leitura financeira</h2>
              <p>Valores consolidados pelo backend.</p>
            </div>
          </S.SectionHeading>
          <S.Stack>
            <S.ListItem>
              <span className="info">
                <b>Total faturado</b>
                <span>Todas as faturas emitidas, pagas ou em aberto</span>
              </span>
              <strong>
                {formatCurrency(
                  data.metrics.totalGenerated,
                  data.settings.currency,
                  data.settings.locale,
                )}
              </strong>
            </S.ListItem>
            <S.ListItem>
              <span className="info">
                <b>Contas a receber</b>
                <span>Saldo das cobranças em aberto</span>
              </span>
              <strong>
                {formatCurrency(
                  data.metrics.totalReceivable,
                  data.settings.currency,
                  data.settings.locale,
                )}
              </strong>
            </S.ListItem>
            <S.ListItem>
              <span className="info">
                <b>MRR</b>
                <span>Mensalidades de assinaturas ativas</span>
              </span>
              <strong>
                {formatCurrency(data.metrics.mrr, data.settings.currency, data.settings.locale)}
              </strong>
            </S.ListItem>
          </S.Stack>
        </S.Card>
      </S.Grid>
      <S.Card>
        <S.SectionHeading>
          <div>
            <h2>Faturas</h2>
            <p>{visible.length} registro(s) de cobrança.</p>
          </div>
        </S.SectionHeading>
        {visible.length ? (
          <S.Table>
            <div className="row head">
              <span>Restaurante</span>
              <span>Fatura</span>
              <span>Vencimento</span>
              <span>Valor</span>
              <span>Status</span>
              <span>Ação</span>
            </div>
            {visible.map((invoice) => (
              <div className="row" key={invoice.id}>
                <b data-label="Restaurante">{invoice.restaurant}</b>
                <span data-label="Fatura">{invoice.code}</span>
                <span data-label="Vencimento">{formatDate(invoice.dueDate)}</span>
                <span data-label="Valor">
                  {formatCurrency(invoice.value, data.settings.currency, data.settings.locale)}
                </span>
                <span data-label="Status">
                  <S.Badge $tone={statusTone(invoice.status)}>
                    {paymentLabels[invoice.status]}
                  </S.Badge>
                </span>
                <button type="button" className="action" onClick={() => onSelect(invoice)}>
                  Ver detalhes
                </button>
              </div>
            ))}
          </S.Table>
        ) : (
          <Empty title="Nenhuma fatura encontrada" />
        )}
      </S.Card>
    </S.PageStack>
  );
}
