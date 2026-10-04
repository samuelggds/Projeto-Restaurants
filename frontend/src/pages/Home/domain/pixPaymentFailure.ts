export type PixPaymentFailurePresentation = {
  title: string;
  message: string;
};

export function pixPaymentFailurePresentation({
  provider,
  status,
  statusDetail,
}: {
  provider?: string | null;
  status?: string | null;
  statusDetail?: string | null;
}): PixPaymentFailurePresentation | null {
  const normalizedProvider = String(provider || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/gu, '_');
  const normalizedStatus = String(status || '').trim().toLowerCase();
  const normalizedDetail = String(statusDetail || '').trim().toLowerCase();

  if (
    normalizedProvider === 'MERCADO_PAGO' &&
    normalizedStatus === 'rejected' &&
    normalizedDetail === 'rejected_high_risk'
  ) {
    return {
      title: 'Pagamento recusado pelo Mercado Pago',
      message:
        'O Mercado Pago não autorizou esta tentativa por análise de segurança. Nenhum pagamento foi confirmado. Aguarde um pouco antes de tentar novamente ou utilize outra conta ou forma de pagamento.',
    };
  }

  return null;
}
