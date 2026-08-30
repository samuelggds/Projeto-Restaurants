import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, ShieldCheck, WalletCards } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAppDialog } from '../../../components/AppDialog/context';
import tableAccountService from '../../../Services/tableAccountService';
import { adminMockSettings } from '../data';
import {
  isValidPrepaymentWindow,
  validateTableAccountSettings,
} from '../domain/tableAccountSettingsValidation';
import type { TableAccountAdminSettings, TablePrepaymentWindow } from '../types';
import * as S from './TableAccountSettings.styles';

type Settings = typeof adminMockSettings;
type Props = {
  settings: Settings;
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
};

type AdminSession = {
  tableSessionId: number;
  sessionPublicId: string;
  tableNumber: number;
  openedAt: string;
  status: string;
  openedByName: string;
  itemsCount: number;
  summary: {
    consumedCents: number;
    grossPaidCents: number;
    remainingCents: number;
    participantsCount: number;
  };
};

type AccountDetail = {
  items: Array<{
    publicId: string;
    productName: string;
    orderedByDisplayName: string;
    unitPriceCents: number;
    financialStatus: string;
  }>;
  paymentIntents: Array<{
    publicId: string;
    method: string;
    status: string;
    totalCents: number;
    serviceFeeCents: number;
    payerParticipantPublicId: string;
  }>;
};

const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

type BooleanSettingKey = {
  [Key in keyof TableAccountAdminSettings]: TableAccountAdminSettings[Key] extends boolean
    ? Key
    : never;
}[keyof TableAccountAdminSettings];

const accountFeatureToggles: ReadonlyArray<{
  key: BooleanSettingKey;
  title: string;
  description: string;
}> = [
  {
    key: 'enabled',
    title: 'Ativar conta por mesa',
    description: 'Pedidos podem ser acumulados e pagos em partes.',
  },
  {
    key: 'allowOnlinePayment',
    title: 'Pagamento online',
    description: 'Permite iniciar PIX ou cartão pelo celular.',
  },
  {
    key: 'allowSplit',
    title: 'Dividir o saldo',
    description: 'Libera a divisão exata, incluindo os centavos restantes.',
  },
  {
    key: 'allowCash',
    title: 'Dinheiro com o garçom',
    description: 'O garçom confirma o recebimento presencial.',
  },
  {
    key: 'allowCardMachine',
    title: 'Maquininha',
    description: 'O garçom confirma depois da aprovação na máquina.',
  },
];

const accountProtectionToggles: ReadonlyArray<{
  key: BooleanSettingKey;
  title: string;
  description: string;
}> = [
  {
    key: 'preventCloseWithOutstandingBalance',
    title: 'Impedir fechamento com saldo pendente',
    description: 'O admin ainda poderá forçar o fechamento informando um motivo auditável.',
  },
  {
    key: 'blockNewOrdersOnClosingRequest',
    title: 'Bloquear pedidos depois de pedir a conta',
    description: 'Ao solicitar a conta, a sessão entra em fechamento e não aceita novos pedidos.',
  },
  {
    key: 'requireEmployeeApprovalForPreparedItemCancellation',
    title: 'Aprovar cancelamento de item em preparo',
    description: 'Protege a cozinha contra cancelamentos sem autorização da equipe.',
  },
];

function money(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

function minuteToTime(value: number) {
  const hour = Math.floor(value / 60)
    .toString()
    .padStart(2, '0');
  const minute = (value % 60).toString().padStart(2, '0');
  return `${hour}:${minute}`;
}

function timeToMinute(value: string, fallback: number) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return fallback;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return fallback;
  return Math.min(1439, Math.max(0, hour * 60 + minute));
}

export function TableAccountSettings({ settings, update }: Props) {
  const { promptDialog } = useAppDialog();
  const account = settings.tableAccount;
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [details, setDetails] = useState<Record<string, AccountDetail>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const validation = validateTableAccountSettings(account);
  const validationMessages = [...new Set(Object.values(validation).filter(Boolean))];

  const change = <K extends keyof TableAccountAdminSettings>(
    key: K,
    value: TableAccountAdminSettings[K],
  ) => update('tableAccount', { ...account, [key]: value });

  const changeBoolean = (key: BooleanSettingKey, value: boolean) =>
    update('tableAccount', { ...account, [key]: value });

  const refreshSessions = useCallback(async () => {
    setLoading(true);
    try {
      const result = await tableAccountService.listAdminSessions();
      setSessions(Array.isArray(result?.sessions) ? result.sessions : []);
    } catch (error) {
      console.error('Não foi possível consultar as contas de mesa.', error);
      toast.error('Não foi possível atualizar as contas de mesa.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    tableAccountService
      .listAdminSessions()
      .then((result) => {
        if (active) setSessions(Array.isArray(result?.sessions) ? result.sessions : []);
      })
      .catch((error) => {
        if (!active) return;
        console.error('Não foi possível consultar as contas de mesa.', error);
        toast.error('Não foi possível atualizar as contas de mesa.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const changeWindow = (index: number, next: TablePrepaymentWindow) => {
    change(
      'prepaymentWindows',
      account.prepaymentWindows.map((window, currentIndex) =>
        currentIndex === index ? next : window,
      ),
    );
  };

  const loadDetail = async (sessionPublicId: string) => {
    if (details[sessionPublicId]) {
      setDetails((current) => {
        const next = { ...current };
        delete next[sessionPublicId];
        return next;
      });
      return;
    }
    setBusyId(sessionPublicId);
    try {
      const detail = await tableAccountService.getAdminSnapshot(sessionPublicId);
      setDetails((current) => ({ ...current, [sessionPublicId]: detail }));
    } catch {
      toast.error('Não foi possível abrir os detalhes desta conta.');
    } finally {
      setBusyId('');
    }
  };

  const confirmManual = async (paymentPublicId: string, sessionPublicId: string) => {
    if (!window.confirm('Confirma que o valor foi recebido no caixa ou na maquininha?')) return;
    setBusyId(paymentPublicId);
    try {
      await tableAccountService.confirmManualPayment(paymentPublicId);
      const detail = await tableAccountService.getAdminSnapshot(sessionPublicId);
      setDetails((current) => ({ ...current, [sessionPublicId]: detail }));
      await refreshSessions();
      toast.success('Pagamento presencial confirmado.');
    } catch {
      toast.error('Não foi possível confirmar este pagamento.');
    } finally {
      setBusyId('');
    }
  };

  const refund = async (paymentPublicId: string, sessionPublicId: string) => {
    const reason = window.prompt('Informe o motivo do estorno (mínimo de 5 caracteres):')?.trim();
    if (!reason || reason.length < 5) return;
    setBusyId(paymentPublicId);
    try {
      await tableAccountService.refundPayment(paymentPublicId, reason);
      const detail = await tableAccountService.getAdminSnapshot(sessionPublicId);
      setDetails((current) => ({ ...current, [sessionPublicId]: detail }));
      await refreshSessions();
      toast.success('Estorno registrado com sucesso.');
    } catch {
      toast.error('Não foi possível estornar este pagamento.');
    } finally {
      setBusyId('');
    }
  };

  const forceClose = async (session: AdminSession) => {
    const reason = (
      await promptDialog({
        title: `Fechar a Mesa ${session.tableNumber}?`,
        description:
          'Use esta ação somente quando o atendimento não puder ser encerrado pelo fluxo normal. O motivo ficará registrado na auditoria.',
        inputLabel: 'Motivo do fechamento administrativo',
        placeholder: 'Ex.: atendimento cancelado diretamente no caixa',
        confirmLabel: 'Fechar mesa',
        cancelLabel: 'Manter aberta',
        tone: 'danger',
      })
    )?.trim();
    if (!reason) return;
    if (reason.length < 5) {
      toast.warning('Informe um motivo com pelo menos 5 caracteres.');
      return;
    }
    setBusyId(session.sessionPublicId);
    try {
      await tableAccountService.forceCloseSession(session.tableSessionId, reason);
      setDetails((current) => {
        const next = { ...current };
        delete next[session.sessionPublicId];
        return next;
      });
      await refreshSessions();
      toast.success(`Mesa ${session.tableNumber} encerrada com auditoria.`);
    } catch {
      toast.error('Não foi possível encerrar esta mesa.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <S.Page>
      <S.Hero>
        <div className="copy">
          <span className="eyebrow">CONTA DIGITAL DA MESA</span>
          <h2>Controle pagamentos sem perder a visão do salão</h2>
          <p>
            Defina como o cliente paga, quando o pagamento precisa ser antecipado e quais regras
            protegem o fechamento da mesa. Todas as decisões são aplicadas no servidor por
            restaurante.
          </p>
        </div>
        <div className="status">
          <span>Status do recurso</span>
          <b>{account.enabled ? 'Ativo e protegido' : 'Desativado'}</b>
        </div>
      </S.Hero>

      {validationMessages.length > 0 && (
        <S.Validation role="alert">
          <b>Revise estas regras antes de salvar:</b>
          <ul>
            {validationMessages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </S.Validation>
      )}

      <S.Grid>
        <S.Card>
          <header>
            <div>
              <h3>Funcionamento da conta</h3>
              <p>Ative os recursos que aparecerão para o cliente no cardápio da mesa.</p>
            </div>
            <WalletCards size={22} color="var(--a)" />
          </header>
          <S.ToggleList>
            {accountFeatureToggles.map(({ key, title, description }) => (
              <label className="row" key={key}>
                <div>
                  <b>{title}</b>
                  <span>{description}</span>
                </div>
                <input
                  aria-label={title}
                  type="checkbox"
                  checked={account[key]}
                  onChange={(event) => changeBoolean(key, event.target.checked)}
                />
              </label>
            ))}
          </S.ToggleList>
        </S.Card>

        <S.Card>
          <header>
            <div>
              <h3>Taxa e reserva</h3>
              <p>O percentual é calculado em centavos no backend, nunca pelo navegador.</p>
            </div>
          </header>
          <S.Fields>
            <label>
              Taxa de serviço
              <select
                aria-label="Modo da taxa de serviço"
                value={account.serviceFeeMode}
                onChange={(event) => {
                  const mode = event.target.value as TableAccountAdminSettings['serviceFeeMode'];
                  update('tableAccount', {
                    ...account,
                    serviceFeeMode: mode,
                    serviceFeeBasisPoints:
                      mode === 'DISABLED'
                        ? 0
                        : account.serviceFeeBasisPoints > 0
                          ? account.serviceFeeBasisPoints
                          : 1_000,
                  });
                }}
              >
                <option value="DISABLED">Sem taxa</option>
                <option value="OPTIONAL">Opcional para o cliente</option>
                <option value="MANDATORY">Obrigatória</option>
              </select>
            </label>
            <label>
              Percentual
              <input
                aria-label="Percentual da taxa de serviço"
                type="number"
                min="0.01"
                max="100"
                step="0.01"
                disabled={account.serviceFeeMode === 'DISABLED'}
                aria-invalid={Boolean(validation.serviceFeeBasisPoints)}
                value={(account.serviceFeeBasisPoints / 100).toFixed(2)}
                onChange={(event) => {
                  const percentage = Number(event.target.value);
                  change(
                    'serviceFeeBasisPoints',
                    Number.isFinite(percentage)
                      ? Math.min(10_000, Math.max(1, Math.round(percentage * 100)))
                      : 1,
                  );
                }}
              />
              {validation.serviceFeeBasisPoints && (
                <small className="field-error">{validation.serviceFeeBasisPoints}</small>
              )}
            </label>
            <label>
              Tempo da reserva
              <input
                aria-label="Tempo da reserva em minutos"
                type="number"
                min="1"
                max="60"
                aria-invalid={Boolean(validation.reservationTimeoutMinutes)}
                value={account.reservationTimeoutMinutes}
                onChange={(event) =>
                  change(
                    'reservationTimeoutMinutes',
                    Math.min(60, Math.max(1, Math.round(Number(event.target.value) || 1))),
                  )
                }
              />
              <small>Itens voltam a ficar disponíveis se o pagamento não terminar.</small>
              {validation.reservationTimeoutMinutes && (
                <small className="field-error">{validation.reservationTimeoutMinutes}</small>
              )}
            </label>
            <label>
              Fuso horário
              <select
                aria-label="Fuso horário da conta"
                aria-invalid={Boolean(validation.timeZone)}
                value={account.timeZone}
                onChange={(event) => change('timeZone', event.target.value)}
              >
                <option value="America/Sao_Paulo">Brasília</option>
                <option value="America/Manaus">Manaus</option>
                <option value="America/Cuiaba">Cuiabá</option>
                <option value="America/Rio_Branco">Rio Branco</option>
                <option value="America/Noronha">Fernando de Noronha</option>
              </select>
              {validation.timeZone && <small className="field-error">{validation.timeZone}</small>}
            </label>
          </S.Fields>
        </S.Card>
      </S.Grid>

      <S.Card>
        <header>
          <div>
            <h3>Quando exigir pagamento antecipado</h3>
            <p>Use um limite de saldo, horários específicos ou os dois ao mesmo tempo.</p>
          </div>
          <S.Button
            type="button"
            onClick={() =>
              change('prepaymentWindows', [
                ...account.prepaymentWindows,
                { weekdays: [1, 2, 3, 4, 5], startsAtMinute: 1080, endsAtMinute: 1380 },
              ])
            }
          >
            + Adicionar horário
          </S.Button>
        </header>
        <S.Fields>
          <label>
            Limite da conta (R$)
            <input
              aria-label="Limite para pagamento antecipado"
              type="number"
              min="0"
              step="0.01"
              placeholder="Sem limite"
              aria-invalid={Boolean(validation.requirePrepaymentAboveCents)}
              value={
                account.requirePrepaymentAboveCents === null
                  ? ''
                  : (account.requirePrepaymentAboveCents / 100).toFixed(2)
              }
              onChange={(event) =>
                change(
                  'requirePrepaymentAboveCents',
                  event.target.value === ''
                    ? null
                    : Math.max(0, Math.round(Number(event.target.value) * 100)),
                )
              }
            />
            <small>Ao ultrapassar este saldo, o novo pedido precisa ser pago agora.</small>
            {validation.requirePrepaymentAboveCents && (
              <small className="field-error">{validation.requirePrepaymentAboveCents}</small>
            )}
          </label>
        </S.Fields>
        <S.Windows>
          {account.prepaymentWindows.map((window, index) => (
            <div
              className={`window${isValidPrepaymentWindow(window) ? '' : ' invalid'}`}
              key={`${index}-${window.startsAtMinute}`}
            >
              <div className="window-head">
                <span>Período {index + 1}</span>
                <S.Button
                  $danger
                  type="button"
                  onClick={() =>
                    change(
                      'prepaymentWindows',
                      account.prepaymentWindows.filter((_, currentIndex) => currentIndex !== index),
                    )
                  }
                >
                  Remover
                </S.Button>
              </div>
              <div className="days" aria-label={`Dias do período ${index + 1}`}>
                {dayLabels.map((label, day) => (
                  <button
                    type="button"
                    className={window.weekdays.includes(day) ? 'active' : ''}
                    aria-pressed={window.weekdays.includes(day)}
                    key={label}
                    onClick={() => {
                      const selected = window.weekdays.includes(day);
                      if (selected && window.weekdays.length === 1) {
                        toast.info('Mantenha ao menos um dia neste período.');
                        return;
                      }
                      changeWindow(index, {
                        ...window,
                        weekdays: selected
                          ? window.weekdays.filter((current) => current !== day)
                          : [...window.weekdays, day].sort(),
                      });
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="times">
                <input
                  aria-label={`Início do período ${index + 1}`}
                  type="time"
                  value={minuteToTime(window.startsAtMinute)}
                  onChange={(event) =>
                    changeWindow(index, {
                      ...window,
                      startsAtMinute: timeToMinute(event.target.value, window.startsAtMinute),
                    })
                  }
                />
                <input
                  aria-label={`Fim do período ${index + 1}`}
                  type="time"
                  value={minuteToTime(window.endsAtMinute)}
                  onChange={(event) =>
                    changeWindow(index, {
                      ...window,
                      endsAtMinute: timeToMinute(event.target.value, window.endsAtMinute),
                    })
                  }
                />
              </div>
              {!isValidPrepaymentWindow(window) && (
                <small className="window-error">
                  Escolha ao menos um dia e use horários de início e fim diferentes.
                </small>
              )}
            </div>
          ))}
          {!account.prepaymentWindows.length && (
            <S.Empty>Nenhum horário especial. Apenas o limite de valor será considerado.</S.Empty>
          )}
        </S.Windows>
      </S.Card>

      <S.Card>
        <header>
          <div>
            <h3>Proteções operacionais</h3>
            <p>Regras para evitar novos pedidos e fechamentos sem conferência.</p>
          </div>
          <ShieldCheck size={22} color="var(--a)" />
        </header>
        <S.ToggleList>
          {accountProtectionToggles.map(({ key, title, description }) => (
            <label className="row" key={key}>
              <div>
                <b>{title}</b>
                <span>{description}</span>
              </div>
              <input
                aria-label={title}
                type="checkbox"
                checked={account[key]}
                onChange={(event) => changeBoolean(key, event.target.checked)}
              />
            </label>
          ))}
        </S.ToggleList>
      </S.Card>

      <S.Card>
        <header>
          <div>
            <h3>Mesas com conta aberta</h3>
            <p>Acompanhe consumo, pagamentos e reservas sem misturar restaurantes.</p>
          </div>
          <S.Button type="button" onClick={() => void refreshSessions()} disabled={loading}>
            <RefreshCw size={13} /> {loading ? 'Atualizando...' : 'Atualizar'}
          </S.Button>
        </header>
        <S.SessionList>
          {sessions.map((session) => {
            const detail = details[session.sessionPublicId];
            return (
              <S.SessionCard key={session.sessionPublicId}>
                <div className="top">
                  <div>
                    <h4>Mesa {String(session.tableNumber).padStart(2, '0')}</h4>
                    <p className="meta">
                      Aberta {new Date(session.openedAt).toLocaleString('pt-BR')} por{' '}
                      {session.openedByName}
                    </p>
                  </div>
                  <span className="badge">
                    {session.status === 'CLOSING_REQUESTED' ? 'CONTA SOLICITADA' : 'ABERTA'}
                  </span>
                </div>
                <div className="numbers">
                  <div>
                    <span>Consumido</span>
                    <b>{money(session.summary.consumedCents)}</b>
                  </div>
                  <div>
                    <span>Pago</span>
                    <b>{money(session.summary.grossPaidCents)}</b>
                  </div>
                  <div>
                    <span>Saldo</span>
                    <b>{money(session.summary.remainingCents)}</b>
                  </div>
                </div>
                <div className="actions">
                  <span className="meta">
                    {session.summary.participantsCount} participante(s) · {session.itemsCount}{' '}
                    item(ns)
                  </span>
                  <div>
                    <S.Button
                      type="button"
                      disabled={busyId === session.sessionPublicId}
                      onClick={() => void loadDetail(session.sessionPublicId)}
                    >
                      {detail ? 'Ocultar detalhes' : 'Ver detalhes'}
                    </S.Button>{' '}
                    <S.Button
                      $danger
                      type="button"
                      disabled={busyId === session.sessionPublicId}
                      onClick={() => void forceClose(session)}
                    >
                      Fechamento administrativo
                    </S.Button>
                  </div>
                </div>
                {detail && (
                  <S.Detail>
                    <div className="detail-section">
                      <h5>Itens da conta</h5>
                      {detail.items.map((item) => (
                        <div className="item" key={item.publicId}>
                          <div>
                            <b>{item.productName}</b>
                            <span> · {item.orderedByDisplayName}</span>
                          </div>
                          <div>
                            {money(item.unitPriceCents)} · {item.financialStatus}
                          </div>
                        </div>
                      ))}
                      {!detail.items.length && <S.Empty>Nenhum item lançado nesta conta.</S.Empty>}
                    </div>
                    <div className="detail-section">
                      <h5>Pagamentos e reservas</h5>
                      {detail.paymentIntents.map((payment) => (
                        <div className="payment" key={payment.publicId}>
                          <div>
                            <b>{payment.method}</b>
                            <span> · {payment.status}</span>
                            <div>{money(payment.totalCents)}</div>
                          </div>
                          <div className="payment-actions">
                            {['CASH', 'CARD_MACHINE'].includes(payment.method) &&
                              ['RESERVED', 'PROCESSING'].includes(payment.status) && (
                                <S.Button
                                  type="button"
                                  disabled={busyId === payment.publicId}
                                  onClick={() =>
                                    void confirmManual(payment.publicId, session.sessionPublicId)
                                  }
                                >
                                  Confirmar recebimento
                                </S.Button>
                              )}
                            {payment.status === 'PAID' && (
                              <S.Button
                                $danger
                                type="button"
                                disabled={busyId === payment.publicId}
                                onClick={() =>
                                  void refund(payment.publicId, session.sessionPublicId)
                                }
                              >
                                Estornar
                              </S.Button>
                            )}
                          </div>
                        </div>
                      ))}
                      {!detail.paymentIntents.length && (
                        <S.Empty>Nenhum pagamento iniciado nesta conta.</S.Empty>
                      )}
                    </div>
                  </S.Detail>
                )}
              </S.SessionCard>
            );
          })}
          {!loading && !sessions.length && (
            <S.Empty>Nenhuma mesa com conta aberta neste momento.</S.Empty>
          )}
        </S.SessionList>
      </S.Card>
    </S.Page>
  );
}
