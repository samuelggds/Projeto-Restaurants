/**
 * Customer/employee-facing NFC language.
 * Backend errors and HTTP codes remain unchanged for observability and security.
 * Only reviewed, actionable messages are exposed to the interface.
 */
type NfcApiFailure = {
  response?: { status?: number; data?: { error?: unknown; message?: unknown } };
  message?: unknown;
};

export function nfcFriendlyError(
  cause: unknown,
  fallback = 'Não foi possível concluir esta ação. Tente novamente.',
): string {
  const failure = (cause || {}) as NfcApiFailure;
  const code = failure.response?.status;
  const value = failure.response?.data?.error ?? failure.response?.data?.message ?? failure.message;
  const raw = typeof value === 'string' ? value : '';

  if (/itens diferentes|produtos.*confirmados|chave.*outro pedido/i.test(raw))
    return 'Os itens deste pedido foram alterados. Confira a sacola e faça uma nova confirmação.';
  if (/muitas tentativas|temporariamente bloquead|bloquead[oa].*tentativa/i.test(raw))
    return 'Por segurança, a confirmação está temporariamente indisponível. Aguarde alguns minutos e tente novamente.';
  if (/confirmac[aã]o.*expirad|confirmação já utilizada|prazo.*encerrad/i.test(raw))
    return 'O prazo para confirmar terminou. Revise o pedido e confirme novamente.';
  if (/cpf.*(incorret|inv[aá]lid|n[aã]o confirmad)|c[oó]digo n[aã]o confirmad/i.test(raw))
    return 'Não foi possível confirmar os dados. Confira o CPF e tente novamente.';
  if (/cliente j[aá] cadastrado|cpf j[aá].*cadastrad/i.test(raw))
    return 'Este CPF já possui cadastro. Procure o cliente na opção “Já cadastrado”.';
  if (/cadastro arquivad/i.test(raw))
    return 'Este cadastro está arquivado. Peça ao administrador para recuperá-lo.';
  if (/cart[aã]o.*(revogad|n[aã]o encontrad|inv[aá]lid|n[aã]o est[aá] ativ)/i.test(raw))
    return 'Não foi possível identificar este cartão. Confira com a equipe do restaurante.';
  if (/comanda.*(pend[eê]n|vencid)|pagamento.*n[aã]o confirmad|quitação.*pendente/i.test(raw))
    return 'Há uma pendência na comanda. Confira os pagamentos antes de continuar.';
  if (/n[aã]o possui acesso|sem permiss[aã]o|somente o administrador/i.test(raw))
    return 'Esta ação está disponível somente para pessoas autorizadas.';

  if (code === 401) return 'Sua sessão terminou. Entre novamente para continuar.';
  if (code === 429) return 'Muitas tentativas seguidas. Aguarde um pouco antes de tentar novamente.';
  if (code === 403) return 'Não foi possível autorizar esta ação. Confira os dados ou peça ajuda ao responsável.';
  if (code === 404) return 'Não encontramos este registro no restaurante. Atualize a página e tente novamente.';
  if (code === 422 || code === 400) return 'Confira as informações preenchidas e tente novamente.';
  if (code === 409) return 'As informações mudaram durante o atendimento. Atualize e tente novamente.';

  // Do not display raw backend, database, network or infrastructure exceptions.
  return fallback;
}

const orderStatuses: Record<string, string> = {
  PENDENTE: 'Recebido',
  PREPARANDO: 'Em preparo',
  PRONTO: 'Pronto para servir',
  SAIU_PARA_ENTREGA: 'Saiu para entrega',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
  CANCELLED: 'Cancelado',
  OPEN: 'Em atendimento',
  UNPAID: 'Aguardando pagamento',
  PAID: 'Pago',
};
export const nfcFriendlyOrderStatus = (status: string) =>
  orderStatuses[status] || 'Acompanhe com a equipe';
