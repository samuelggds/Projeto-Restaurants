type ApiError = {
  response?: { data?: { error?: unknown; message?: unknown } };
  message?: unknown;
};

function rawErrorMessage(error: unknown) {
  if (!error || typeof error !== 'object') return '';
  const typed = error as ApiError;
  const responseMessage = typed.response?.data?.error ?? typed.response?.data?.message;
  return typeof responseMessage === 'string' && responseMessage.trim()
    ? responseMessage.trim()
    : typeof typed.message === 'string'
      ? typed.message.trim()
      : '';
}

export function adminErrorMessage(
  error: unknown,
  fallback = 'Não foi possível concluir a operação.',
) {
  const message = rawErrorMessage(error);
  const normalized = message.toLowerCase();

  if (
    normalized.includes('creationrequestkey') ||
    normalized.includes('does not exist in the current database') ||
    normalized.includes('prisma')
  ) {
    return 'O sistema precisa de uma atualização técnica antes de concluir esta ação. Avise o responsável pelo sistema para atualizar o banco de dados e tente novamente.';
  }

  if (
    normalized.includes('não configurado') ||
    normalized.includes('nao configurado') ||
    normalized.includes('credencial') ||
    normalized.includes('access token') ||
    normalized.includes('api key')
  ) {
    return 'A conta de recebimento ainda não está vinculada. Abra Configurações > Pagamentos, conecte a empresa selecionada e tente novamente.';
  }

  if (
    normalized.includes('chave pix') ||
    normalized.includes('pix key') ||
    normalized.includes('pix_key')
  ) {
    return 'A chave Pix do restaurante está ausente ou inválida. Cadastre uma chave válida em Configurações > Pagamentos e tente novamente.';
  }

  if (
    normalized.includes('provedor recusou') ||
    normalized.includes('provider') ||
    normalized.includes('gateway') ||
    normalized.includes('timeout') ||
    normalized.includes('indisponível') ||
    normalized.includes('indisponivel')
  ) {
    return 'O serviço de pagamentos não respondeu agora. Confira se a conta está conectada em Configurações > Pagamentos e tente novamente em instantes.';
  }

  return message || fallback;
}
