import { Bot, CheckCircle2, CircleAlert, LoaderCircle, MessageCircle, QrCode, RefreshCw, Send, Unplug, UserRoundCheck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import salesLeadsService from '../../../Services/salesLeadsService';
import { formatDate, requestErrorMessage } from '../domain/superAdminDomain';
import type {
  CommercialWhatsappConnection,
  CommercialWhatsappConversation,
  CommercialWhatsappDay,
  CommercialWhatsappSettings,
} from '../commercialWhatsappTypes';
import * as S from '../SuperAdmin.styles';
import * as L from '../SalesLeads.styles';

const weekdayLabels = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

function connectionLabel(status: string) {
  if (status === 'CONNECTED') return 'Conectado';
  if (status === 'PENDING') return 'Aguardando conexão';
  if (status === 'DISCONNECTED') return 'Desconectado';
  if (status === 'ERROR') return 'Erro de conexão';
  return 'Não configurado';
}

export function CommercialWhatsappPanel({ refreshKey = 0 }: { refreshKey?: number }) {
  const [settings, setSettings] = useState<CommercialWhatsappSettings | null>(null);
  const [connection, setConnection] = useState<CommercialWhatsappConnection | null>(null);
  const [conversations, setConversations] = useState<CommercialWhatsappConversation[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const selected = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [settingsResult, connectionResult, conversationsResult] = await Promise.all([
        salesLeadsService.getCommercialWhatsappSettings(),
        salesLeadsService.getCommercialWhatsappConnection(),
        salesLeadsService.listCommercialWhatsappConversations(),
      ]);
      setSettings(settingsResult);
      let resolvedConnection = connectionResult;
      if (connectionResult.configured) {
        try {
          resolvedConnection = await salesLeadsService.refreshCommercialWhatsapp();
        } catch {
          // Mantém o último estado conhecido caso a Evolution esteja temporariamente indisponível.
        }
      }
      setConnection(resolvedConnection);
      setConversations(conversationsResult);
      setSelectedId((current) =>
        current && conversationsResult.some((item) => item.id === current)
          ? current
          : conversationsResult[0]?.id ?? '',
      );
    } catch (requestError) {
      setError(
        requestErrorMessage(
          requestError,
          'Não foi possível carregar a configuração do WhatsApp comercial.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load, refreshKey]);

  useEffect(() => {
    if (!connection?.configured || connection.status === 'CONNECTED') return;
    const timer = window.setInterval(() => {
      void salesLeadsService
        .refreshCommercialWhatsapp()
        .then((result) => setConnection(result))
        .catch(() => undefined);
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [connection?.configured, connection?.status]);

  const setDay = (weekday: number, updater: (day: CommercialWhatsappDay) => CommercialWhatsappDay) => {
    setSettings((current) =>
      current
        ? {
            ...current,
            hours: current.hours.map((day) => (day.weekday === weekday ? updater(day) : day)),
          }
        : current,
    );
    setSuccess('');
  };

  const saveSettings = async () => {
    if (!settings) return;
    setBusy('settings');
    setError('');
    setSuccess('');
    try {
      const updated = await salesLeadsService.updateCommercialWhatsappSettings({
        enabled: settings.enabled,
        hours: settings.hours,
        awayMessage: settings.awayMessage,
      });
      setSettings(updated);
      setSuccess('Horários e automação salvos.');
    } catch (requestError) {
      setError(requestErrorMessage(requestError, 'Não foi possível salvar a configuração.'));
    } finally {
      setBusy('');
    }
  };

  const connect = async () => {
    setBusy('connection');
    setError('');
    setSuccess('');
    try {
      await salesLeadsService.connectCommercialWhatsapp();
      const result = await salesLeadsService.getCommercialWhatsappQrCode();
      setConnection(result);
      setSuccess('QR Code gerado. Escaneie com o WhatsApp Business da GastroNexa.');
    } catch (requestError) {
      setError(requestErrorMessage(requestError, 'Não foi possível iniciar a conexão.'));
    } finally {
      setBusy('');
    }
  };

  const refreshConnection = async () => {
    setBusy('refresh');
    setError('');
    try {
      setConnection(await salesLeadsService.refreshCommercialWhatsapp());
    } catch (requestError) {
      setError(requestErrorMessage(requestError, 'Não foi possível atualizar o status.'));
    } finally {
      setBusy('');
    }
  };

  const disconnect = async () => {
    setBusy('disconnect');
    setError('');
    setSuccess('');
    try {
      setConnection(await salesLeadsService.disconnectCommercialWhatsapp());
      setSuccess('WhatsApp comercial desconectado.');
    } catch (requestError) {
      setError(requestErrorMessage(requestError, 'Não foi possível desconectar o WhatsApp.'));
    } finally {
      setBusy('');
    }
  };

  const changeMode = async (mode: 'BOT' | 'HUMAN') => {
    if (!selected) return;
    setBusy('mode');
    setError('');
    try {
      await salesLeadsService.setCommercialWhatsappMode(selected.id, mode);
      await load();
    } catch (requestError) {
      setError(requestErrorMessage(requestError, 'Não foi possível alterar o modo de atendimento.'));
    } finally {
      setBusy('');
    }
  };

  const sendMessage = async () => {
    if (!selected || !draft.trim()) return;
    setBusy('send');
    setError('');
    try {
      await salesLeadsService.sendCommercialWhatsappMessage(selected.id, draft.trim());
      setDraft('');
      setSuccess('Mensagem enviada para o cliente.');
      window.setTimeout(() => void load(), 800);
    } catch (requestError) {
      setError(requestErrorMessage(requestError, 'Não foi possível enviar a mensagem.'));
    } finally {
      setBusy('');
    }
  };

  if (loading && !settings) {
    return (
      <S.EmptyState role="status">
        <LoaderCircle aria-hidden="true" />
        <h3>Carregando WhatsApp comercial…</h3>
      </S.EmptyState>
    );
  }

  if (!settings || !connection) {
    return error ? <S.InlineAlert $tone="error">{error}</S.InlineAlert> : null;
  }

  return (
    <L.WhatsappPanel aria-label="WhatsApp comercial da GastroNexa">
      <S.SectionHeading>
        <div>
          <h2>WhatsApp comercial da GastroNexa</h2>
          <p>
            Use uma instância exclusiva da plataforma. Ela não interfere nos números conectados pelos
            estabelecimentos.
          </p>
        </div>
        <S.ActionGroup>
          <S.Button type="button" disabled={Boolean(busy)} onClick={() => void refreshConnection()}>
            <RefreshCw size={15} aria-hidden="true" /> Atualizar status
          </S.Button>
        </S.ActionGroup>
      </S.SectionHeading>

      {error ? <S.InlineAlert $tone="error" role="alert">{error}</S.InlineAlert> : null}
      {success ? <S.InlineAlert $tone="success" role="status">{success}</S.InlineAlert> : null}

      <L.WhatsappGrid>
        <S.FormCard>
          <header>
            <div>
              <h2>Conexão</h2>
              <p>Evolution API · instância exclusiva <b>gastronexa-platform</b>.</p>
            </div>
          </header>
          <L.ConnectionState $connected={connection.status === 'CONNECTED'}>
            <MessageCircle aria-hidden="true" />
            <span>
              <small>Status da conexão</small>
              <strong>{connectionLabel(connection.status)}</strong>
              {connection.phone ? <em>{connection.phone}</em> : null}
            </span>
          </L.ConnectionState>

          <L.ConnectionNotice $connected={connection.status === 'CONNECTED'} role="status">
            {connection.status === 'CONNECTED' ? (
              <CheckCircle2 aria-hidden="true" />
            ) : (
              <CircleAlert aria-hidden="true" />
            )}
            <div>
              <strong>
                {connection.status === 'CONNECTED'
                  ? 'WhatsApp conectado e pronto para atender'
                  : 'WhatsApp não está conectado'}
              </strong>
              <span>
                {connection.status === 'CONNECTED'
                  ? 'As mensagens automáticas e as respostas manuais podem ser enviadas normalmente.'
                  : 'Conecte ou atualize o status para liberar o atendimento e os envios automáticos.'}
              </span>
            </div>
          </L.ConnectionNotice>

          {connection.qrCode ? (
            <L.QrBox>
              <img src={connection.qrCode} alt="QR Code para conectar o WhatsApp Business da GastroNexa" />
              <p>No WhatsApp Business: Dispositivos conectados → Conectar dispositivo.</p>
            </L.QrBox>
          ) : null}

          <S.ActionGroup>
            {connection.status !== 'CONNECTED' ? (
              <S.Button
                type="button"
                $variant="primary"
                disabled={Boolean(busy)}
                onClick={() => void connect()}
              >
                <QrCode size={16} aria-hidden="true" /> Conectar WhatsApp Business
              </S.Button>
            ) : null}
            {connection.configured ? (
              <S.Button type="button" disabled={Boolean(busy)} onClick={() => void disconnect()}>
                <Unplug size={16} aria-hidden="true" /> Desconectar
              </S.Button>
            ) : null}
          </S.ActionGroup>
        </S.FormCard>

        <S.FormCard>
          <header>
            <div>
              <h2>Automação e mensagem fora do horário</h2>
              <p>O atendimento usa o fuso <b>{settings.timezone}</b>.</p>
            </div>
          </header>
          <div className="line">
            <span>
              <strong>Respostas automáticas</strong>
              <small>Ativa o bot comercial e o contato automático de leads autorizados.</small>
            </span>
            <S.Switch
              type="button"
              role="switch"
              aria-checked={settings.enabled}
              $on={settings.enabled}
              onClick={() => {
                setSettings((current) => current ? { ...current, enabled: !current.enabled } : current);
                setSuccess('');
              }}
            />
          </div>
          <label>
            Mensagem fora do horário
            <textarea
              rows={6}
              maxLength={1000}
              value={settings.awayMessage}
              onChange={(event) => {
                setSettings((current) =>
                  current ? { ...current, awayMessage: event.target.value } : current,
                );
                setSuccess('');
              }}
            />
            <small>É enviada com proteção anti-spam; não será repetida a cada mensagem do cliente.</small>
          </label>
          <S.Button
            type="button"
            $variant="primary"
            disabled={busy === 'settings'}
            onClick={() => void saveSettings()}
          >
            Salvar automação
          </S.Button>
        </S.FormCard>
      </L.WhatsappGrid>

      <S.FormCard>
        <header>
          <div>
            <h2>Horários de atendimento humano</h2>
            <p>Configure até dois períodos por dia, por exemplo manhã e tarde.</p>
          </div>
        </header>
        <L.ScheduleList>
          {settings.hours.map((day) => (
            <div
              className={`schedule-day ${day.enabled ? 'is-enabled' : 'is-disabled'}`}
              key={day.weekday}
            >
              <div className="day-summary">
                <div>
                  <strong>{weekdayLabels[day.weekday]}</strong>
                  <small>{day.enabled ? 'Atendimento ativo' : 'Sem atendimento'}</small>
                </div>
                <label className="day-switch">
                  <span>{day.enabled ? 'Aberto' : 'Fechado'}</span>
                  <input
                    type="checkbox"
                    checked={day.enabled}
                    aria-label={`Ativar atendimento na ${weekdayLabels[day.weekday]}`}
                    onChange={(event) =>
                      setDay(day.weekday, (current) => ({
                        ...current,
                        enabled: event.target.checked,
                      }))
                    }
                  />
                </label>
              </div>

              <div className="periods">
                {day.periods.map((period, index) => (
                  <div className={`period ${period.enabled ? 'is-enabled' : 'is-disabled'}`} key={index}>
                    <label className="period-toggle">
                      <input
                        type="checkbox"
                        checked={period.enabled}
                        disabled={!day.enabled}
                        aria-label={`Ativar período ${index + 1} de ${weekdayLabels[day.weekday]}`}
                        onChange={(event) =>
                          setDay(day.weekday, (current) => ({
                            ...current,
                            periods: current.periods.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, enabled: event.target.checked } : item,
                            ) as CommercialWhatsappDay['periods'],
                          }))
                        }
                      />
                      <span>
                        <strong>Período {index + 1}</strong>
                        <small>{index === 0 ? 'Primeiro horário' : 'Segundo horário'}</small>
                      </span>
                    </label>

                    <div className="time-range">
                      <label>
                        <span>Início</span>
                        <input
                          type="time"
                          value={period.start}
                          disabled={!day.enabled || !period.enabled}
                          onChange={(event) =>
                            setDay(day.weekday, (current) => ({
                              ...current,
                              periods: current.periods.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, start: event.target.value } : item,
                              ) as CommercialWhatsappDay['periods'],
                            }))
                          }
                        />
                      </label>
                      <span className="range-separator" aria-hidden="true">—</span>
                      <label>
                        <span>Fim</span>
                        <input
                          type="time"
                          value={period.end}
                          disabled={!day.enabled || !period.enabled}
                          onChange={(event) =>
                            setDay(day.weekday, (current) => ({
                              ...current,
                              periods: current.periods.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, end: event.target.value } : item,
                              ) as CommercialWhatsappDay['periods'],
                            }))
                          }
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </L.ScheduleList>
        <S.Button
          type="button"
          $variant="primary"
          disabled={busy === 'settings'}
          onClick={() => void saveSettings()}
        >
          Salvar horários
        </S.Button>
      </S.FormCard>

      <S.FormCard>
        <L.ConversationSectionHeader>
          <div>
            <span className="eyebrow">Atendimento comercial</span>
            <h2>Conversas do WhatsApp</h2>
            <p>Selecione um cliente, acompanhe o histórico e assuma a conversa quando precisar responder pessoalmente.</p>
          </div>
          <span className="conversation-count">
            {conversations.length} {conversations.length === 1 ? 'conversa' : 'conversas'}
          </span>
        </L.ConversationSectionHeader>
        <L.ConversationLayout>
          <nav aria-label="Conversas comerciais">
            {conversations.length ? (
              conversations.map((conversation) => (
                <button
                  type="button"
                  key={conversation.id}
                  className={selectedId === conversation.id ? 'active' : ''}
                  onClick={() => setSelectedId(conversation.id)}
                >
                  <span className="conversation-avatar" aria-hidden="true">
                    <MessageCircle size={16} />
                  </span>
                  <span className="conversation-copy">
                    <strong>{conversation.phone}</strong>
                    <small>
                      {conversation.automationMode === 'HUMAN' ? 'Atendimento humano' : 'Automático'}
                    </small>
                    <time>{formatDate(conversation.lastInboundAt || conversation.lastOutboundAt, true)}</time>
                  </span>
                </button>
              ))
            ) : (
              <p>Nenhuma conversa recebida ainda.</p>
            )}
          </nav>

          {selected ? (
            <section>
              <L.ConversationToolbar>
                <span>
                  <small>Cliente</small>
                  <strong>{selected.phone}</strong>
                  <em className={selected.automationMode === 'HUMAN' ? 'mode-human' : 'mode-bot'}>
                    {selected.automationMode === 'HUMAN' ? 'Atendimento humano ativo' : 'Automação ativa'}
                  </em>
                </span>
                {selected.automationMode === 'HUMAN' ? (
                  <S.Button type="button" disabled={Boolean(busy)} onClick={() => void changeMode('BOT')}>
                    <Bot size={15} aria-hidden="true" /> Devolver para automação
                  </S.Button>
                ) : (
                  <S.Button type="button" $variant="primary" disabled={Boolean(busy)} onClick={() => void changeMode('HUMAN')}>
                    <UserRoundCheck size={15} aria-hidden="true" /> Assumir atendimento
                  </S.Button>
                )}
              </L.ConversationToolbar>
              <L.MessageList>
                {selected.messages.length ? selected.messages.map((message) => (
                  <div key={message.id} className={message.direction === 'INBOUND' ? 'inbound' : 'outbound'}>
                    <small>{message.direction === 'INBOUND' ? 'Cliente' : 'GastroNexa'} · {formatDate(message.createdAt, true)}</small>
                    <p>{message.body}</p>
                  </div>
                )) : <p>Nenhuma mensagem registrada.</p>}
              </L.MessageList>
              <L.ReplyBox>
                <div className="reply-copy">
                  <strong>Responder cliente</strong>
                  <small>A mensagem será enviada pelo WhatsApp comercial conectado.</small>
                </div>
                <textarea
                  rows={3}
                  maxLength={4000}
                  placeholder="Escreva a resposta da GastroNexa…"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                />
                <S.Button
                  type="button"
                  $variant="primary"
                  disabled={busy === 'send' || !draft.trim()}
                  onClick={() => void sendMessage()}
                >
                  <Send size={15} aria-hidden="true" /> Enviar
                </S.Button>
              </L.ReplyBox>
            </section>
          ) : null}
        </L.ConversationLayout>
      </S.FormCard>
    </L.WhatsappPanel>
  );
}
