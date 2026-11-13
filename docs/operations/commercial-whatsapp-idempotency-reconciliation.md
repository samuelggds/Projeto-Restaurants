# WhatsApp comercial — concorrência, idempotência e reconciliação

## Escopo
Esta homologação abrange exclusivamente o WhatsApp **comercial da plataforma**. Não altera pagamentos, NFC, SMS, notificações dos restaurantes ou credenciais existentes.

## Entrada: webhook concorrente
- O ID da mensagem entregue pela Evolution é obrigatório. Webhook sem ID não cria mensagem nem resposta automática.
- O banco grava a mensagem com unicidade por `providerMessageId`, usando `createMany(..., skipDuplicates: true)`.
- Mensagem de entrada e intenção de resposta entram na mesma transação PostgreSQL. A segunda entrega da mesma mensagem não gera outro item de fila.
- `HUMAN` e `CLOSED` permanecem sem resposta do bot.

## Saída: sem repetição de tentativa ambígua
- A outbox usa reserva `lockToken` e um intervalo mínimo global de 15 segundos.
- Antes de chamar a Evolution, o worker condiciona a transição `PENDING -> UNCERTAIN` ao `lockToken` e ao estado atual da conversa.
- Se a Evolution confirmar e o commit de `SENT` for bem-sucedido, o item vira `SENT` e o histórico registra uma resposta.
- Se o provedor falhar, responder com timeout, aceitar a mensagem mas perder a resposta HTTP, ou o banco falhar após o envio, o item fica `UNCERTAIN`. **Não deve ser automaticamente reenviado.**
- Como a Evolution/Baileys não fornece garantia comprovada de idempotência nessa integração, `UNCERTAIN` quer dizer `entrega desconhecida`, e **não** `entrega falhou`.
- As conversas do Super Admin expõem metadados de itens incertos, sem payload do provedor ou valores de credenciais.

## Reconciliação manual de UNCERTAIN
1. Verifique a mensagem no próprio dispositivo comercial/registro confiável da Evolution, usando conversa, horário e conteúdo já autorizado ao atendente. Não registre CPFs, tokens ou transcrições em tickets.
2. Se o envio foi confirmado, um operador deverá reconciliar de forma auditada antes de encerrar o incidente. A implementação atual **não fornece endpoint para modificar manualmente o estado**; não altere linhas em produção por tentativa e erro.
3. Se não for possível determinar o resultado, mantenha a ocorrência como `UNCERTAIN`, informe a equipe e evite disparo automático com a mesma intenção.
4. Não ative um retry automático para `UNCERTAIN` apenas para zerar a fila. Qualquer mecanismo de reconciliação automática exige identificador retornado pelo provedor e garantias adicionais.

## Limitações conhecidas
- Há uma pequena janela entre a última verificação de modo BOT/HUMAN e o envio HTTP efetivo. Evitar totalmente mensagens após takeover exigirá serialização entre mudança de modo e chamada externa, ainda a validar.
- Se a requisição falhar antes de ser transmitida, o estado pode ser conservador demais e continuar incerto, sacrificando disponibilidade para prevenir duplicações.
- `UNCERTAIN` não prova entrega exatamente uma vez: é um mecanismo para prevenir reenvio automático depois de resultado ambíguo.

## Testes e aceite
A suíte `backend/src/e2e/multiTenant/commercialWhatsappConcurrency.e2e.ts` utiliza banco PostgreSQL descartável, provedor simulado e somente identificadores fictícios. Exercita:
- 8 webhooks simultâneos para a mesma mensagem;
- webhook sem ID;
- supressão BOT -> HUMAN;
- timeout de 10 minutos em duas réplicas e manutenção de takeover manual;
- 503 da Evolution com ausência de retry;
- resposta remota positiva seguida de falha transacional no banco;
- dois workers disputando uma única linha da fila.

Somente aprovar após CI completo, revisão de segurança e ensaio adicional das limitações de takeover; não realizar testes sobre conversas reais ou produção.

## Detecção do atendimento humano pelo número comercial
- O webhook autenticado da instância comercial da GastroNexa recebe mensagens enviadas pelo próprio dispositivo com `fromMe=true`. A conversa é identificada pelo `remoteJid` do cliente; **não** pelo número próprio como destinatário.
- Se o `providerMessageId` já existir no histórico de saídas automatizadas, o eco é ignorado. Há uma verificação adicional de coincidência exata com uma resposta automática recente da outbox para mitigar ecos que chegam antes da confirmação do provedor. Esse fallback **não é prova de origem**: mensagens humanas de texto idêntico podem ser confundidas; é um risco a validar em homologação da Evolution real.
- Mensagem manual nova entra como `MANUAL_DEVICE`, altera o modo para `HUMAN` e cancela respostas automáticas ainda pendentes.
- Qualquer resposta humana posterior, seja pelo dispositivo ou pelo painel Super Admin, renova `handoffRequestedAt`. Mensagens recebidas do cliente **não** renovam esse relógio.
- Após 10 minutos de inatividade humana, o worker converte `HUMAN -> BOT` atomicamente e **sem mensagem de aviso**. A IA responderá somente ao próximo contato do cliente.
- A cada retomada concorrente o predicado de timestamp impede dois workers de reativar a conversa.
- O takeover ainda possui uma janela concorrente entre autorização final e transmissão externa: deve permanecer como risco pendente até que seja possível serializar de forma confiável a transição de modo com o despacho.
- Nunca afirmar que uma mudança nesta branch já está em produção. O PR #451 precisa passar no CI e ser homologado antes de merge/deploy.
