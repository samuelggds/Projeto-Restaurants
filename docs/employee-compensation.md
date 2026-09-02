# Remuneração, acertos e pagamentos de funcionários

Este módulo é um **livro-razão operacional** para registrar políticas internas, horas,
comissões de garçom, ajustes, acertos mensais e pagamentos. Ele **não é uma engine de
folha trabalhista, fiscal ou legal**: não calcula encargos, férias, décimo terceiro,
benefícios obrigatórios, retenções ou obrigações acessórias.

`courierCompensation` continua sendo a única fonte de remuneração e acertos de
`MOTOQUEIRO`. Este módulo aceita somente usuários `FUNCIONARIO`.

## Valores e arredondamento

- Valores novos são persistidos em `BigInt`, sempre em centavos.
- Percentuais são inteiros em basis points: `10000 = 100%` e `500 = 5%`.
- Percentuais e minutos usam divisão inteira com arredondamento half-up.
- A API aceita centavos como inteiro seguro ou string decimal de dígitos.
- A serialização converte `BigInt` somente quando o valor cabe em um `number` seguro.

## Políticas versionadas

`EmployeeCompensationPolicy` combina um modelo base e, somente para `GARCOM`, um
modelo variável.

Modelos base:

- `NONE`;
- `FIXED_MONTHLY`, com valor mensal e prorrateio opcional por dias corridos;
- `HOURLY`, com valor por hora aplicado aos minutos aprovados.

Modelos variáveis de garçom:

- `NONE`;
- `SERVICE_FEE_PERCENTAGE`, sobre a taxa de serviço efetivamente paga;
- `FIXED_PER_TABLE`, uma vez por mesa fechada e integralmente paga;
- `TABLE_SALES_PERCENTAGE`, sobre os itens elegíveis e efetivamente pagos da mesa.

Uma alteração cria nova versão e encerra a anterior. Ganhos guardam `policyId`,
`policyVersion`, base financeira, percentual aplicado e snapshot JSON. Alterações
futuras nunca recalculam créditos históricos.

Ao retirar o subcargo `GARCOM`, a parte variável da política é encerrada. Se o usuário
continuar `FUNCIONARIO`, uma nova versão preserva a base mensal/horária com variável
`NONE`. Ao sair de `FUNCIONARIO` ou ser desativado, a política é encerrada. A operação
é bloqueada enquanto o garçom ainda responde por uma sessão `OPEN` ou
`CLOSING_REQUESTED`; a mesa precisa ser transferida antes.

## Responsabilidade por mesa

`TableWaiterAssignment` mantém o histórico explícito de responsabilidade. O campo
`TableServiceCall.assignedToId` pertence ao fluxo de chamados e não participa de
comissões.

- Se uma mesa é aberta por um `FUNCIONARIO/GARCOM` ativo, ele é atribuído na mesma
  transação da abertura.
- Um admin pode atribuir ou transferir a mesa enquanto a sessão está aberta.
- Transferências encerram o registro anterior e exigem motivo.
- O garçom responsável quando a conta se torna elegível recebe o lançamento.

## Fonte financeira canônica

O navegador não informa vendas, taxa de serviço nem comissão. O projetor lê somente:

- `TableBillItem.unitPriceCents` com estado financeiro canônico;
- `TablePaymentIntent.serviceFeeCents` em pagamento `PAID`;
- status do pedido e da `TableSession`;
- histórico de `TableWaiterAssignment`;
- política efetiva no instante de elegibilidade.

A projeção ocorre no fechamento normal, no fechamento administrativo e depois de
toda projeção financeira da conta, incluindo confirmação, cancelamento, expiração e
reembolso. Sessão aberta, saldo pendente, consumo cancelado ou ausência de assignment
não geram comissão.

## Horas e lançamentos

`EmployeeWorkEntry` possui os estados `DRAFT`, `APPROVED` e `CANCELED`.

- O admin registra de 1 a 1.440 minutos por funcionário e data.
- O próprio funcionário não pode aprovar suas horas.
- Existe no máximo um lançamento não cancelado por funcionário/dia.
- Um lançamento cancelado libera a data para uma correção sem apagar o histórico.
- Se já existir ganho horário, o cancelamento cria débito compensatório.

`EmployeeEarning` é o ledger de créditos e débitos. Valores financeiros e snapshots
não são editados pelos serviços. Bônus, descontos, adiantamentos e correções entram
como novos registros; cancelamentos e reembolsos entram como débitos vinculados ao
ganho original. Ajustes manuais exigem `Idempotency-Key`.

Um reembolso parcial lança somente a diferença entre o crédito líquido atual e a nova
comissão canônica. Um reembolso total reduz o líquido da mesa a zero. Repetir a mesma
projeção não duplica lançamentos.

## Acertos e pagamentos

`EmployeeSettlement` agrupa os ganhos de uma competência mensal no fuso do
restaurante.

1. `DRAFT`: pode ser regenerado; os itens ainda não estão fechados.
2. `CONFIRMED`: congela os itens e permite pagamento.
3. `PARTIALLY_PAID`: recebeu parte do valor devido.
4. `PAID`: soma dos pagamentos ativos igual ao total devido.
5. `CANCELED`: libera os itens quando não existe pagamento ativo.

O total é `créditos - débitos`. Débitos acima dos créditos precisam ser corrigidos antes
da confirmação. Cada item mantém tipo, direção e valor do earning como snapshot.

`EmployeeSettlementPayment` aceita `PIX`, `CASH`, `BANK_TRANSFER` ou `OTHER`.
Pagamentos são parciais, não podem exceder o saldo e exigem `Idempotency-Key`.
Reversão preserva o pagamento original, registra motivo/ator e recalcula o estado do
acerto. Não há integração bancária nem marcação automática por webhook.

## Rotas

Todas as rotas usam `req.user.restaurantId`; body, query e headers não escolhem tenant.
As rotas administrativas exigem `authMiddleware` e `adminMiddleware`.

- `GET /employee-compensation/admin/policies`
- `GET|POST /employee-compensation/admin/employees/:employeeId/policies`
- `POST /employee-compensation/admin/policies/:publicId/close`
- `GET /employee-compensation/admin/earnings`
- `POST /employee-compensation/admin/earnings/adjustments`
- `GET|POST /employee-compensation/admin/work-entries`
- `POST /employee-compensation/admin/work-entries/:publicId/approve`
- `POST /employee-compensation/admin/work-entries/:publicId/cancel`
- `GET|POST /employee-compensation/admin/settlements`
- `GET /employee-compensation/admin/settlements/:publicId`
- `POST /employee-compensation/admin/settlements/:publicId/confirm`
- `POST /employee-compensation/admin/settlements/:publicId/cancel`
- `POST /employee-compensation/admin/settlements/:publicId/payments`
- `POST /employee-compensation/admin/payments/:publicId/reverse`
- `PUT /employee-compensation/admin/table-sessions/:sessionId/waiter`

Leituras do próprio funcionário derivam `employeeId` do token:

- `GET /employee-compensation/me/earnings`
- `GET /employee-compensation/me/settlements`
- `GET /employee-compensation/me/settlements/:publicId`
- `GET /employee-compensation/me/payments/:publicId`
- `GET /employee-compensation/table-sessions/:sessionId/waiter`

O alias `/employee-payments` permanece montado para compatibilidade de clientes já
existentes, com o mesmo contrato e middlewares.

## Auditoria e isolamento

Criação/encerramento de política, assignment/transferência, aprovação/cancelamento de
horas, ajustes, projeções, acertos e pagamentos registram `AuditLog` na mesma transação.
Hashes de idempotência e fingerprints não são retornados na leitura própria de
pagamento.

As sete tabelas usam `ENABLE ROW LEVEL SECURITY`, `FORCE ROW LEVEL SECURITY`,
`USING` e `WITH CHECK`, falhando fechadas sem `app.restaurant_id`:

- `EmployeeCompensationPolicy`;
- `TableWaiterAssignment`;
- `EmployeeWorkEntry`;
- `EmployeeEarning`;
- `EmployeeSettlement`;
- `EmployeeSettlementItem`;
- `EmployeeSettlementPayment`.

A role runtime deve ser `NOSUPERUSER`, `NOBYPASSRLS` e não pode ser owner dessas
tabelas. As consultas da aplicação também filtram tenant e usam relações/chaves
compostas.

## Implantação e rollback

Validação mínima antes do deploy:

```bash
npm --prefix backend run db:validate
npm --prefix backend run typecheck
npm --prefix backend run test:e2e:rls
npm --prefix backend run test:e2e:tenant
npm run ci
```

O deploy aplica `20260902120000_add_employee_payments`. A migração é forward-only:
remover tabelas descartaria histórico financeiro. Em rollback de aplicação, mantenha o
schema, suspenda novas escritas, preserve/exporte lançamentos e publique uma correção
forward. Nunca altere ou apague earnings, acertos ou pagamentos para “desfazer” uma
operação; use lançamentos e reversões compensatórias.

## Limites explícitos

- Não há cálculo trabalhista, tributário ou contábil legal.
- Não há PIX/banco automático nem upload de comprovante.
- Não há aprovação do pagamento pelo funcionário.
- Não há edição retroativa de earnings; correções são novos lançamentos.
- Permissões administrativas continuam binárias em `ADMIN`; alçadas financeiras mais
  granulares exigem um módulo de autorização próprio.
