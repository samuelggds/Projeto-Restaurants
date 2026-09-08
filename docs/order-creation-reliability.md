# Criação de pedidos e segurança do deploy

## Contrato de criação

O cliente atual envia `Idempotency-Key` em `POST /orders`. A chave possui 16–128
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

Clientes antigos sem header continuam aceitos, mas precisam adotar o contrato para
obter essa garantia. Os endpoints de criação de checkout Pix/cartão e a operação do
atendente ainda exigem extensão específica do protocolo: eles têm efeitos externos
além de criar o pedido. Não se deve simplesmente repetir uma cobrança externa ao
reaproveitar o pedido. Esta mudança protege o endpoint POST /orders.

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
