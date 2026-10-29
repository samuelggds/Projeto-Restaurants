# Homologação real NFC — bloqueadores antes da primeira cobrança

O PR #399 habilita a seleção QR/NFC/Ambos e integra o envio do código na recepção.
**Não significa que Pix/Point NFC estejam prontos.** Não habilitar a cobrança online ou
considerar uma comanda quitada por uma resposta do frontend.

## Implementação financeira exigida

1. Gerar um `NfcCashlessPayment` exclusivo por restaurante, comanda e chave de
   idempotência; congelar os centavos do saldo cobrado e criar uma única reserva ativa.
2. Pix: solicitar cobrança ao Mercado Pago usando exclusivamente o OAuth do
   restaurante, `external_reference` inequívoca, `X-Idempotency-Key` estável,
   moeda BRL e quantia em centavos. Persistir o identificador e o QR retornado.
   Se a resposta se perder, recuperar no provedor antes de repetir a solicitação.
3. Point: escolher terminal autorizado do mesmo restaurante, solicitar a
   cobrança no dispositivo com `external_reference` inequívoca e referência
   persistida. Tratar cancelamento, desconexão, timeout e duplicidade.
4. Webhook: verificar assinatura MP, buscar a transação diretamente pelo
   token OAuth do mesmo restaurante, comparar referência externa, método,
   moeda e valor exato. Não confiar em payload HTTP nem retorno do navegador.
5. Liquidação: em transação serializável, bloquear comanda e cobrança;
   confirmar no máximo uma vez, criar lançamento imutável e incrementar
   `paidCents` sem exceder `totalCents`. Não combinar saldos QR e NFC.
6. Reembolso/chargeback: estornar lançamento exatamente uma vez, reabrir
   dívida e bloquear fechamento automático de comanda não quitada.
7. Worker: reconciliar periodicamente cobranças `RESERVED`/`PROCESSING`
   e detectar transações pagas não registradas; registrar anomalias para
   investigação sem revelar dados pessoais ou credenciais.
8. Testes unitários, multi-tenant, E2E com PostgreSQL RLS e concorrência:
   requisições duplicadas, webhook repetido, reconciliação simultânea,
   resposta perdida, tentativa com valor diferente, pedido de outro tenant,
   pagamento parcial e transações estornadas.

## Roteiro de teste com valores pequenos em produção

- Criar restaurante de teste com conta Mercado Pago e terminal Point próprios
  vinculados e funcionalidade homologada.
- Confirmar conexão WhatsApp autorizada, envio de código e acesso a comanda
  apenas pelo QR oficial da mesa.
- Abrir comanda NFC com couvert e dois produtos de teste.
- Cobrar Pix, confirmar valor efetivamente recebido na conta e conferir
  saldo no servidor e comprovante. Repetir callback: o total não muda.
- Abrir segunda comanda, pagar na Point, validar confirmação, recibo,
  dispositivo e saldo; simular cancelamento antes de aprovar.
- Confirmar que cliente de outro restaurante não acessa a comanda.
- Estornar cobrança de teste e conferir retorno do saldo e registro histórico.
- Encerrar e devolver o cartão apenas depois da quitação comprovada.

**Critério de liberação**: CI verde, E2E verde, evidência MP Pix e Point
conferida, sem falsas confirmações, sem cobranças duplicadas e rollback
testado. Até lá, não ativar processamento financeiro NFC.
