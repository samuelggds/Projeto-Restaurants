import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  CheckCircle2,
  Clock3,
  Crown,
  Loader2,
  MessageSquarePlus,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import api from '../../../Services/api';
import * as S from './ManagedServiceArea.styles';

type ManagedRequest = {
  id: string;
  category: string;
  title: string;
  description: string;
  status: string;
  response?: string | null;
  createdAt: string;
  updatedAt: string;
};

type ManagedOverview = {
  plan: string | null;
  subscriptionStatus: string | null;
  implementationEligible: boolean;
  continuousManagementEnabled: boolean;
  implementation: {
    status: string;
    productLimit: number | null;
    notes?: string | null;
    startedAt?: string | null;
    completedAt?: string | null;
  } | null;
  requests: ManagedRequest[];
};

const categories = [
  ['PRODUTO', 'Produto'],
  ['PRECO', 'Preço'],
  ['CATEGORIA', 'Categoria'],
  ['COMBO', 'Combo'],
  ['BANNER', 'Banner'],
  ['APARENCIA', 'Aparência'],
  ['CONFIGURACAO', 'Configuração'],
  ['OUTRO', 'Outro'],
] as const;

const requestStatus: Record<string, string> = {
  ABERTA: 'Aberta',
  EM_ANALISE: 'Em análise',
  EM_EXECUCAO: 'Em execução',
  AGUARDANDO_CLIENTE: 'Aguardando você',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
};

const implementationStatus: Record<string, string> = {
  AGUARDANDO_MATERIAL: 'Aguardando material',
  EM_IMPLANTACAO: 'Em implantação',
  AGUARDANDO_CLIENTE: 'Aguardando restaurante',
  EM_REVISAO: 'Em revisão',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
};

function dateTime(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
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
    'Não foi possível concluir a solicitação.'
  );
}

export default function ManagedServiceArea() {
  const [data, setData] = useState<ManagedOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    category: 'PRODUTO',
    title: '',
    description: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get<ManagedOverview>('/managed-service');
      setData(response.data);
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

  const planName = useMemo(() => {
    if (data?.plan === 'GESTAO_TOTAL') return 'Gestão Total';
    if (data?.plan === 'PREMIUM') return 'Premium';
    if (data?.plan === 'BASICO') return 'Básico';
    return data?.plan || 'Não identificado';
  }, [data?.plan]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data?.continuousManagementEnabled || submitting) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await api.post('/managed-service/requests', {
        category: form.category,
        title: form.title.trim(),
        description: form.description.trim(),
      });
      setForm({ category: 'PRODUTO', title: '', description: '' });
      setSuccess('Solicitação enviada para a equipe GastroNexa.');
      await load();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && !data) {
    return (
      <S.State role="status">
        <Loader2 className="spin" aria-hidden="true" />
        <strong>Carregando seu serviço assistido...</strong>
      </S.State>
    );
  }

  return (
    <S.Shell>
      <S.Hero>
        <span className="icon" aria-hidden="true">
          <Crown />
        </span>
        <div>
          <small>SERVIÇO GASTRONEXA</small>
          <h2>{data?.continuousManagementEnabled ? 'Gestão assistida contínua' : 'Implantação assistida'}</h2>
          <p>
            Plano atual: <strong>{planName}</strong>
          </p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={loading ? 'spin' : undefined} aria-hidden="true" />
          Atualizar
        </button>
      </S.Hero>

      {error ? <S.Alert $error role="alert">{error}</S.Alert> : null}
      {success ? <S.Alert role="status">{success}</S.Alert> : null}

      {data?.implementationEligible ? (
        <S.Implementation>
          <div className="head">
            <span><ShieldCheck aria-hidden="true" /> Implantação inicial</span>
            <b>{implementationStatus[data.implementation?.status || ''] || 'Preparando implantação'}</b>
          </div>
          <p>
            A equipe GastroNexa organiza a configuração inicial do restaurante. No Premium, esse
            serviço acontece uma única vez; no Gestão Total, a gestão pode continuar por solicitações.
          </p>
          {data.implementation ? (
            <div className="meta">
              <span>
                {data.implementation.productLimit == null
                  ? 'Produtos ilimitados na implantação inicial'
                  : `Até ${data.implementation.productLimit} produtos na implantação inicial`}
              </span>
              {data.implementation.startedAt ? <span>Iniciada em {dateTime(data.implementation.startedAt)}</span> : null}
              {data.implementation.completedAt ? <span>Concluída em {dateTime(data.implementation.completedAt)}</span> : null}
            </div>
          ) : null}
          {data.implementation?.notes ? <blockquote>{data.implementation.notes}</blockquote> : null}
        </S.Implementation>
      ) : (
        <S.Upgrade>
          <ShieldCheck aria-hidden="true" />
          <div>
            <strong>Implantação assistida disponível a partir do Premium</strong>
            <p>No Básico, o próprio restaurante configura e mantém seu cardápio.</p>
          </div>
        </S.Upgrade>
      )}

      {data?.continuousManagementEnabled ? (
        <S.RequestGrid>
          <S.RequestForm onSubmit={submit}>
            <span className="eyebrow"><MessageSquarePlus aria-hidden="true" /> NOVA SOLICITAÇÃO</span>
            <h3>O que você precisa atualizar?</h3>
            <p>
              Envie a alteração com os dados exatos. A equipe executa a solicitação dentro do seu
              restaurante sem acessar sua senha.
            </p>
            <p>
              Nunca envie senhas, tokens, chaves de API, dados bancários ou credenciais de pagamento.
            </p>
            <label>
              Tipo de alteração
              <select
                value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
              >
                {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label>
              Título
              <input
                value={form.title}
                minLength={3}
                maxLength={160}
                required
                placeholder="Ex.: Atualizar preço das pizzas grandes"
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              />
            </label>
            <label>
              Detalhes da alteração
              <textarea
                value={form.description}
                minLength={10}
                maxLength={2000}
                required
                rows={6}
                placeholder="Informe produtos, preços, categorias e qualquer detalhe necessário."
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              />
            </label>
            <button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="spin" aria-hidden="true" /> : <MessageSquarePlus aria-hidden="true" />}
              {submitting ? 'Enviando...' : 'Enviar solicitação'}
            </button>
          </S.RequestForm>

          <S.History>
            <div className="history-head">
              <div>
                <small>HISTÓRICO</small>
                <h3>Suas solicitações</h3>
              </div>
              <span>{data.requests.length}</span>
            </div>
            {data.requests.length ? data.requests.map((request) => (
              <article key={request.id}>
                <div className="request-head">
                  <b>{request.title}</b>
                  <span data-status={request.status}>
                    {requestStatus[request.status] || request.status}
                  </span>
                </div>
                <small>{categories.find(([value]) => value === request.category)?.[1] || request.category} • {dateTime(request.createdAt)}</small>
                <p>{request.description}</p>
                {request.response ? <blockquote><strong>Retorno GastroNexa</strong>{request.response}</blockquote> : null}
              </article>
            )) : (
              <div className="empty">
                <Clock3 aria-hidden="true" />
                <strong>Nenhuma solicitação ainda</strong>
                <p>Quando precisar de uma atualização, ela aparecerá aqui.</p>
              </div>
            )}
          </S.History>
        </S.RequestGrid>
      ) : data?.plan === 'PREMIUM' ? (
        <S.PremiumNote>
          <CheckCircle2 aria-hidden="true" />
          <div>
            <strong>Seu Premium inclui a implantação inicial</strong>
            <p>
              Depois da conclusão, as alterações do dia a dia ficam com o administrador do
              restaurante. Para gestão contínua pela equipe GastroNexa, o plano Gestão Total oferece
              solicitações sob demanda.
            </p>
          </div>
        </S.PremiumNote>
      ) : null}
    </S.Shell>
  );
}
