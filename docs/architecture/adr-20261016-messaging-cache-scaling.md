# ADR — Mensageria, cache, tempo real e orquestração da GastroNexa
Data: 2026-10-16 | Estado: proposta para revisão, não implantação.

## Contexto e propósito
As discussões sobre filas, RabbitMQ, workers, Redis, falhas de banco, pagamentos, cache, WebSocket, polling, réplicas e Kubernetes foram consolidadas para orientar decisões fundamentadas. A GastroNexa utiliza Node.js/TypeScript, Prisma, PostgreSQL, Socket.IO e Docker no AWS Lightsail. Sem medir carga real, não presumir que um novo broker, cache ou orquestrador resolverá problemas.

## Matriz de decisões

| Tema | Evidência já presente | O que melhorar ou verificar | Adotar nova ferramenta agora? |
| --- | --- | --- | --- |
| Mensageria assíncrona | `NotificationOutbox` persistida em PostgreSQL, workers, reserva, retries/backoff e deduplicação | Eliminar intervalo entre commit de pedido e enfileiramento; métricas/alertas por idade da mensagem, tentativas e falhas; operação segura após restart | Manter solução atual até resolver lacunas |
| RabbitMQ | Não é parte obrigatória do fluxo principal; cozinha lê pedidos via API/Socket | Benchmark de vazão, roteamento de tarefas, prioridades, DLQ, HA, recuperação de mensagens e custo operacional | **Não** instalar sem demanda comprovada |
| Idempotência/concorrência | Contrato `Idempotency-Key`, proteção no PostgreSQL e transações | Repetição e conflito simultâneo com dois workers, reenvio de webhook e retries de checkout, incluindo mesma operação em tenant distinto | Proteger no banco, não por cache ou botão no React |
| Transações/rollback | Criação de pedido com Prisma/PostgreSQL transacional | Garantir pedido, itens, estoque e cupom com commit conjunto; efeitos externos (Mercado Pago/WhatsApp) são reconciliados, não revertidos por rollback local | Não introduzir broker por esse motivo |
| Falha do PostgreSQL | `/ready` já verifica prontidão; fluxos de pagamento incerto previstos | Bloqueio seguro de novos checkouts não recuperáveis, estado correto ao cliente, reconciliação remota, rastreabilidade; teste de 5 minutos offline | Prioridade em resiliência de dados |
| Redis/cache | Não há decisão de uso obrigatória | Medir catálogo repetitivo, ETag/Cache-Control público por tenant, invalidação de preço/categoria/produto, TTL, cache stampede, fallback com limite de conexões; nunca cachear dados privados ou pagamento como fonte de verdade | Redis só após medir benefício |
| WebSocket/cozinha | Socket.IO e polling de segurança; PR #327 adiciona refetch em reconexão | Testes de eventos perdidos, polling 10 s desconectado/30 s conectado, jitter/backoff em indisponibilidade e 300 cozinhas | Manter Socket.IO atual |
| Escalabilidade horizontal | Compose com preparação para múltiplas APIs e relay PostgreSQL; produção observada com uma API | Balanceamento, pooling DB total, rate limit compartilhado, cross-instance Socket.IO, failover e deploy sem interrupção | Réplicas só com métricas |
| Kubernetes | Docker/Lightsail atual com CPU historicamente baixa; sem evidência de gargalo operacional | Comparar custo total, manutenção, logs, readiness, secrets, autoscaling, upgrades, disaster recovery e tamanho de equipe | **Não** adotar agora |
| Observabilidade/DR | `/health`/`/ready`, monitor externo e backup S3 registrados na auditoria | Alarme de worker/outbox/PIX pendente, RAM/disco/CPU, restore real de backup S3 isolado, RPO/RTO | Melhorar antes de escalar |

## Perguntas discutidas — respostas aplicadas à arquitetura

1. **Mil visitantes simultâneos geram mil requisições?** Não necessariamente: cada página pode disparar várias chamadas. Medir RPS, p95, p99, cache hit rate e consultas PostgreSQL, em vez de dimensionar por quantidade de restaurantes cadastrados.
2. **Cache reduz consultas repetidas?** Sim, para recursos públicos adequados. A chave deve incluir `restaurantId` e versão; catálogo alterado invalida o cache. Checkout confirma preço e disponibilidade no backend.
3. **Redis cai?** A API deve continuar consultando PostgreSQL quando apropriado, com timeout curto, backoff, limitação de concorrência e proteção contra tempestade de cache misses.
4. **PostgreSQL cai?** Não aceitar novos pedidos/pagamentos que não possam ser registrados com segurança. Leitura de catálogo eventualmente cacheado não é autorização para vender. Um PIX já aprovado no provedor exige conciliação, não novo pagamento.
5. **Dois workers recebem o mesmo evento?** Um identificador estável de operação + `UNIQUE`/atualização condicional e transações impedem duplicação; verificar se já existe com `findUnique` não basta devido a *race condition*. ACK do broker só após persistência/efeito confirmado.
6. **Falha ao gravar o último item?** Usar rollback para preservar integridade de pedido e itens. Nunca pressupor que um rollback desfaça cobrança externa.
7. **WhatsApp fica fora?** Pedido segue salvo e visível na cozinha; fila tenta notificação novamente e alerta em falhas, respeitando consentimento e tenant.
8. **Socket falha 2 minutos?** Polling de fallback, status visível e recarga canônica da fila após cada reconexão; nenhum evento de Socket é considerado registro permanente.
9. **Polling de 300 cozinhas em 1 segundo?** Seriam aproximadamente 300 requisições/segundo com um painel por restaurante; testar amortecimento de carga, jitter e consultas incrementais.
10. **Quando usar RabbitMQ?** Somente se outbox PostgreSQL e worker forem insuficientes e avaliação demonstrar ganho: filas dedicadas, concorrência, DLQ, roteamento ou throughput operacional. Ainda precisa de outbox transacional, ACK, idempotência e operação de HA; o broker sozinho não elimina perdas entre transação e publicação.
11. **Quando usar Kubernetes?** Somente se múltiplos serviços/réplicas, autoscaling e deploys/gestão de falhas justificarem custo total frente ao Docker e balanceamento mais simples. Ele não substitui redundância do PostgreSQL.
12. **O que monitorar?** Latência do pedido à cozinha, confirmação/reconciliação PIX, filas atrasadas, tentativas esgotadas, erros 5xx, conexões DB, CPU/burst/RAM/disco, falhas de instância e restauração de backups.

## Testes de aceite obrigatórios
- Crash depois do commit do pedido e antes da publicação do evento, sem perda durável.
- Mesmo evento entregue duas vezes ou em paralelo, um único efeito financeiro/pedido.
- Webhook atrasado/repetido, timeout de Mercado Pago e queda PostgreSQL durante confirmação, sem cobrança duplicada nem pedido perdido.
- Pedido com item inválido no final faz rollback íntegro.
- Falha de WhatsApp não interfere na chegada de pedido à cozinha.
- Socket desconectado com cinco pedidos novos e reconexão: todos exibidos e sem duplicidade.
- Testes de 1.000 acessos ao catálogo, 300 painéis e réplicas em homologação; medições documentadas, não na produção.
- Troca de preço em um restaurante não contamina outro; cache indisponível tem fallback seguro e checkout recalcula preço.
- Backups enviados ao S3 são restaurados em ambiente isolado e validados contra RLS e FKs.

## Riscos e restrições
Preservar isolamento por `restaurantId`/RLS, autenticação, consentimento, idempotência, APIs de Mercado Pago/Lalamove e regras de status. Não afrouxar lint, typecheck, CI, E2E ou testes de segurança. Não instalar Redis/RabbitMQ/Kubernetes, criar cobranças reais, derrubar produção ou executar carga na infraestrutura produtiva nesta etapa.

## Rastreamento
- PR #327: https://github.com/samuelggds/Projeto-Restaurants/pull/327
- Outbox atômica: https://github.com/samuelggds/Projeto-Restaurants/issues/328
- Conciliação financeira: https://github.com/samuelggds/Projeto-Restaurants/issues/329
- Cache/catálogo/polling: https://github.com/samuelggds/Projeto-Restaurants/issues/330
- Alarmes/restore: https://github.com/samuelggds/Projeto-Restaurants/issues/331
- Mensageria e workers: https://github.com/samuelggds/Projeto-Restaurants/issues/332
- Escala e Kubernetes: https://github.com/samuelggds/Projeto-Restaurants/issues/333
