import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  Clock3,
  Loader2,
  RefreshCw,
  Search,
  Store,
  Wrench,
} from 'lucide-react';
import superAdminService from '../../../Services/superAdminService';
import { ManagedRestaurantWorkspace } from '../components/ManagedRestaurantWorkspace';
import * as S from './ManagedServicePage.styles';

type Implementation = {
  id: string;
  restaurantId: number;
  status: string;
  productLimit: number | null;
  notes?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  updatedAt: string;
  restaurant: {
    id: number;
    name: string;
    slug: string;
    plan: string | null;
    subscriptionStatus: string | null;
    productsCount: number;
    categoriesCount: number;
  };
};

type ManagedRequest = {
  id: string;
  restaurantId: number;
  category: string;
  title: string;
  description: string;
  status: string;
  response?: string | null;
  createdAt: string;
  updatedAt: string;
  restaurant?: { id: number; name: string; slug: string };
  requestedBy?: { id: number; name: string };
  handledBy?: { id: number; name: string } | null;
};

type Queue = {
  implementations: Implementation[];
  requests: ManagedRequest[];
};

const implementationStatuses = [
  ['AGUARDANDO_MATERIAL', 'Aguardando material'],
  ['EM_IMPLANTACAO', 'Em implantação'],
  ['AGUARDANDO_CLIENTE', 'Aguardando cliente'],
  ['EM_REVISAO', 'Em revisão'],
  ['CONCLUIDA', 'Concluída'],
  ['CANCELADA', 'Cancelada'],
] as const;

const requestStatuses = [
  ['ABERTA', 'Aberta'],
  ['EM_ANALISE', 'Em análise'],
  ['EM_EXECUCAO', 'Em execução'],
  ['AGUARDANDO_CLIENTE', 'Aguardando cliente'],
  ['CONCLUIDA', 'Concluída'],
  ['CANCELADA', 'Cancelada'],
] as const;

const categoryLabels: Record<string, string> = {
  PRODUTO: 'Produto',
  PRECO: 'Preço',
  CATEGORIA: 'Categoria',
  COMBO: 'Combo',
  BANNER: 'Banner',
  APARENCIA: 'Aparência',
  CONFIGURACAO: 'Configuração',
  OUTRO: 'Outro',
};

function dateTime(value?: string | null) {
  if (!value) return 'Não informado';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Não informado';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function errorMessage(error: unknown) {
  return (
    (error as { response?: { data?: { error?: string; message?: string } } })?.response?.data
      ?.error ||
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
    (error instanceof Error ? error.message : '') ||
    'Não foi possível concluir a operação.'
  );
}

export function ManagedServicePage() {
  const [queue, setQueue] = useState<Queue>({ implementations: [], requests: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'implementations' | 'requests'>('implementations');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [workspaceRestaurantId, setWorkspaceRestaurantId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setQueue(await superAdminService.getManagedServiceQueue());
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR');
  const implementations = useMemo(
    () =>
      queue.implementations.filter((item) =>
        !normalizedSearch
          ? true
          : [item.restaurant.name, item.restaurant.slug, item.restaurant.plan, item.status]
              .filter(Boolean)
              .some((value) => String(value).toLocaleLowerCase('pt-BR').includes(normalizedSearch)),
      ),
    [normalizedSearch, queue.implementations],
  );
  const requests = useMemo(
    () =>
      queue.requests.filter((item) =>
        !normalizedSearch
          ? true
          : [item.restaurant?.name, item.title, item.category, item.status, item.requestedBy?.name]
              .filter(Boolean)
              .some((value) => String(value).toLocaleLowerCase('pt-BR').includes(normalizedSearch)),
      ),
    [normalizedSearch, queue.requests],
  );

  const pendingImplementations = queue.implementations.filter(
    (item) => !['CONCLUIDA', 'CANCELADA'].includes(item.status),
  ).length;
  const openRequests = queue.requests.filter(
    (item) => !['CONCLUIDA', 'CANCELADA'].includes(item.status),
  ).length;

  async function updateImplementation(item: Implementation, status: string) {
    const key = `implementation:${item.id}`;
    setBusy(key);
    setError('');
    try {
      await superAdminService.updateImplementation(item.restaurantId, {
        status,
        notes: notes[item.id] ?? item.notes ?? null,
      });
      await load();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy('');
    }
  }

  async function updateRequest(item: ManagedRequest, status: string) {
    const key = `request:${item.id}`;
    setBusy(key);
    setError('');
    try {
      await superAdminService.updateManagedRequest(item.id, {
        status,
        response: responses[item.id] ?? item.response ?? null,
      });
      await load();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy('');
    }
  }

  return (
    <S.Page>
      <S.Metrics>
        <article>
          <span><Store aria-hidden="true" /></span>
          <div><small>IMPLANTAÇÕES ABERTAS</small><strong>{pendingImplementations}</strong></div>
        </article>
        <article>
          <span><Wrench aria-hidden="true" /></span>
          <div><small>ATUALIZAÇÕES PENDENTES</small><strong>{openRequests}</strong></div>
        </article>
        <article>
          <span><CheckCircle2 aria-hidden="true" /></span>
          <div><small>IMPLANTAÇÕES CONCLUÍDAS</small><strong>{queue.implementations.filter((item) => item.status === 'CONCLUIDA').length}</strong></div>
        </article>
      </S.Metrics>

      <S.Toolbar>
        <div className="tabs">
          <button type="button" className={tab === 'implementations' ? 'active' : ''} onClick={() => setTab('implementations')}>
            <ClipboardList aria-hidden="true" /> Implantações <span>{queue.implementations.length}</span>
          </button>
          <button type="button" className={tab === 'requests' ? 'active' : ''} onClick={() => setTab('requests')}>
            <Wrench aria-hidden="true" /> Solicitações <span>{queue.requests.length}</span>
          </button>
        </div>
        <label>
          <Search aria-hidden="true" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar restaurante ou solicitação" />
        </label>
        <button type="button" className="refresh" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={loading ? 'spin' : undefined} aria-hidden="true" /> Atualizar
        </button>
      </S.Toolbar>

      {error ? <S.Alert role="alert">{error}</S.Alert> : null}

      {loading && !queue.implementations.length && !queue.requests.length ? (
        <S.Empty role="status"><Loader2 className="spin" /><strong>Carregando fila...</strong></S.Empty>
      ) : tab === 'implementations' ? (
        <S.List>
          {implementations.map((item) => {
            const busyKey = `implementation:${item.id}`;
            return (
              <S.Card key={item.id}>
                <S.CardHead>
                  <div className="identity">
                    <span className="store"><Store aria-hidden="true" /></span>
                    <div>
                      <h3>{item.restaurant.name}</h3>
                      <p>
                        #{item.restaurant.id} •{' '}
                        {item.restaurant.plan === 'GESTAO_TOTAL'
                          ? 'Gestão Total'
                          : item.restaurant.plan === 'PREMIUM'
                            ? 'Premium'
                            : item.restaurant.plan === 'BASICO'
                              ? 'Básico'
                              : item.restaurant.plan || 'Plano não identificado'}{' '}
                        • {item.restaurant.slug}
                      </p>
                    </div>
                  </div>
                  <S.Status data-status={item.status}>
                    {implementationStatuses.find(([value]) => value === item.status)?.[1] || item.status}
                  </S.Status>
                </S.CardHead>
                <S.Stats>
                  <span><b>{item.restaurant.productsCount}</b> produtos</span>
                  <span><b>{item.restaurant.categoriesCount}</b> categorias</span>
                  <span>
                    <b>{item.productLimit == null ? 'Ilimitado' : item.productLimit}</b> limite inicial
                  </span>
                  <span>Atualizado {dateTime(item.updatedAt)}</span>
                </S.Stats>
                <label className="notes">
                  Observações da implantação
                  <textarea
                    rows={3}
                    maxLength={2000}
                    value={notes[item.id] ?? item.notes ?? ''}
                    onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))}
                    placeholder="Pendências, material recebido, revisão solicitada..."
                  />
                </label>
                <S.Actions>
                  <select
                    aria-label={`Status da implantação de ${item.restaurant.name}`}
                    value={item.status}
                    disabled={busy === busyKey}
                    onChange={(event) => void updateImplementation(item, event.target.value)}
                  >
                    {implementationStatuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setWorkspaceRestaurantId(item.restaurantId)}
                  >
                    <Wrench /> Gerenciar restaurante
                  </button>
                  <button
                    type="button"
                    disabled={busy === busyKey}
                    onClick={() => void updateImplementation(item, item.status)}
                  >
                    {busy === busyKey ? <Loader2 className="spin" /> : <CheckCircle2 />}
                    Salvar observações
                  </button>
                </S.Actions>
              </S.Card>
            );
          })}
          {!implementations.length ? <S.Empty><Clock3 /><strong>Nenhuma implantação encontrada</strong></S.Empty> : null}
        </S.List>
      ) : (
        <S.List>
          {requests.map((item) => {
            const busyKey = `request:${item.id}`;
            return (
              <S.Card key={item.id}>
                <S.CardHead>
                  <div>
                    <small>{categoryLabels[item.category] || item.category}</small>
                    <h3>{item.title}</h3>
                    <p>{item.restaurant?.name || `Restaurante #${item.restaurantId}`} • solicitado por {item.requestedBy?.name || 'ADMIN'} • {dateTime(item.createdAt)}</p>
                  </div>
                  <S.Status data-status={item.status}>
                    {requestStatuses.find(([value]) => value === item.status)?.[1] || item.status}
                  </S.Status>
                </S.CardHead>
                <S.Description>{item.description}</S.Description>
                <label className="notes">
                  Retorno para o restaurante
                  <small>
                    Não inclua senhas, tokens, chaves de API, dados bancários ou credenciais.
                  </small>
                  <textarea
                    rows={3}
                    maxLength={2000}
                    value={responses[item.id] ?? item.response ?? ''}
                    onChange={(event) => setResponses((current) => ({ ...current, [item.id]: event.target.value }))}
                    placeholder="Informe o que foi alterado ou o que ainda precisa ser enviado pelo restaurante."
                  />
                </label>
                <S.Actions>
                  <select
                    aria-label={`Status da solicitação ${item.title}`}
                    value={item.status}
                    disabled={busy === busyKey}
                    onChange={(event) => void updateRequest(item, event.target.value)}
                  >
                    {requestStatuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setWorkspaceRestaurantId(item.restaurantId)}
                  >
                    <Wrench /> Executar alteração
                  </button>
                  <button
                    type="button"
                    disabled={busy === busyKey}
                    onClick={() => void updateRequest(item, item.status)}
                  >
                    {busy === busyKey ? <Loader2 className="spin" /> : <CheckCircle2 />}
                    Salvar retorno
                  </button>
                </S.Actions>
              </S.Card>
            );
          })}
          {!requests.length ? <S.Empty><Clock3 /><strong>Nenhuma solicitação encontrada</strong></S.Empty> : null}
        </S.List>
      )}
      {workspaceRestaurantId ? (
        <ManagedRestaurantWorkspace
          restaurantId={workspaceRestaurantId}
          onClose={() => {
            setWorkspaceRestaurantId(null);
            void load();
          }}
        />
      ) : null}
    </S.Page>
  );
}
