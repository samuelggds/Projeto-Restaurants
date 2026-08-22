type EmployeeIssuePayload = {
  type?: unknown;
  reporterName?: unknown;
  reporterRole?: unknown;
  subject?: unknown;
  description?: unknown;
};

type EmployeeIssueValidation =
  | { isEmployeeIssue: false }
  | { isEmployeeIssue: true; ok: false; error: string }
  | {
      isEmployeeIssue: true;
      ok: true;
      reporterName: string;
      message: string;
    };

function normalizeText(value: unknown) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function validateEmployeeIssuePayload(
  rawPayload: EmployeeIssuePayload,
): EmployeeIssueValidation {
  if (rawPayload?.type !== 'employee-issue') return { isEmployeeIssue: false };

  const reporterName = normalizeText(rawPayload.reporterName);
  const reporterRole = normalizeText(rawPayload.reporterRole);
  const subject = normalizeText(rawPayload.subject);
  const description = normalizeText(rawPayload.description);

  if (reporterName.length < 3 || reporterName.length > 100) {
    return { isEmployeeIssue: true, ok: false, error: 'Informe seu nome para enviar o relato.' };
  }

  const reporterRoleLabel =
    reporterRole === 'kitchen'
      ? 'Cozinheiro'
      : reporterRole === 'waiter'
        ? 'Garçom'
        : reporterRole === 'courier'
          ? 'Motoqueiro'
          : null;

  if (!reporterRoleLabel) {
    return { isEmployeeIssue: true, ok: false, error: 'Função do funcionário inválida.' };
  }

  if (subject.length < 3 || subject.length > 100) {
    return { isEmployeeIssue: true, ok: false, error: 'Informe um assunto válido para o relato.' };
  }

  if (description.length < 5 || description.length > 900) {
    return {
      isEmployeeIssue: true,
      ok: false,
      error: 'Explique o problema com pelo menos 5 caracteres (máx. 900).',
    };
  }

  return {
    isEmployeeIssue: true,
    ok: true,
    reporterName,
    message: `Relato de problema\nRemetente: ${reporterName} (${reporterRoleLabel})\nAssunto: ${subject}\nDescrição: ${description}`,
  };
}
