const publicMessages = new Set([
  'Assinatura não encontrada.',
  'Assinatura cancelada não pode ativar renovação automática.',
  'Dados do cartão inválidos.',
  'Validade do cartão inválida.',
]);

export function recurringBillingError(error: unknown, fallback: string) {
  return error instanceof Error && publicMessages.has(error.message) ? error.message : fallback;
}
