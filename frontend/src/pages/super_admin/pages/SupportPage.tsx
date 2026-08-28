import { Clock3, Headphones, MessageCircle, UserRoundCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { SuperAdminData, SupportStatus, SupportTicket } from '../types';
import { formatDate, normalizeSearch, statusTone } from '../domain/superAdminDomain';
import { Empty, Metrics, Toolbar } from '../components/Shared';
import * as S from '../SuperAdmin.styles';

const supportLabels = {
  OPEN: 'Aguardando suporte',
  WAITING_CUSTOMER: 'Aguardando restaurante',
  CLOSED: 'Encerrado',
} as const;
export function SupportPage({
  data,
  onSelect,
}: {
  data: SuperAdminData;
  onSelect: (ticket: SupportTicket) => void;
}) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'ALL' | SupportStatus>('ALL');
  const visible = useMemo(() => {
    const search = normalizeSearch(query);
    return data.tickets.filter(
      (t) =>
        (!search || normalizeSearch(`${t.restaurant} ${t.subject} ${t.id}`).includes(search)) &&
        (status === 'ALL' || t.status === status),
    );
  }, [data.tickets, query, status]);
  return (
    <S.PageStack>
      <S.InlineAlert $tone="info">
        A fila é ordenada pela mensagem mais recente. Responda com diagnóstico, ação realizada e
        próximo passo esperado do restaurante.
      </S.InlineAlert>
      <Toolbar
        query={query}
        onQuery={setQuery}
        placeholder="Buscar protocolo, restaurante ou assunto"
      >
        <select
          aria-label="Filtrar chamados por status"
          value={status}
          onChange={(e) => setStatus(e.target.value as 'ALL' | SupportStatus)}
        >
          <option value="ALL">Todos os status</option>
          {Object.entries(supportLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Toolbar>
      <Metrics
        items={[
          {
            label: 'Aguardando suporte',
            value: data.tickets.filter((t) => t.status === 'OPEN').length,
            icon: <Headphones />,
          },
          {
            label: 'Aguardando restaurante',
            value: data.tickets.filter((t) => t.status === 'WAITING_CUSTOMER').length,
            icon: <UserRoundCheck />,
          },
          { label: 'Conversas monitoradas', value: data.tickets.length, icon: <MessageCircle /> },
          {
            label: 'Mensagens registradas',
            value: data.tickets.reduce((sum, t) => sum + t.messageCount, 0),
            icon: <Clock3 />,
          },
        ]}
      />
      <S.Card>
        <S.SectionHeading>
          <div>
            <h2>Fila de atendimento</h2>
            <p>
              {visible.length} conversa(s). Nenhum SLA é exibido sem telemetria calculada pelo
              backend.
            </p>
          </div>
        </S.SectionHeading>
        {visible.length ? (
          <S.Table>
            <div className="row head">
              <span>Protocolo</span>
              <span>Restaurante</span>
              <span>Assunto</span>
              <span>Mensagens</span>
              <span>Última atividade</span>
              <span>Ação</span>
            </div>
            {visible.map((ticket) => (
              <div className="row" key={`${ticket.restaurantId}-${ticket.id}`}>
                <span data-label="Protocolo">#{ticket.id}</span>
                <b data-label="Restaurante">{ticket.restaurant}</b>
                <span className="name" data-label="Assunto">
                  <b>{ticket.subject}</b>
                  <small>
                    <S.Badge $tone={statusTone(ticket.status)}>
                      {supportLabels[ticket.status]}
                    </S.Badge>
                  </small>
                </span>
                <span data-label="Mensagens">{ticket.messageCount}</span>
                <span data-label="Última atividade">{formatDate(ticket.lastMessageAt, true)}</span>
                <button type="button" className="action" onClick={() => onSelect(ticket)}>
                  Ver conversa
                </button>
              </div>
            ))}
          </S.Table>
        ) : (
          <Empty
            title="Nenhum chamado encontrado"
            description="Quando um restaurante solicitar suporte, a conversa aparecerá aqui."
          />
        )}
      </S.Card>
    </S.PageStack>
  );
}
