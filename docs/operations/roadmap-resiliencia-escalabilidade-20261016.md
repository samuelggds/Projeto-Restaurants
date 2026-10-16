# GastroNexa — plano integrado de confiabilidade e escalabilidade

Data: 16/10/2026. Base verificada: `main` em `79b860fd2078d64af60c858bb58dc3bad782282e`, PR #326 mesclado. Este documento é uma triagem técnica e um plano de trabalho: não certifica execução em produção, nem transforma hipóteses em falhas confirmadas.

## Escopo

Consolidar os cenários discutidos: 1.000 visitantes de cardápios, preço atualizado, cache/Redis fora do ar, PostgreSQL fora do ar, cobrança aprovada durante queda do banco, webhooks/mensagens duplicadas, concorrência entre workers, transações/rollback, WhatsApp indisponível, Socket.IO desconectado, reconexão da cozinha com eventos perdidos, polling de 300 painéis, RabbitMQ, Kubernetes, testes de carga, recuperação e alertas.

**Regra de operação:** o fluxo principal dos pedidos da GastroNexa é o painel da cozinha. WhatsApp é integração auxiliar e não pode determinar se a cozinha recebe um pedido.

## Estado já existente — NÃO reimplementar sem evidência

| Tema | Evidência atual | Limite da garantia |
| --- | --- | --- |
| Idempotência na criação | `docs/order-creation-reliability.md`, migration `20260908110000_order_creation_idempotency` e serviços de pedidos. Chave por restaurante + ator + tentativa, índice de unicidade, conflitos 409, retries transacionais. | Clientes antigos sem `Idempotency-Key` não têm a mesma garantia; chave nova representa nova tentativa. |
| Concorrência/transações | `CreateOrderService.ts` usa transações `Serializable`; fluxo documentado protege estoque/cupom e criação. | Verificar todas as demais rotas de escrita, não assumir cobertura global. |
| Pagamento incerto | Existe retorno `PAYMENT_CREATION_UNCERTAIN`, recuperação de pedido e conciliação prevista; documentado que não se repete cobrança automaticamente. | Precisamos comprovar cada provedor/fluxo real em sandbox e quando o banco está fora. |
| Notificações | `notificationOutbox.ts` usa persistência PostgreSQL, reserva por worker, deduplicação, tentativas limitadas e backoff. | `docs/security-and-scale-implementation.md` registra janela entre commit do domínio e enfileiramento; ainda exige correção. |
| Multi-tenant | `restaurantId`, escopos de acesso, testes de isolamento e RLS parcial. | RLS não abrange automaticamente todas as tabelas; requer testes de regressão. |
| Tempo real | Socket.IO com relay PostgreSQL documentado e consulta periódica da cozinha. | Eventos podem ser perdidos entre commit e publicação; a API é a fonte canônica. |
| Disponibilidade | `/health` e `/ready` existentes; UptimeRobot para site, health e ready, notificações de teste por email verificadas na auditoria operacional. | Falta homologar alarmes internos de infraestrutura e testes de restauração de backup real do S3. |
| Capacidade | Documentado ensaio local de 120 restaurantes e 600 pedidos/minuto, sem gateway real. | Não representa homologação da instância Lightsail atual nem picos prolongados. |

Referências: `frontend/src/pages/kitchen/KitchenPage.tsx`, `frontend/src/pages/kitchen/KitchenPage.test.tsx`, `docs/order-creation-reliability.md`, `docs/security-and-scale-implementation.md`, `docs/lightsail-production-deploy.md`, `GO_LIVE_CRITERIA_100_RESTAURANTS.md`.

## P0 — correções para não perder pedidos nem dinheiro

### P0-A — recuperar a fila da cozinha após perda do Socket.IO

**Correção incluída nesta branch:** reconsulta completa imediatamente no evento `connect`, inclusive reconexões; polling de segurança a cada 30 segundos quando conectado, e a cada 10 segundos quando desconectado/conectando. Preserva o controle de requisição mais nova, a consulta autenticada à API e o isolamento já implementado pelo backend. Nenhuma atualização integral do navegador é exigida.

**Testar:** cinco pedidos gravados durante dois minutos offline aparecem após reconexão; evento duplicado não duplica pedido; resposta antiga não sobrepõe nova; Socket permanece offline e a API continua acessível; reconexão de aba adormecida. Os intervalos são valores iniciais, sujeitos a telemetria e carga.

### P0-B — enfileiramento de eventos/notificações sem janela de perda

**Lacuna confirmada na documentação:** hoje o commit do domínio pode ocorrer antes de a notificação ser efetivamente enfileirada. Evoluir para **transactional outbox**, gravando evento de domínio e pedido na mesma transação, ou reconciliação comprovadamente equivalente. Retirar o evento da fila apenas após confirmação do destino; retries limitados, backoff, DLQ/registro operacional e retenção. Não executar integração externa dentro da transação de banco.

**Aceitação:** derrubar o processo entre commit e publicação não perde a intenção de notificar; repetição não duplica efeitos financeiros nem pedidos; consentimento WhatsApp e isolamento de tenant permanecem válidos; testes com PostgreSQL real.

### P0-C — reconciliação financeira e indisponibilidade do PostgreSQL

Auditar separadamente PIX/card, mesa, retirada, delivery e webhooks do Mercado Pago e outros gateways habilitados. Assegurar registro durável da tentativa/pedido **antes** de solicitar cobrança, sempre que o fluxo permitir. Quando o banco estiver indisponível, impedir novos checkouts não recuperáveis, apresentar indisponibilidade temporária e **não** afirmar que pagamento confirmado foi desfeito. Para cobrança cujo estado está incerto, consultar provedor com identificador estável, reconciliar após a recuperação, e não pedir novo pagamento automaticamente. Reembolso exige confirmação do estado remoto e regras apropriadas.

**Aceitação:** falha do banco antes/durante/depois da confirmação e webhook duplicado/fora de ordem não produzem duas cobranças ou dois pedidos; uma cobrança real aprovada não desaparece sem rastreabilidade; transições são idempotentes e auditáveis; avisos para clientes não declaram sucesso indevido.

### P0-D — integridade de gravações e controle por restaurante

Revisar transações de pedido, itens, preço recalculado no backend, estoque, cupom, status, fechamento e estornos. `UNIQUE`, atualização condicional e transações devem proteger concorrência real, independentemente de `findUnique` ou botão desabilitado no React. Validar mesmo pagamento com dois workers e diferentes restaurantes/contas do gateway, sem vazamento cruzado.

**Aceitação:** pedido e itens gravam integralmente ou fazem rollback; operações financeiras externas não são tratadas como parte reversível da transação PostgreSQL; testes concorrentes multi-tenant passam.

## P1 — degradação controlada e eficiência

### P1-A — cache público por restaurante, sem vazamento

Antes de Redis, medir tráfego e consultas repetidas em catálogo. Considerar cabeçalhos HTTP/ETag e cache de catálogo `restaurantId + versão de catálogo`, TTL e invalidação após confirmação de alterações em produtos, preços, categorias e disponibilidade. Não armazenar dados privados ou de checkout em cache compartilhado; respeitar `Cache-Control: private, no-store` implantado no PR #326. No checkout, recalcular preço e disponibilidade no backend.

**Aceitação:** alteração de pizza R$40→R$50 aparece no catálogo sem retornar valor obsoleto após invalidação; inatividade do cache usa PostgreSQL com limites/pool sem derrubar pedidos; proteção contra cache stampede e isolamento entre restaurantes.

### P1-B — sincronização da cozinha, carga de polling e estados degradados

Após reconexão, buscar fonte canônica com deduplicação e ordenação por IDs/estado; medir atraso entre commit e exibição. Ao ficar offline, sinalizar atraso e continuar tentando API, sem recarregar página; impedir consultas sobrepostas excessivas, usar jitter/backoff em erros 429/5xx e pausa consciente em abas inativas quando seguro. O polling a cada 10 s é baseline provisório. Medir grupos de centenas de painéis para não gerar picos sincronizados.

**Aceitação:** sem pedidos perdidos após falhas de 2–5 min; reconciliação funciona após perda de todos os eventos; refresh não mistura tenants; limites sustentam painéis simultâneos.

### P1-C — manutenção, prontidão e recuperação operacional

Revisar `/ready` e seus indicadores, tratamento de banco indisponível, tempo de espera de consultas, conexões e rate limits. Alertas para API/site, falhas de status da instância, CPU sustentada, burst, RAM/disco, erros 5xx, p95/p99, backlog/idade de outbox, falha de worker, pagamentos pendentes e reconciliação. Exercitar restauração de dump criptografado **real enviado ao S3** em ambiente isolado; registrar RPO/RTO e procedimento de recuperação de chaves.

## P2 — escalar somente com medições

1. Executar testes separados: 1.000 acessos ao catálogo, 1.000 checkouts simultâneos **simulados**, 300 painéis da cozinha, picos de reconexão Socket.IO, filas e estado degradado. Medir p95/p99, taxa de erro, CPU/RAM/disco, conexões PostgreSQL, deadlocks, tempo até exibir pedido, capacidade de burst e atraso das notificações.
2. Rever índices e consultas por `restaurantId`, pool total das réplicas/worker e gargalos reais; separar arquivos/imagens do caminho transacional.
3. Manter PostgreSQL + Docker + relay/outbox existentes enquanto atenderem às metas. **RabbitMQ** só se houver necessidade observada de fluxos/filas independentes, vazão, retenção e roteamento avançado; se adotado, usar durabilidade, ACK, DLQ, idempotência, observabilidade e plano de operação.
4. **Redis** só para um problema medido de latência/tráfego/coordenação que não seja resolvido com cache HTTP e PostgreSQL; sempre com comportamento seguro em falhas.
5. **Kubernetes** só se a complexidade de muitas réplicas/serviços, autoscaling e operação justificar custo e suporte; não é requisito para centenas de restaurantes.
6. Balanceador, duas réplicas, relay compartilhado, websockets sem polling de transporte, deploy gradual e rollback devem ser homologados em ambiente apropriado antes de escala.

## Testes de queda PostgreSQL e conciliação financeira — especificados

A matriz operacional detalhada contém **11 cenários DB-01 a DB-11**, incluindo pedido já persistido, recusa segura de checkout sem banco, Pix aprovado com confirmação local perdida, timeout do gateway, webhooks concorrentes, crash antes da publicação, reconexão da cozinha, rollback, restauração do S3, retomada de workers e isolamento multi-tenant.

**[Abrir plano de testes com pré-condições, injeção de falhas e critérios PASS/FAIL](./postgresql-outage-payment-recovery-test-plan.md).**  
Rastreado nas issues [#328](https://github.com/samuelggds/Projeto-Restaurants/issues/328), [#329](https://github.com/samuelggds/Projeto-Restaurants/issues/329), [#331](https://github.com/samuelggds/Projeto-Restaurants/issues/331) e [#332](https://github.com/samuelggds/Projeto-Restaurants/issues/332).

Esses cenários ainda **não foram executados**. A política prevista mantém o checkout indisponível durante ausência de persistência confiável; não confirma novas vendas por memória local. Garantia de pedidos previamente confirmados depende da durabilidade do commit e, diante de perda física dos dados, do RPO/RTO e da restauração do backup. Eventos e pagamentos externos precisam de reconciliação e idempotência próprias.

## Matriz de testes de falha — obrigatório antes de afirmar confiabilidade

| Cenário | Resultado esperado |
| --- | --- |
| Dois POST idênticos concorrentes, mesma chave | Exatamente um pedido; o repetido recupera o mesmo ID. |
| Mesma chave com payload diferente | 409, sem alteração indevida. |
| Dois workers recebem confirmação PIX repetida | Um efeito financeiro/pedido; conflitos tratados no banco. |
| Timeout do gateway após aceitar cobrança | Estado incerto e conciliação; nunca criar nova cobrança às cegas. |
| Banco cai após pagamento aprovado | Registro conciliável, nenhuma segunda cobrança e mensagem honesta ao cliente. |
| Erro no terceiro item do pedido | Rollback de pedido e itens, sem registro parcial. |
| WhatsApp indisponível | Cozinha continua com pedidos; outbox tenta novamente sem bloquear venda. |
| Processo cai após commit e antes do evento | Outbox/reconciliador preserva notificação. |
| WebSocket cai 2 minutos, cinco pedidos entram | Polling ou reconsulta após `connect` recupera todos os cinco. |
| 300 cozinhas passam ao fallback | Tráfego limitado, sem rajadas destrutivas; pedido permanece visível. |
| Catálogo alterado em um restaurante | Outro restaurante não é afetado; preço atualizado; checkout autoritativo. |
| Cache fica fora do ar | Leituras permitidas usam PostgreSQL sem quebrar escopos ou saturar o banco. |
| Restauração do backup externo | Banco recuperado em infraestrutura isolada; chaves, tabelas, FKs e RLS validados. |

## Decisões complementares — mensageria, RabbitMQ, Redis e Kubernetes

Além do plano de correção, foi elaborado um **registro de decisão de arquitetura (ADR)** com as perguntas e as respostas discutidas, critérios de adoção das ferramentas e testes exigidos: [Mensageria, cache e escalabilidade](../architecture/adr-20261016-messaging-cache-scaling.md).

- Mensageria assíncrona, workers, ACK, retry, backoff, DLQ, duplicidade e fila PostgreSQL: [issue #332](https://github.com/samuelggds/Projeto-Restaurants/issues/332); a correção da janela de perda no commit continua em [#328](https://github.com/samuelggds/Projeto-Restaurants/issues/328).
- Redis, catálogo e invalidação de cache por `restaurantId`, fallback e limite de requisições: [issue #330](https://github.com/samuelggds/Projeto-Restaurants/issues/330).
- Balanceamento, pools, réplicas Node.js, testes de carga, failover e avaliação **condicional** de Kubernetes: [issue #333](https://github.com/samuelggds/Projeto-Restaurants/issues/333).
- Pagamentos, webhook e concorrência entre workers: [issue #329](https://github.com/samuelggds/Projeto-Restaurants/issues/329).
- Alertas e recuperação de desastres: [issue #331](https://github.com/samuelggds/Projeto-Restaurants/issues/331).

**Decisão atual:** aproveitar o PostgreSQL/outbox e Docker existentes; não instalar RabbitMQ, Redis ou Kubernetes por antecipação. Essa decisão será revisada com medições de homologação e análise do custo adicional, não por hipótese de carga.

## Sequência de execução

- [x] Identificar no código proteções existentes e documentação do PR #326.
- [x] Implementar recuperação imediata de pedidos na reconexão e polling de fallback na cozinha, nesta branch.
- [x] Adicionar testes dirigidos para sincronização e intervalos de fallback **ao código**. **Execução no CI ainda pendente.**
- [ ] Validar CI, lint sem warnings, typecheck, testes unitários/integração/E2E, segurança e RLS.
- [ ] Integrar outbox atômica/reconciliador sem alterar regras de pagamento, consentimento ou tenants.
- [ ] Homologar estados financeiros incertos, webhooks e concorrência em sandbox.
- [ ] Medir catálogo/cache e implementar apenas otimizações justificadas.
- [ ] Simular falhas e carga prolongada em ambiente não produtivo; validar restauração real do S3.
- [ ] Revisar alarmes Lightsail restantes; manter UptimeRobot existente.
- [ ] Só depois discutir implantação controlada e custos, sem ampliar a instância por suposição.

**Restrições:** não afrouxar lint/typecheck/CI/E2E, não remover isolamento por `restaurantId` ou RLS, não alterar sem testes a integração Mercado Pago/Lalamove, não executar testes de carga contra a produção, não registrar segredos/tokens em logs, não aplicar deploy automático.
