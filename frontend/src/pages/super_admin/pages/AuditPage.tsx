import { FileSearch, LockKeyhole, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { AuditLog, SuperAdminData } from '../types';
import { downloadCsv, formatDate, normalizeSearch, statusTone } from '../domain/superAdminDomain';
import { Empty, Metrics, Toolbar } from '../components/Shared';
import * as S from '../SuperAdmin.styles';

type AuditResult = AuditLog['result'];

const auditResultLabels: Record<AuditResult, string> = {
  SUCCESS: 'Sucesso',
  FAILURE: 'Falha',
  BLOCKED: 'Bloqueado',
};

export function AuditPage({
  data,
  onSelect,
}: {
  data: SuperAdminData;
  onSelect: (log: AuditLog) => void;
}) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<'ALL' | AuditResult>('ALL');
  const visible = useMemo(() => {
    const search = normalizeSearch(query);
    return data.auditLogs.filter(
      (log) =>
        (!search ||
          normalizeSearch(
            `${log.user} ${log.restaurant} ${log.action} ${log.resource} ${log.requestId || ''}`,
          ).includes(search)) &&
        (result === 'ALL' || log.result === result),
    );
  }, [data.auditLogs, query, result]);
  const exportRows = () =>
    downloadCsv(
      'auditoria.csv',
      [
        'ID',
        'Data',
        'Usuário',
        'Perfil',
        'Restaurante',
        'Ação',
        'Recurso',
        'IP',
        'Resultado',
        'Request ID',
      ],
      visible.map((log) => [
        log.id,
        log.createdAt,
        log.user,
        log.role,
        log.restaurant,
        log.action,
        log.resource,
        log.ip,
        log.result,
        log.requestId,
      ]),
    );
  return (
    <S.PageStack>
      <S.InlineAlert $tone="info">
        A auditoria registra ações sensíveis da plataforma. Use o Request ID para correlacionar um
        evento com os logs técnicos do backend.
      </S.InlineAlert>
      <Toolbar
        query={query}
        onQuery={setQuery}
        placeholder="Buscar usuário, ação, recurso ou Request ID"
        onExport={exportRows}
        resultCount={visible.length}
      >
        <select
          aria-label="Filtrar por resultado"
          value={result}
          onChange={(e) => setResult(e.target.value as 'ALL' | AuditResult)}
        >
          <option value="ALL">Todos os resultados</option>
          <option value="SUCCESS">Sucesso</option>
          <option value="FAILURE">Falha</option>
          <option value="BLOCKED">Bloqueado</option>
        </select>
      </Toolbar>
      <Metrics
        items={[
          { label: 'Eventos carregados', value: data.auditLogs.length, icon: <FileSearch /> },
          {
            label: 'Ações concluídas',
            value: data.auditLogs.filter((l) => l.result === 'SUCCESS').length,
            icon: <ShieldCheck />,
          },
          {
            label: 'Falhas',
            value: data.auditLogs.filter((l) => l.result === 'FAILURE').length,
            icon: <ShieldAlert />,
          },
          {
            label: 'Ações bloqueadas',
            value: data.auditLogs.filter((l) => l.result === 'BLOCKED').length,
            icon: <LockKeyhole />,
          },
        ]}
      />
      <S.Card>
        <S.SectionHeading>
          <div>
            <h2>Trilha de auditoria</h2>
            <p>{visible.length} evento(s) no recorte disponibilizado pelo backend.</p>
          </div>
        </S.SectionHeading>
        {visible.length ? (
          <S.Table>
            <div className="row head">
              <span>Data e hora</span>
              <span>Usuário</span>
              <span>Restaurante</span>
              <span>Ação</span>
              <span>Resultado</span>
              <span>Ação</span>
            </div>
            {visible.map((log) => (
              <div className="row" key={log.id}>
                <span data-label="Data e hora">{formatDate(log.createdAt, true)}</span>
                <span className="name" data-label="Usuário">
                  <b>{log.user}</b>
                  <small>{log.role}</small>
                </span>
                <span data-label="Restaurante">{log.restaurant}</span>
                <span className="name" data-label="Evento">
                  <b>{log.action}</b>
                  <small>{log.resource}</small>
                </span>
                <span data-label="Resultado">
                  <S.Badge $tone={statusTone(log.result)}>{auditResultLabels[log.result]}</S.Badge>
                </span>
                <button type="button" className="action" onClick={() => onSelect(log)}>
                  Detalhes
                </button>
              </div>
            ))}
          </S.Table>
        ) : (
          <Empty title="Nenhum evento encontrado" />
        )}
      </S.Card>
    </S.PageStack>
  );
}
