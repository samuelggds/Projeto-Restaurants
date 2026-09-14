import { CheckCircle2, Headphones, RefreshCw, Send } from 'lucide-react';
import { type FormEvent, useState, useEffect, useMemo, useCallback } from 'react';
import { useOrderHistory } from '../../../hooks/useOrderHistory';
import { OrderHistoryPagination } from '../../../components/OrderHistoryPagination';
import { toast } from 'react-toastify';
import {
  useOperationServices,
  type OperationServices,
  type OperationSupportHistory,
} from './services';
import { type Raw, type SupportThread } from './types';
import { asRecord, statusText, errorMessage } from './format';
import { Panel, PanelHead, TextButton } from './shared.styles';
import { SupportLayout, SupportList, Chat, Bubble, Resolved, Composer } from './Support.styles';
import { EmptyState } from './EmptyState';

export function Support() {
  const services = useOperationServices();
  return services.supportHistory ? (
    <SupportContent services={services} history={services.supportHistory} />
  ) : (
    <ConnectedSupport services={services} />
  );
}

function ConnectedSupport({ services }: { services: OperationServices }) {
  const [refreshSignal, setRefreshSignal] = useState<unknown[]>([]);
  const history = useOrderHistory({
    query: { queue: 'ALL', issueState: 'RESOLVED' },
    refreshSignal,
  });
  return <SupportContent services={services} history={history} onOrdersLoaded={setRefreshSignal} />;
}

function SupportContent({
  services,
  history,
  onOrdersLoaded,
}: {
  services: OperationServices;
  history: OperationSupportHistory;
  onOrdersLoaded?: (orders: unknown[]) => void;
}) {
  const [orders, setOrders] = useState<Raw[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [thread, setThread] = useState<SupportThread | null>(null);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await services.listOpenOrderIssues();
      const loaded = Array.isArray(data) ? (data as Raw[]) : [];
      setOrders(loaded);
      onOrdersLoaded?.(loaded);
    } catch {
      toast.error('Não foi possível atualizar os atendimentos.');
    }
  }, [services, onOrdersLoaded]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void load();
    });
    return () => {
      active = false;
    };
  }, [load]);

  const conversations = useMemo(
    () =>
      [...orders, ...(history.orders as Raw[])].flatMap((order) => {
        const issue = asRecord(order.issueThread);
        if (!Object.keys(issue).length) return [];
        const messages = Array.isArray(issue.messages) ? issue.messages : [];
        const last = messages.length ? asRecord(messages[messages.length - 1]) : {};
        const orderId = Number(order.id || issue.orderId);
        if (!Number.isSafeInteger(orderId) || orderId <= 0) return [];
        return [
          {
            orderId,
            customer: String(asRecord(order.user).name || issue.customerName || 'Cliente'),
            lastMessage: String(last.message || 'Atendimento iniciado'),
            resolved: Boolean(issue.isResolved),
          },
        ];
      }),
    [orders, history.orders],
  );

  async function open(orderId: number) {
    setSelected(orderId);
    setLoading(true);
    try {
      const data = await services.getIssueThread(orderId);
      setThread({
        orderId,
        customerName: String(data?.customerName || 'Cliente'),
        orderStatus: String(data?.orderStatus || ''),
        isResolved: Boolean(data?.isResolved),
        messages: Array.isArray(data?.messages) ? data.messages : [],
      });
    } catch (error) {
      toast.error(errorMessage(error, 'Não foi possível abrir este atendimento.'));
    } finally {
      setLoading(false);
    }
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!selected || !draft.trim()) return;
    try {
      const data = await services.replyIssue(selected, draft.trim());
      setDraft('');
      setThread((current) =>
        current
          ? {
              ...current,
              messages: Array.isArray(data?.messages) ? data.messages : current.messages,
            }
          : current,
      );
      await load();
    } catch (error) {
      toast.error(errorMessage(error, 'Não foi possível responder.'));
    }
  }

  async function resolve() {
    if (!selected) return;
    try {
      await services.resolveIssue(selected);
      setThread((current) => (current ? { ...current, isResolved: true } : current));
      toast.success('Atendimento encerrado.');
      await load();
    } catch (error) {
      toast.error(errorMessage(error, 'Não foi possível encerrar o atendimento.'));
    }
  }

  return (
    <SupportLayout>
      <Panel>
        <PanelHead>
          <div>
            <Headphones />
            <span>
              <strong>Conversas dos pedidos</strong>
              <small>
                {conversations.filter((item) => !item.resolved).length} aguardando solução
              </small>
            </span>
          </div>
          <TextButton type="button" onClick={() => void load()}>
            <RefreshCw /> Atualizar
          </TextButton>
        </PanelHead>
        <SupportList>
          {conversations.map((item) => (
            <button
              type="button"
              key={item.orderId}
              className={selected === item.orderId ? 'active' : ''}
              onClick={() => void open(item.orderId)}
            >
              <span>
                <b>
                  Pedido #{item.orderId} · {item.customer}
                </b>
                <small>{item.lastMessage}</small>
              </span>
              <em>{item.resolved ? 'Resolvido' : 'Aberto'}</em>
            </button>
          ))}
          {!conversations.length && (
            <EmptyState
              icon={CheckCircle2}
              title="Nenhum atendimento aberto"
              text="Quando um cliente pedir ajuda pelo pedido, a conversa aparece aqui."
            />
          )}
        </SupportList>
        <OrderHistoryPagination {...history} />
      </Panel>
      <Panel>
        {selected ? (
          <>
            <PanelHead>
              <div>
                <Headphones />
                <span>
                  <strong>Pedido #{selected}</strong>
                  <small>
                    {thread?.customerName || 'Cliente'} ·{' '}
                    {thread?.orderStatus ? statusText(thread.orderStatus) : 'Carregando'}
                  </small>
                </span>
              </div>
              {thread && !thread.isResolved && (
                <TextButton type="button" onClick={() => void resolve()}>
                  <CheckCircle2 /> Resolver
                </TextButton>
              )}
            </PanelHead>
            <Chat>
              {loading ? (
                <EmptyState
                  icon={RefreshCw}
                  title="Carregando conversa..."
                  text="Buscando as mensagens."
                />
              ) : (
                <>
                  {thread?.messages.map((message, index) => {
                    const staff = String(message.senderType || '').toUpperCase() === 'ADMIN';
                    return (
                      <Bubble key={String(message.id || index)} $staff={staff}>
                        <b>{staff ? 'Restaurante' : message.senderName || 'Cliente'}</b>
                        <p>{message.message}</p>
                        {message.sentAt ? (
                          <time>{new Date(message.sentAt).toLocaleString('pt-BR')}</time>
                        ) : null}
                      </Bubble>
                    );
                  })}
                  {thread?.isResolved && (
                    <Resolved>
                      <CheckCircle2 /> Atendimento resolvido
                    </Resolved>
                  )}
                </>
              )}
            </Chat>
            {thread && !thread.isResolved && (
              <Composer onSubmit={send}>
                <textarea
                  aria-label="Responder cliente"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value.slice(0, 600))}
                  placeholder="Escreva uma resposta curta e clara..."
                />
                <button type="submit" disabled={!draft.trim()} aria-label="Enviar resposta">
                  <Send />
                </button>
              </Composer>
            )}
          </>
        ) : (
          <EmptyState
            icon={Headphones}
            title="Escolha um atendimento"
            text="Você verá a conversa e a situação do pedido deste lado."
          />
        )}
      </Panel>
    </SupportLayout>
  );
}
