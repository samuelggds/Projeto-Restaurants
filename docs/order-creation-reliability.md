# Criação de pedidos e segurança do deploy

## Contrato de criação

O cliente atual envia `Idempotency-Key` em `POST /orders`, `POST /orders/pix/payment`
e `POST /orders/card/checkout`. A chave possui 16–128
caracteres alfanuméricos, hífen ou underscore. Para convidado sem autenticação,
também envia `X-Order-Session`, uma identidade aleatória do navegador com pelo menos
32 caracteres. Usuários autenticados e participantes de mesa usam o identificador
validado pelo servidor como escopo; nenhum campo do body escolhe esse ator.

O servidor persiste hashes da chave, do ator e do conteúdo junto ao pedido, na mesma
transação de estoque, cupom e impressão. A unicidade é por restaurante + ator + chave.
Repetir o mesmo conteúdo retorna o mesmo pedido; conteúdo diferente retorna HTTP 409
com `IDEMPOTENCY_CONFLICT`. A repetição não reemite os eventos posteriores ao commit.
As autorizações e bloqueios de acesso continuam obrigatórios antes da recuperação.

O frontend mantém a chave após falha e recarga, e a descarta após sucesso. Duas chamadas
simultâneas da mesma tentativa compartilham a requisição. Se o navegador bloquear o
armazenamento, a proteção contra reenvio permanece na aba atual.
Em origens HTTP da rede local sem WebCrypto SHA-256, a tentativa também fica apenas
na memória da aba; o conteúdo do carrinho e os dados pessoais não são persistidos.
Use HTTPS para conservar essa proteção após recarregar a página nesses dispositivos.
Os campos internos `creationRequestKey`, `creationActor` e `creationFingerprint` não
fazem parte da resposta de criação nem dos eventos publicados por esse fluxo.

Clientes antigos sem header continuam aceitos, mas precisam adotar o contrato para
obter essa garantia. O fingerprint do checkout também inclui a operação PIX/cartão,
impedindo reaproveitar a mesma chave para efeitos financeiros distintos.

No checkout online, apenas a criação vencedora pode chamar o gateway. O reenvio
recupera o pedido e retorna `PAYMENT_CREATION_UNCERTAIN` com seu ID e, quando
aplicável, os tokens de acesso do visitante. Isso vale também quando o primeiro
processo caiu após criar o pedido e antes de receber a resposta externa. O frontend
preserva a chave em falhas de rede sem resposta; quando recebe a identificação do
pedido pendente, conclui a tentativa e oferece consulta ao mesmo pedido. Não repete
a cobrança nem reconstrói automaticamente o QR/URL anterior. Webhook, consulta ao
provedor ou revisão operacional precisam esclarecer o estado financeiro.

Conflitos Prisma P2034 são repetidos até quatro execuções da transação com espera
crescente. Colisão no índice da tentativa também reinicia a transação. Outras falhas
não são repetidas automaticamente. Erro interno na criação retorna mensagem genérica
e requestId; validações de negócio e conflito usam respostas 400/409.

## Implantação

1. Faça backup e valide a migration `20260908110000_order_creation_idempotency` em teste.
2. Aplique a migration antes de publicar o código que seleciona os novos campos.
3. Atualize o frontend e confirme que duas chamadas com a mesma chave retornam o mesmo ID.
4. Mantenha as colunas/índice se precisar voltar à versão anterior da aplicação; a
   migration é aditiva e não precisa ser desfeita para esse rollback.

## Evidência necessária

- Suíte unitária: fingerprint/ator, repetição limitada, conteúdo conflitante e retry do cliente.
- Suíte multi-tenant HTTP: duas criações concorrentes, reenvio posterior e conteúdo diferente.
- Execute `npm run test:e2e:tenant` em PostgreSQL descartável para comprovar o índice e as transações reais.
- Os testes não comprovam entrega exatamente uma vez de eventos Socket.IO: um processo
  pode cair entre o commit e a emissão; polling/reconsulta continuam necessários.

## Proteção administrativa da main

O arquivo `.github/rulesets/main.json` é uma configuração pronta para importar no GitHub
em Settings → Rules → Rulesets. Exige PR, resolução das conversas e aprovação do check
`Full Root CI Validation`, bloqueando exclusão e force-push, sem bypass configurado.
Permite zero aprovações humanas para não impedir manutenção por um único responsável.
Revise regras existentes antes de importar; não remova proteções mais fortes.

A existência do JSON e do workflow não ativa a regra. A ativação e sua conferência
exigem sessão administrativa autenticada no GitHub.

Em 09/09/2026 a regra foi ativada e as quatro proteções foram verificadas na branch
pela API administrativa: [ruleset 22624473](https://github.com/samuelggds/Projeto-Restaurants/rules/22624473).
O registro está em [main-protection-verification.json](../artifacts/main-protection-verification.json).
