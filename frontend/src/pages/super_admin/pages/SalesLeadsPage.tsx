import { ChevronLeft, ChevronRight, LoaderCircle, Mail, Search } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import salesLeadsService from '../../../Services/salesLeadsService';
import { Empty, Modal } from '../components/Shared';
import { formatDate, requestErrorMessage } from '../domain/superAdminDomain';
import type {
  SalesLead,
  SalesLeadStatus,
  SalesLeadsQuery,
  SalesLeadsResult,
} from '../salesLeadTypes';
import * as S from '../SuperAdmin.styles';
import * as L from '../SalesLeads.styles';

const statusLabels = { NEW: 'Novo', CONTACTED: 'Contatado', ARCHIVED: 'Arquivado' } as const;
const emailLabels = {
  PENDING: 'Aviso por e-mail pendente',
  SENT: 'Aviso por e-mail enviado',
  FAILED: 'Falha no aviso por e-mail',
} as const;
const planLabels = { BASICO: 'Básico', PREMIUM: 'Premium', UNDECIDED: 'Quero orientação' } as const;
const channelLabels = { DELIVERY: 'Delivery', TABLE: 'Mesas', PICKUP: 'Retirada' } as const;
const statusTone = { NEW: 'blue', CONTACTED: 'green', ARCHIVED: 'gray' } as const;

function LeadDetails({
  lead,
  onClose,
  onUpdated,
}: {
  lead: SalesLead;
  onClose: () => void;
  onUpdated: (lead: SalesLead) => void;
}) {
  const [status, setStatus] = useState(lead.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (saving || status === lead.status) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      onUpdated(await salesLeadsService.updateStatus(lead.id, status));
      setSaved(true);
    } catch (requestError) {
      setError(requestErrorMessage(requestError, 'Não foi possível atualizar o contato.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Contato comercial" description={lead.restaurantName} onClose={onClose}>
      <L.DetailGrid>
        <div>
          <dt>Nome do responsável</dt>
          <dd>{lead.name}</dd>
        </div>
        <div>
          <dt>Restaurante</dt>
          <dd>{lead.restaurantName}</dd>
        </div>
        <div>
          <dt>E-mail</dt>
          <dd>{lead.email}</dd>
        </div>
        <div>
          <dt>Telefone / WhatsApp</dt>
          <dd>{lead.phone}</dd>
        </div>
        <div>
          <dt>Cidade / UF</dt>
          <dd>{[lead.city, lead.state].filter(Boolean).join(' / ') || 'Não informado'}</dd>
        </div>
        <div>
          <dt>Tipo de negócio</dt>
          <dd>{lead.businessType || 'Não informado'}</dd>
        </div>
        <div>
          <dt>Canais de atendimento</dt>
          <dd>
            {lead.channels.map((channel) => channelLabels[channel]).join(', ') || 'Não informado'}
          </dd>
        </div>
        <div>
          <dt>Plano de interesse</dt>
          <dd>{planLabels[lead.planInterest]}</dd>
        </div>
        <div>
          <dt>Recebido em</dt>
          <dd>{formatDate(lead.createdAt, true)}</dd>
        </div>
        <div>
          <dt>Última atualização</dt>
          <dd>{formatDate(lead.updatedAt, true)}</dd>
        </div>
        <div className="wide">
          <dt>Aviso para a equipe comercial</dt>
          <dd>
            {emailLabels[lead.emailStatus]}
            {lead.emailSentAt ? ` em ${formatDate(lead.emailSentAt, true)}` : ''}
          </dd>
        </div>
        <div className="wide">
          <dt>Mensagem</dt>
          <dd className="message">{lead.message || 'O responsável não adicionou uma mensagem.'}</dd>
        </div>
        <div className="wide">
          <dt>Autorização de contato</dt>
          <dd>
            {lead.consent
              ? 'O responsável autorizou o contato comercial no formulário.'
              : 'Não informada'}
          </dd>
        </div>
      </L.DetailGrid>
      <L.StatusForm onSubmit={(event) => void save(event)} aria-label="Atualizar contato comercial">
        <label>
          Status do contato
          <select
            value={status}
            disabled={saving}
            onChange={(event) => {
              setStatus(event.target.value as SalesLeadStatus);
              setSaved(false);
            }}
          >
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <S.Button
          type="submit"
          $variant="primary"
          disabled={saving || status === lead.status}
          aria-busy={saving}
        >
          {saving ? 'Salvando…' : 'Salvar status'}
        </S.Button>
      </L.StatusForm>
      {error ? (
        <S.InlineAlert $tone="error" role="alert">
          {error}
        </S.InlineAlert>
      ) : null}
      {saved ? (
        <S.InlineAlert $tone="success" role="status">
          Status atualizado.
        </S.InlineAlert>
      ) : null}
    </Modal>
  );
}

export function SalesLeadsPage({ refreshKey = 0 }: { refreshKey?: number }) {
  const [query, setQuery] = useState<SalesLeadsQuery>({ page: 1, pageSize: 20 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<SalesLeadStatus | ''>('');
  const [data, setData] = useState<SalesLeadsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [selectedLead, setSelectedLead] = useState<SalesLead | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await salesLeadsService.list(query, controller.signal);
        if (controller.signal.aborted) return;
        const lastPage = Math.max(1, Math.ceil(response.total / query.pageSize));
        if (query.page > lastPage) {
          setQuery((current) => ({ ...current, page: lastPage }));
          return;
        }
        setData(response);
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(
            requestErrorMessage(requestError, 'Não foi possível carregar os contatos comerciais.'),
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    const timer = window.setTimeout(() => void load(), 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, refreshKey, revision]);

  const applyFilters = (event: FormEvent) => {
    event.preventDefault();
    setQuery({
      page: 1,
      pageSize: 20,
      ...(search.trim() ? { q: search.trim() } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
    });
  };
  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setQuery({ page: 1, pageSize: 20 });
  };
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / query.pageSize));

  return (
    <L.Inbox>
      <S.SectionHeading>
        <div>
          <h2>Caixa de entrada comercial</h2>
          <p>
            Solicitações recebidas pelo formulário do site. Abra um contato para consultar os dados
            e acompanhar o atendimento.
          </p>
        </div>
      </S.SectionHeading>
      <L.Filters role="search" onSubmit={applyFilters}>
        <label>
          Buscar contatos
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nome, restaurante, e-mail ou telefone"
            maxLength={120}
          />
        </label>
        <label>
          Filtrar por status
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as SalesLeadStatus | '')}
          >
            <option value="">Todos os status</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <S.Button type="submit">
          <Search size={16} aria-hidden="true" />
          Aplicar filtros
        </S.Button>
        {search || statusFilter || query.q || query.status ? (
          <S.Button type="button" onClick={clearFilters}>
            Limpar
          </S.Button>
        ) : null}
      </L.Filters>
      {data?.emailConfigured === false ? (
        <S.InlineAlert $tone="warning" role="status">
          <b>O aviso por e-mail não está configurado.</b> Os contatos continuam salvos nesta caixa
          de entrada. Configure o envio de e-mails e o destinatário comercial no ambiente da
          plataforma.
        </S.InlineAlert>
      ) : null}
      {error ? (
        <S.InlineAlert $tone="error" role="alert">
          {error}{' '}
          <button type="button" onClick={() => setRevision((value) => value + 1)}>
            Tentar novamente
          </button>
        </S.InlineAlert>
      ) : null}
      <div aria-busy={loading}>
        {loading ? (
          <S.EmptyState role="status">
            <LoaderCircle aria-hidden="true" />
            <h3>Carregando contatos…</h3>
          </S.EmptyState>
        ) : !error && data ? (
          <>
            <L.Summary>
              <span>
                <b>{data.total}</b>{' '}
                {data.total === 1 ? 'contato encontrado' : 'contatos encontrados'}
              </span>
              <span>Mais recentes primeiro</span>
            </L.Summary>
            {data.items.length ? (
              <L.List aria-label="Contatos comerciais" style={{ marginTop: 14 }}>
                {data.items.map((lead) => (
                  <L.LeadCard key={lead.id}>
                    <div className="identity">
                      <h3>{lead.restaurantName}</h3>
                      <p>{lead.name}</p>
                      <p>{lead.email}</p>
                    </div>
                    <div className="interest">
                      <p>
                        {[lead.city, lead.state].filter(Boolean).join(' / ') ||
                          'Local não informado'}
                      </p>
                      <p>Plano: {planLabels[lead.planInterest]}</p>
                      <time dateTime={lead.createdAt}>{formatDate(lead.createdAt, true)}</time>
                    </div>
                    <div className="progress">
                      <S.Badge $tone={statusTone[lead.status]}>{statusLabels[lead.status]}</S.Badge>
                      <span
                        className={`email-state ${lead.emailStatus === 'FAILED' ? 'failed' : ''}`}
                      >
                        <Mail size={13} aria-hidden="true" />
                        {emailLabels[lead.emailStatus]}
                      </span>
                    </div>
                    <S.Button
                      type="button"
                      aria-label={`Ver contato de ${lead.restaurantName}`}
                      onClick={() => setSelectedLead(lead)}
                    >
                      Ver contato
                    </S.Button>
                  </L.LeadCard>
                ))}
              </L.List>
            ) : (
              <Empty
                title={
                  query.q || query.status
                    ? 'Nenhum contato corresponde aos filtros'
                    : 'Nenhum contato comercial recebido'
                }
                description={
                  query.q || query.status
                    ? 'Ajuste a busca ou limpe os filtros para consultar os demais contatos.'
                    : 'As solicitações enviadas pelo formulário do site aparecerão aqui.'
                }
              />
            )}
          </>
        ) : null}
      </div>
      {!error && data && data.total > 0 ? (
        <L.Pagination aria-label="Paginação de contatos">
          <S.Button
            type="button"
            disabled={loading || query.page <= 1}
            onClick={() => setQuery((current) => ({ ...current, page: current.page - 1 }))}
          >
            <ChevronLeft size={15} aria-hidden="true" />
            Anterior
          </S.Button>
          <span aria-live="polite">
            Página {query.page} de {totalPages}
          </span>
          <S.Button
            type="button"
            disabled={loading || query.page >= totalPages}
            onClick={() => setQuery((current) => ({ ...current, page: current.page + 1 }))}
          >
            Próxima
            <ChevronRight size={15} aria-hidden="true" />
          </S.Button>
        </L.Pagination>
      ) : null}
      {selectedLead ? (
        <LeadDetails
          key={selectedLead.id}
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdated={(updated) => {
            setSelectedLead((current) => (current?.id === updated.id ? updated : current));
            setRevision((value) => value + 1);
          }}
        />
      ) : null}
    </L.Inbox>
  );
}
