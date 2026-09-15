import { CircleHelp, Send } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { EmployeeHelpRole } from './employeeHelpGuides';
import type { EmployeeIssueReport } from './reportEmployeeIssue';
import { useEmployeeIssueNotifications } from './useEmployeeIssueNotifications';
import * as S from './EmployeeHelpCenter.styles';

type Props = {
  role: EmployeeHelpRole;
  onReport: (payload: EmployeeIssueReport) => Promise<void>;
  notificationsEnabled?: boolean;
};

export function EmployeeHelpCenter({ role, onReport, notificationsEnabled = true }: Props) {
  useEmployeeIssueNotifications(notificationsEnabled);
  const [reporterName, setReporterName] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const reporterNameLabel =
    role === 'kitchen'
      ? 'Nome do cozinheiro'
      : role === 'waiter'
        ? 'Nome do garçom'
        : 'Nome do motoqueiro';

  async function submit(event: FormEvent) {
    event.preventDefault();
    const normalizedName = reporterName.trim();
    const normalizedSubject = subject.trim();
    const normalizedMessage = message.trim();

    if (normalizedName.length < 3) {
      setStatus('error');
      setError('Informe seu nome para que o administrador identifique o relato.');
      return;
    }
    if (normalizedSubject.length < 3) {
      setStatus('error');
      setError('Informe o assunto do problema.');
      return;
    }
    if (normalizedMessage.length < 5) {
      setStatus('error');
      setError('Explique o que aconteceu para enviar o relato.');
      return;
    }

    setStatus('sending');
    setError('');
    try {
      await onReport({
        reporterName: normalizedName,
        reporterRole: role,
        subject: normalizedSubject,
        message: normalizedMessage,
      });
      setReporterName('');
      setSubject('');
      setMessage('');
      setStatus('success');
    } catch (reason) {
      setStatus('error');
      setError(reason instanceof Error ? reason.message : 'Não foi possível enviar o relato.');
    }
  }

  return (
    <S.Root>
      <S.Hero>
        <small>
          <CircleHelp size={16} /> Suporte interno
        </small>
        <h2>Falar com o administrador</h2>
        <p>
          Use este canal para solicitar suporte diretamente ao administrador do restaurante.
        </p>
      </S.Hero>

      <S.Report onSubmit={submit} noValidate>
        <h3>
          <CircleHelp size={20} /> Solicitar suporte
        </h3>
        <p className="sub">Seu relato será enviado diretamente ao administrador do restaurante.</p>
        <label>
          <span>{reporterNameLabel}</span>
          <input
            required
            minLength={3}
            maxLength={100}
            value={reporterName}
            onChange={(event) => setReporterName(event.target.value)}
            placeholder={reporterNameLabel}
          />
        </label>
        <label>
          <span>Assunto</span>
          <input
            required
            minLength={3}
            maxLength={100}
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="Assunto do problema"
          />
        </label>
        <label>
          <span>Explique o problema</span>
          <textarea
            required
            minLength={5}
            maxLength={900}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Explique o que aconteceu e em qual tela."
          />
        </label>
        {status === 'success' && <span className="success">Relato enviado ao administrador.</span>}
        {status === 'error' && <span className="error">{error}</span>}
        <button disabled={status === 'sending'}>
          <Send size={17} />
          {status === 'sending' ? 'Enviando...' : 'Enviar ao administrador'}
        </button>
      </S.Report>
    </S.Root>
  );
}
