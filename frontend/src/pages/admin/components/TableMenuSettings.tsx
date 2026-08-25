import {
  AlertCircle,
  CheckCircle2,
  Download,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'react-qr-code';
import tablesService from '../../../Services/tablesService';
import { adminMockSettings } from '../data';
import {
  buildAdminTableQrUrl,
  mapAdminTableQr,
  mapAdminTableQrs,
  tableDisplayName,
  type AdminTableQrRecord,
} from '../domain/tableQr';
import * as S from '../Admin.styles';
import * as T from './TableMenuSettings.styles';

type Props = {
  settings: typeof adminMockSettings;
  update: <K extends keyof typeof adminMockSettings>(
    key: K,
    value: (typeof adminMockSettings)[K],
  ) => void;
};

type RequestError = {
  response?: { data?: { error?: string; message?: string } };
  message?: string;
};

function requestErrorMessage(error: unknown, fallback: string) {
  const typed = error as RequestError;
  return String(
    typed.response?.data?.error || typed.response?.data?.message || typed.message || fallback,
  );
}

function validateTableNumber(value: string) {
  const normalized = Number(value);
  if (
    !/^\d+$/.test(value.trim()) ||
    !Number.isInteger(normalized) ||
    normalized < 1 ||
    normalized > 9999
  ) {
    return 'Informe um número de mesa inteiro entre 1 e 9999.';
  }
  return '';
}

export function TableMenuSettings({ settings, update }: Props) {
  const [tables, setTables] = useState<AdminTableQrRecord[]>([]);
  const [number, setNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadRevision, setLoadRevision] = useState(0);
  const [creating, setCreating] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedTable, setSelectedTable] = useState<AdminTableQrRecord | null>(null);
  const [deleteTableCandidate, setDeleteTableCandidate] = useState<AdminTableQrRecord | null>(null);
  const [deletingTable, setDeletingTable] = useState(false);
  const [printTables, setPrintTables] = useState<AdminTableQrRecord[]>([]);
  const qrNodesRef = useRef(new Map<string, HTMLDivElement>());
  const closeDialogRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;
    tablesService
      .listTables()
      .then((result) => {
        if (active) {
          setTables(mapAdminTableQrs(result));
          setLoadError('');
        }
      })
      .catch((requestError: unknown) => {
        if (active) {
          setLoadError(requestErrorMessage(requestError, 'Não foi possível carregar as mesas.'));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadRevision]);

  useEffect(() => {
    if (!selectedTable) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedTable(null);
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', closeOnEscape);
    closeDialogRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [selectedTable]);

  const tablesWithQr = useMemo(
    () => tables.filter((table) => table.active && Boolean(table.token)),
    [tables],
  );

  const createTable = async (event: FormEvent) => {
    event.preventDefault();
    const validationError = validateTableNumber(number);
    if (validationError) {
      setActionError(validationError);
      setSuccess('');
      return;
    }

    setCreating(true);
    setActionError('');
    setSuccess('');
    try {
      const created = mapAdminTableQr(await tablesService.createTable({ number: Number(number) }));
      if (!created) {
        throw new Error('A mesa foi criada, mas o servidor não retornou os dados do QR Code.');
      }
      if (!created.token) {
        throw new Error('O token seguro do QR Code não foi retornado. Atualize e tente novamente.');
      }
      setTables((current) =>
        [...current.filter((table) => table.id !== created.id), created].sort(
          (left, right) => left.number - right.number,
        ),
      );
      setNumber('');
      setSuccess(`${tableDisplayName(created.number)} criada com QR Code seguro.`);
      setSelectedTable(created);
    } catch (requestError) {
      setActionError(requestErrorMessage(requestError, 'Não foi possível criar a mesa.'));
    } finally {
      setCreating(false);
    }
  };

  const downloadQrCode = (table: AdminTableQrRecord) => {
    const svg = qrNodesRef.current.get(table.id)?.querySelector('svg');
    if (!svg || typeof URL.createObjectURL !== 'function') {
      setActionError('Não foi possível preparar o QR Code para download neste navegador.');
      return;
    }
    const clone = svg.cloneNode(true) as SVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', '512');
    clone.setAttribute('height', '512');
    const contents = `<?xml version="1.0" encoding="UTF-8"?>${new XMLSerializer().serializeToString(clone)}`;
    const url = URL.createObjectURL(new Blob([contents], { type: 'image/svg+xml;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `qr-${tableDisplayName(table.number).toLocaleLowerCase('pt-BR').replace(' ', '-')}.svg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setActionError('');
    setSuccess(`QR Code da ${tableDisplayName(table.number)} baixado.`);
  };

  const printQrCodes = (selection: AdminTableQrRecord[]) => {
    const printable = selection.filter((table) => table.active && Boolean(table.token));
    if (!printable.length) {
      setActionError('Nenhum QR Code ativo está disponível para impressão.');
      return;
    }
    setActionError('');
    setPrintTables(printable);
    window.setTimeout(() => {
      document.body.classList.add('admin-table-qr-printing');
      try {
        window.print();
      } finally {
        document.body.classList.remove('admin-table-qr-printing');
      }
    }, 0);
  };

  const deleteTable = async () => {
    if (!deleteTableCandidate || deletingTable) return;
    setDeletingTable(true);
    setActionError('');
    try {
      await tablesService.deleteTable(deleteTableCandidate.id);
      setTables((current) => current.filter((table) => table.id !== deleteTableCandidate.id));
      setSelectedTable(null);
      setDeleteTableCandidate(null);
      setSuccess(
        `${tableDisplayName(deleteTableCandidate.number)} excluída. Você já pode cadastrá-la novamente.`,
      );
    } catch (requestError) {
      setActionError(requestErrorMessage(requestError, 'Não foi possível excluir esta mesa.'));
    } finally {
      setDeletingTable(false);
    }
  };

  return (
    <S.SettingSection aria-label="Cardápio de mesa">
      <T.TablePrintGlobalStyle />
      <T.Hero>
        <div className="copy">
          <span className="eyebrow">ATENDIMENTO PRESENCIAL</span>
          <h2>Cardápio de mesa</h2>
          <p>
            Cadastre cada mesa uma única vez. O sistema cria um QR Code seguro e exclusivo deste
            restaurante, pronto para visualizar, baixar e imprimir.
          </p>
        </div>
        <span className="icon" aria-hidden="true">
          <QrCode />
        </span>
      </T.Hero>

      <T.SetupGrid>
        <T.CreateCard>
          <header>
            <span aria-hidden="true">
              <Plus />
            </span>
            <div>
              <h3>Cadastrar nova mesa</h3>
              <p>Informe o número físico da mesa. O QR seguro será vinculado automaticamente.</p>
            </div>
          </header>
          <form onSubmit={(event) => void createTable(event)} noValidate>
            <label htmlFor="admin-table-number">Número da mesa</label>
            <div className="form-row">
              <input
                id="admin-table-number"
                aria-label="Número da mesa"
                inputMode="numeric"
                autoComplete="off"
                min="1"
                max="9999"
                type="number"
                value={number}
                onChange={(event) => setNumber(event.target.value)}
                placeholder="Ex.: 12"
                disabled={creating}
              />
              <T.PrimaryButton type="submit" aria-label="Criar mesa" disabled={creating}>
                {creating ? <RefreshCw className="spin" /> : <Plus />}
                {creating ? 'Criando...' : 'Criar mesa'}
              </T.PrimaryButton>
            </div>
            <span className="hint">Use o mesmo número que o cliente vê na mesa.</span>
          </form>
        </T.CreateCard>

        <T.GuideCard>
          <div>
            <h3>Como funciona</h3>
            <p>Um fluxo simples e seguro para o salão.</p>
          </div>
          <ol>
            <li>
              <span>1</span>
              <div>
                <b>Cadastre e imprima</b>O QR Code é fixo e pode permanecer na mesa sem expor dados
                internos.
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <b>O garçom abre a mesa</b>O cliente só consegue entrar e pedir enquanto a sessão
                estiver aberta.
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <b>Feche com segurança</b>A mesa só pode ser fechada após concluir os pedidos e
                confirmar os pagamentos.
              </div>
            </li>
          </ol>
        </T.GuideCard>
      </T.SetupGrid>

      {actionError && (
        <T.Notice $tone="error" role="alert">
          <AlertCircle /> <span>{actionError}</span>
        </T.Notice>
      )}
      {success && (
        <T.Notice $tone="success" role="status" aria-live="polite">
          <CheckCircle2 /> <span>{success}</span>
        </T.Notice>
      )}

      <T.TablesPanel>
        <header>
          <div>
            <h3>Mesas e QR Codes</h3>
            <p>Confira os cadastros e prepare os materiais que ficarão no salão.</p>
          </div>
          <T.SecondaryButton
            type="button"
            aria-label="Imprimir QR Codes"
            onClick={() => printQrCodes(tablesWithQr)}
            disabled={!tablesWithQr.length}
          >
            <Printer /> Imprimir QR Codes
          </T.SecondaryButton>
        </header>
        <T.TableMetrics aria-label="Resumo das mesas">
          <div>
            <small>Total</small>
            <b>{tables.length}</b>
          </div>
          <div>
            <small>Ativas</small>
            <b>{tables.filter((table) => table.active).length}</b>
          </div>
          <div>
            <small>QR disponível</small>
            <b>{tablesWithQr.length}</b>
          </div>
        </T.TableMetrics>

        {loadError && !loading ? (
          <T.EmptyState role="alert">
            <AlertCircle />
            <b>Não foi possível carregar as mesas</b>
            <span>{loadError}</span>
            <T.SecondaryButton
              type="button"
              onClick={() => {
                setLoading(true);
                setLoadError('');
                setLoadRevision((current) => current + 1);
              }}
            >
              <RefreshCw /> Tentar novamente
            </T.SecondaryButton>
          </T.EmptyState>
        ) : loading ? (
          <T.EmptyState role="status">
            <RefreshCw className="spin" />
            <b>Carregando mesas...</b>
            <span>Buscando os QR Codes seguros deste restaurante.</span>
          </T.EmptyState>
        ) : tables.length ? (
          <T.TableGrid>
            {tables.map((table) => {
              const name = tableDisplayName(table.number);
              const canUseQr = table.active && Boolean(table.token);
              return (
                <T.TableCard key={table.id} aria-label={name}>
                  <div className="info">
                    <h4>{name}</h4>
                    <div className="badges">
                      <span className={`badge ${table.active ? '' : 'off'}`}>
                        {table.active ? 'Cadastro ativo' : 'Mesa inativa'}
                      </span>
                      {table.status === 'OCCUPIED' && (
                        <span className="badge open">Em atendimento</span>
                      )}
                    </div>
                    <p>
                      {canUseQr
                        ? 'QR seguro vinculado e pronto para o salão.'
                        : 'QR indisponível. Atualize os dados ou reative a mesa.'}
                    </p>
                  </div>
                  <T.QrThumb
                    ref={(node) => {
                      if (node) qrNodesRef.current.set(table.id, node);
                      else qrNodesRef.current.delete(table.id);
                    }}
                    className={canUseQr ? '' : 'missing'}
                    aria-hidden="true"
                  >
                    {canUseQr ? (
                      <QRCode
                        value={buildAdminTableQrUrl(table)}
                        size={72}
                        level="H"
                        title={`QR Code da ${name}`}
                      />
                    ) : (
                      <AlertCircle />
                    )}
                  </T.QrThumb>
                  <footer>
                    <T.SecondaryButton
                      type="button"
                      aria-label={`Visualizar QR Code da ${name}`}
                      onClick={() => setSelectedTable(table)}
                      disabled={!canUseQr}
                    >
                      <QrCode /> Visualizar QR Code
                    </T.SecondaryButton>
                    <T.SecondaryButton
                      type="button"
                      aria-label={`Baixar QR Code da ${name}`}
                      onClick={() => downloadQrCode(table)}
                      disabled={!canUseQr}
                    >
                      <Download /> Baixar QR
                    </T.SecondaryButton>
                    <T.DeleteButton
                      type="button"
                      aria-label={`Excluir ${name}`}
                      onClick={() => setDeleteTableCandidate(table)}
                    >
                      <Trash2 /> Excluir mesa
                    </T.DeleteButton>
                  </footer>
                </T.TableCard>
              );
            })}
          </T.TableGrid>
        ) : (
          <T.EmptyState>
            <QrCode />
            <b>Nenhuma mesa cadastrada</b>
            <span>Cadastre a primeira mesa acima para gerar o QR Code seguro automaticamente.</span>
          </T.EmptyState>
        )}
      </T.TablesPanel>

      <S.Card>
        <h2>Pedidos pelo cardápio de mesa</h2>
        <p>
          O garçom abre a mesa antes do atendimento. Enquanto ela estiver aberta, o QR Code libera o
          cardápio e os pedidos ficam vinculados à sessão correta.
        </p>
        <S.ToggleRows>
          <label className="toggle-row">
            <div>
              <b>Pedidos por QR Code</b>
              <span>O cliente valida a mesa, monta o produto e envia o pedido para a cozinha.</span>
            </div>
            <input
              type="checkbox"
              role="switch"
              aria-label="Pedidos por QR Code"
              checked={settings.tableOrderingEnabled}
              onChange={(event) => update('tableOrderingEnabled', event.target.checked)}
            />
          </label>
        </S.ToggleRows>
      </S.Card>

      <S.Card>
        <h2>Atendimento pelo salão</h2>
        <p>Escolha quais solicitações o cliente pode enviar pelo cardápio da mesa.</p>
        <S.ToggleRows>
          <label className="toggle-row">
            <div>
              <b>Chamar garçom</b>
              <span>Cria um chamado em tempo real para a equipe assumir e concluir.</span>
            </div>
            <input
              type="checkbox"
              role="switch"
              aria-label="Chamar garçom"
              checked={settings.waiterCallEnabled}
              disabled={!settings.tableOrderingEnabled}
              onChange={(event) => update('waiterCallEnabled', event.target.checked)}
            />
          </label>
          <label className="toggle-row">
            <div>
              <b>Pedir a conta</b>
              <span>Envia a solicitação da conta vinculada à mesa que está aberta.</span>
            </div>
            <input
              type="checkbox"
              role="switch"
              aria-label="Pedir a conta"
              checked={settings.billRequestEnabled}
              disabled={!settings.tableOrderingEnabled}
              onChange={(event) => update('billRequestEnabled', event.target.checked)}
            />
          </label>
        </S.ToggleRows>
      </S.Card>

      {createPortal(
        <T.PrintSheet data-admin-table-qr-print aria-hidden="true">
          {printTables.map((table) => (
            <article key={table.id}>
              <ShieldCheck className="print-shield" />
              <h2>{settings.restaurantName || 'Seu restaurante'}</h2>
              <h3>{tableDisplayName(table.number)}</h3>
              <div className="print-qr">
                <QRCode value={buildAdminTableQrUrl(table)} size={720} level="H" />
              </div>
              <p>Escaneie para acessar o cardápio desta mesa.</p>
            </article>
          ))}
        </T.PrintSheet>,
        document.body,
      )}

      {selectedTable && (
        <T.DialogBackdrop onMouseDown={() => setSelectedTable(null)}>
          <T.QrDialog
            role="dialog"
            aria-modal="true"
            aria-label={`QR Code da ${tableDisplayName(selectedTable.number)}`}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              ref={closeDialogRef}
              type="button"
              className="close"
              aria-label="Fechar QR Code"
              onClick={() => setSelectedTable(null)}
            >
              <X />
            </button>
            <span className="eyebrow">QR CODE SEGURO</span>
            <h2>{tableDisplayName(selectedTable.number)}</h2>
            <div className="qr-large">
              <QRCode
                value={buildAdminTableQrUrl(selectedTable)}
                size={230}
                level="H"
                title={`QR Code da ${tableDisplayName(selectedTable.number)}`}
              />
            </div>
            <p>
              Imprima e fixe este código na mesa correta. O cliente só poderá pedir depois que o
              garçom abrir a mesa.
            </p>
            <div className="dialog-actions">
              <T.SecondaryButton type="button" onClick={() => downloadQrCode(selectedTable)}>
                <Download /> Baixar QR
              </T.SecondaryButton>
              <T.PrimaryButton
                type="button"
                aria-label="Imprimir QR Code"
                onClick={() => printQrCodes([selectedTable])}
              >
                <Printer /> Imprimir QR Code
              </T.PrimaryButton>
            </div>
          </T.QrDialog>
        </T.DialogBackdrop>
      )}

      {deleteTableCandidate && (
        <T.DialogBackdrop onMouseDown={() => !deletingTable && setDeleteTableCandidate(null)}>
          <T.DeleteDialog
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-table-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <span className="delete-icon" aria-hidden="true">
              <Trash2 />
            </span>
            <span className="eyebrow">REMOVER QR CODE</span>
            <h2 id="delete-table-title">
              Excluir {tableDisplayName(deleteTableCandidate.number)}?
            </h2>
            <p>
              O QR Code será removido e o número ficará disponível para um novo cadastro. Mesas com
              pedidos ou atendimento aberto não podem ser excluídas.
            </p>
            <div className="dialog-actions">
              <T.SecondaryButton
                type="button"
                disabled={deletingTable}
                onClick={() => setDeleteTableCandidate(null)}
              >
                Cancelar
              </T.SecondaryButton>
              <T.DeleteButton
                type="button"
                disabled={deletingTable}
                onClick={() => void deleteTable()}
              >
                <Trash2 /> {deletingTable ? 'Excluindo...' : 'Excluir mesa'}
              </T.DeleteButton>
            </div>
          </T.DeleteDialog>
        </T.DialogBackdrop>
      )}
    </S.SettingSection>
  );
}
