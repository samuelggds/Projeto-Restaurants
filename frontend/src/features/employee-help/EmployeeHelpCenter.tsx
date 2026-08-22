import { useState, type FormEvent } from 'react';
import { BookOpenCheck, ChevronDown, CircleHelp, Send } from 'lucide-react';
import {
  getEmployeeHelpGuides,
  getEmployeeHelpTitle,
  type EmployeeHelpRole,
} from './employeeHelpGuides';
import { EmployeeHelpPreview } from './EmployeeHelpPreview';
import { employeeHelpCallouts } from './employeeHelpCallouts';
import type { EmployeeIssueReport } from './reportEmployeeIssue';
import { useEmployeeIssueNotifications } from './useEmployeeIssueNotifications';
import * as S from './EmployeeHelpCenter.styles';

type Props = {
  role: EmployeeHelpRole;
  onReport: (payload: EmployeeIssueReport) => Promise<void>;
};

export function EmployeeHelpCenter({ role, onReport }: Props) {
  useEmployeeIssueNotifications();
  const guides = getEmployeeHelpGuides(role);
  const [openGuide, setOpenGuide] = useState(guides[0]?.id);
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
          <CircleHelp size={16} /> Central de ajuda
        </small>
        <h2>{getEmployeeHelpTitle(role)}</h2>
        <p>
          Veja cada tela como ela funciona no painel, siga os passos numerados e peça ajuda ao
          administrador do restaurante quando necessário.
        </p>
      </S.Hero>
      {guides.map((guide) => {
        const open = openGuide === guide.id;
        const Icon = guide.icon;
        return (
          <S.Guide key={guide.id}>
            <S.GuideButton onClick={() => setOpenGuide(open ? '' : guide.id)} aria-expanded={open}>
              <span className="icon">
                <Icon size={20} />
              </span>
              <span>
                <strong>{guide.title}</strong>
                <small>
                  {guide.area} · {employeeHelpCallouts[guide.preview].length} itens explicados
                </small>
              </span>
              <ChevronDown
                className="chevron"
                size={20}
                style={{ transform: open ? 'rotate(180deg)' : undefined }}
              />
            </S.GuideButton>
            {open && (
              <S.GuideContent>
                <S.Steps aria-label="Legenda numerada da prévia">
                  {employeeHelpCallouts[guide.preview].map((callout, index) => (
                    <li key={callout.label}>
                      <b>{index + 1}</b>
                      <span>{callout.description}</span>
                    </li>
                  ))}
                </S.Steps>
                <S.Preview>
                  <aside className="side">
                    <div className="brand">PAINEL OPERACIONAL</div>
                    {guide.sidebarItems.map((item) => {
                      const active = item === (guide.sidebarActiveItem ?? guide.title);

                      return (
                        <span
                          className={active ? 'active' : ''}
                          key={item}
                          data-marker={active ? 1 : undefined}
                        >
                          {item}
                        </span>
                      );
                    })}
                  </aside>
                  <EmployeeHelpPreview guide={guide} />
                </S.Preview>
              </S.GuideContent>
            )}
          </S.Guide>
        );
      })}
      <S.Report onSubmit={submit} noValidate>
        <h3>
          <BookOpenCheck size={20} /> Relatar um problema
        </h3>
        <p className="sub">
          Seu relato será enviado diretamente ao administrador do seu restaurante.
        </p>
        <label>
          <span>{reporterNameLabel}</span>
          <input
            required
            minLength={3}
            maxLength={100}
            value={reporterName}
            onChange={(e) => setReporterName(e.target.value)}
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
            onChange={(e) => setSubject(e.target.value)}
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
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Explique o que aconteceu e em qual tela."
          />
        </label>
        {status === 'success' && <span className="success">Relato enviado ao administrador.</span>}
        {status === 'error' && <span className="error">{error}</span>}
        <button disabled={status === 'sending'}>
          <Send size={17} />
          {status === 'sending' ? 'Enviando...' : 'Enviar relato'}
        </button>
      </S.Report>
    </S.Root>
  );
}
