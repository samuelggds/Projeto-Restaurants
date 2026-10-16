# Plano de testes — queda do PostgreSQL, recuperação de pedidos e conciliação de pagamentos

**GastroNexa — 16/10/2026**  
**Situação:** planejamento e critérios de aceite; **não comprova testes executados**.  
**Ambiente:** integração/homologação com PostgreSQL descartável, APIs, worker e provedor de pagamento simulado; nenhuma alteração ou cobrança na produção.

## Objetivo e limite da garantia

Comprovar que (a) um pedido confirmado como salvo e persistido em commit continua recuperável depois de uma **indisponibilidade temporária** do PostgreSQL; (b) um pagamento aceito externamente pode ser conciliado após a recuperação, sem duplicar pedido ou cobrança; (c) tentativas de novos pedidos durante indisponibilidade não são anunciadas como sucesso se não houver persistência confiável; (d) notificações e tela da cozinha se recuperam.

**Atenção:** PostgreSQL indisponível não equivale à destruição dos dados. A recuperação de uma instância com disco intacto é diferente de perda de volume/corrupção. Esta segunda classe de incidente depende de backup, restauração, eventual replicação e dos objetivos RPO/RTO; não se promete "perda zero" após destruição física sem uma estratégia de durabilidade comprovada.

**Decisão de produto atual:** com a arquitetura presente, **não aceitar e confirmar novas vendas enquanto o PostgreSQL estiver indisponível**, pois o PostgreSQL também hospeda pedidos e outbox. Continuar capturando novos pedidos durante o apagão exigiria um armazenamento durável **independente**, reconciliação, controle de disponibilidade e duplicidades, e decisão explícita de negócio. Não confundir payload local no navegador ou fila em memória com confirmação de pedido.

## Proteções existentes — conferir, não reimplementar cegamente

- O backend já possui `GET /health`, `GET /ready` e `backend/src/health/readiness.ts` com timeout e cache curto para probe de banco. A disponibilidade de `/health` por si só **não** afirma que o checkout está pronto.
- `docs/order-creation-reliability.md` descreve `Idempotency-Key` em `POST /orders`, `POST /orders/pix/payment` e `POST /orders/card/checkout`, vínculo de tentativa ao restaurante/ator, persistência transacional e recuperação `PAYMENT_CREATION_UNCERTAIN`.
- `backend/src/e2e/multiTenant/pickupPayments.e2e.ts` contém simulações de timeout PIX, webhook concorrente e tentativa de conciliação; isso **não** demonstra ainda o teste de desconexão do PostgreSQL no meio da operação.
- `backend/src/services/notificationOutbox.ts` usa outbox PostgreSQL com retry; existe lacuna documentada entre commit do pedido e enfileiramento de certos avisos (issue #328).
- O PR #327 altera o fallback/reconexão da cozinha e precisa de verificação com banco real e eventos perdidos.

## Pré-condições e instrumentação

1. Executar em PostgreSQL **efêmero, descartável e exclusivo** de testes; impedir por configuração e verificação de identidade do banco que o script alcance banco de produção.
2. Usar pelo menos dois restaurantes (A e B) com `restaurantId` distintos; criar usuários autenticados, visitante, pedido mesa, retirada e delivery pertinentes.
3. Usar gateway **fake** com retorno determinístico: cobrança aceita, rejeitada, pendente, timeout após aceite, webhook atrasado, repetido e fora de ordem. Guardar contador de chamadas de cobrança; jamais criar PIX/cartão real nessa etapa.
4. Simular queda **entre operações específicas** mediante injeção controlada (barreira/fault injector/proxy de teste) e, em segunda fase, parar temporariamente o **container descartável** ou conexões do banco. Não encerrar o processo de PostgreSQL de produção.
5. Capturar somente IDs sintéticos, `requestId`, estado do pedido/pagamento, eventos emitidos, contadores, tentativas, latências, códigos HTTP, estados da outbox e timestamp de recuperação. Não registrar cartão, token ou segredo.
6. Após recuperar o banco, executar reconciliação/worker da própria aplicação e inspecionar banco por consulta independente. Confirmar que a cozinha visualiza o estado atualizado via API e após reconexão Socket.IO.
7. **Testes automatizados novos** devem integrar a suíte tenant com PostgreSQL real e simulações de gateway; testes de backup/restore devem ficar em suíte operacional isolada.

## Matriz executável de aceitação (casos ainda não comprovados)

| ID | Ponto de injeção | Procedimento controlado | Resultado que precisa ser observado | Issue |
| --- | --- | --- | --- | --- |
| DB-01 | Após commit do pedido e de seus itens, antes do retorno ao cliente | Salvar pedido com itens/valores/tenant; derrubar comunicação do PostgreSQL; restaurar; consultar pedido por API e diretamente no banco | **Um único pedido** com todos os itens e valores íntegros; após retomada ele volta à cozinha. Não criar segunda venda no retry com a mesma chave. | #329 / #327 |
| DB-02 | Antes da primeira gravação do pedido | Interromper banco e executar tentativa de checkout com chave estável; restaurar e reconsultar | Rejeição/transiente ou estado inequivocamente não confirmado; **nenhuma cobrança solicitada** ao provedor e nenhum pedido anunciado como recebido sem commit. | #329 |
| DB-03 | Commit de pedido/tentativa concluído; gateway aceita PIX; banco indisponível antes de salvar confirmação | Mock registra uma única cobrança com ID externo estável; interromper conexão; disparar webhook durante queda; retomar e conciliar pelo ID | Pedido e tentativa originais recuperáveis; estado pendente/incerto até conciliação; após reconciliação **um** pagamento aprovado e **um** pedido, sem nova cobrança. | #329 |
| DB-04 | Gateway aceita pagamento mas resposta HTTP sofre timeout | Simular timeout após criação externa e repetir pedido/consulta mantendo a **mesma chave** | Não chamar API de criação de cobrança novamente por retry cego; consultar gateway e retornar estado correto, sem inventar comprovante/QR. | #329 |
| DB-05 | Duas confirmações/webhooks concorrentes após reconexão do banco | Disparar 2 ou mais webhooks com mesmo ID e eventos fora de ordem com 2 workers | Efeito idempotente, uma transição financeira válida e nenhuma cobrança/pedido duplicados; versões/estado do pagamento não retrocedem indevidamente. | #329 / #332 |
| DB-06 | Pedido gravado, processo cai entre commit e publicação/enfileiramento | Injetar crash na janela, reiniciar API e worker e consultar outbox/reconciliador | Evento/aviso preservado **quando a correção #328 estiver implementada**. Confirmar que WhatsApp indisponível não impede leitura do pedido na cozinha. | #328 / #332 |
| DB-07 | Banco indisponível por minutos; Socket desconecta | Deixar cozinha aberta com API/Socket falhando; restaurar banco e reconectar | Painel não afirma atualização bem-sucedida durante falha; ao recuperar, recarrega estado canônico e mostra todos os pedidos, sem duplicar cards; estados corretos entre tenants. | #327 / #329 |
| DB-08 | Falha no item final de um pedido com vários produtos | Forçar erro no terceiro item antes do commit | Rollback atômico de pedido, itens, estoque e cupom relacionados. Se já houve efeito externo, fazer conciliação/compensação; não supor que rollback devolve Pix. | #329 |
| DB-09 | Volume/banco perdido, não apenas desconectado | Restaurar **backup externo real do S3** numa instância isolada e conferir checksums/contagem, FKs, RLS, últimas transações e chaves | Documentar efetivamente RPO e RTO, o que foi recuperado, o que ficou fora da janela e como recuperar estados financeiros externos. Sem garantia de perda zero se o RPO não for zero. | #331 |
| DB-10 | Banco e API operacionais de novo, backlog de worker | Retomar workers e disparar retries limitados/outbox após queda | Pending jobs retomados sem perda/reprocessamento financeiro duplicado; alarmes de atraso/falha acionados e resolvidos. | #328 / #332 / #331 |
| DB-11 | Injeção cruzada entre dois tenants | Submeter a mesma chave externa/ID sintético no cenário A/B quando semântica permitir | Cada pedido e recuperação só é visível ao tenant autorizado; webhook precisa validar associação do provedor/conta ao `restaurantId`; não misturar tokens ou dados. | #329 |

## Passos de execução e entrega

- **Etapa 1 — testes determinísticos:** criar falhas simuladas no gateway e na conexão do banco; validar DB-01 a DB-08 e DB-11 no runner multi-tenant com PostgreSQL real e `Idempotency-Key` estável.
- **Etapa 2 — crash real de processos descartáveis:** interromper API, worker e container de banco de homologação nos pontos DB-01, DB-03, DB-06 e DB-10; registrar evidência de recuperação e backlog.
- **Etapa 3 — restauração externa:** executar DB-09 em instância isolada e arquivar relatório sanitizado de RPO/RTO.
- **Etapa 4 — integração CI:** manter `npm run test:e2e:tenant`, `npm run test:e2e:rls`, lint sem warnings, typecheck, testes unitários, E2E de navegador e migrações; sem relaxar regras para "passar".
- **Etapa 5 — homologação dos gateways:** só com ambientes sandbox e credenciais próprias, cobrir Pix/cartão e provedores efetivamente habilitados. Restrições de sandbox/produção documentadas, sem cobranças reais de clientes.
- **Etapa 6 — revisão operacional:** checklist de incidentes/rollback, alertas, replay seguro e tratamento de cobranças confirmadas sem pedido ativo.

## Evidência exigida por cenário

`caseId`, `gitSha`, data UTC, ambiente, `restaurantId` sintético, tipo de injeção, início/fim da indisponibilidade, contagem de pedidos antes/depois, referências fake externas, número de chamadas de cobrança, quantidade de webhooks/eventos recebidos, estado da outbox, número de duplicações, estado final na cozinha, resultado PASS/FAIL e referência a log/artefato **sem segredos**.

**Nunca marcar como aprovado porque o teste foi descrito.** Cada cenário exige execução observada e resultado verde. Não usar banco ou gateway reais para injeção de falhas.

## Referências rastreáveis

- PR de escopo limitado (cozinha + documentação): [#327](https://github.com/samuelggds/Projeto-Restaurants/pull/327)
- Integridade commit/outbox: [#328](https://github.com/samuelggds/Projeto-Restaurants/issues/328)
- Reconciliação financeira e fallback seguro: [#329](https://github.com/samuelggds/Projeto-Restaurants/issues/329)
- Backups, restore e alertas: [#331](https://github.com/samuelggds/Projeto-Restaurants/issues/331)
- Workers e mensageria: [#332](https://github.com/samuelggds/Projeto-Restaurants/issues/332)
- Plano integrado: [roadmap](./roadmap-resiliencia-escalabilidade-20261016.md)
