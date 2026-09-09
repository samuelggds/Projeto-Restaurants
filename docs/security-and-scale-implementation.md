# Segurança, confiabilidade e escala — acompanhamento em 09/09/2026

Base: [auditoria histórica](../artifacts/AUDITORIA-COMPLETA-RESTAURANTES-2026-09-08.md). Este documento registra o estado das correções; os achados anteriores não significam que os defeitos continuam presentes.

Meta confirmada: **120 restaurantes × 5 pedidos por minuto = 600 pedidos/minuto**, além de consultas e eventos. A aplicação passou pelo ensaio local descrito abaixo. A infraestrutura de produção ainda precisa ser dimensionada e homologada.

## Correções implementadas

| Área                    | Resultado                                                                                                                                                                                                                    |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pedidos e pagamentos    | Falhas ambíguas preservam pedido, estoque e cupom. Finalizadores usam atualização condicional para uma única confirmação. Reenvio de checkout PIX/cartão com a mesma chave recupera o pedido, sem outra chamada de cobrança. |
| Retirada e mesa         | Reserva de tentativa, concorrência e retomada protegidas. Estorno/cancelamento remoto exige referência e confirmação do provedor; situações inconclusivas ficam pendentes de conciliação ou revisão manual.                  |
| Filas e históricos      | Paginação no backend e nas telas operacionais; agregados para relatórios e clientes; histórico do entregador atualiza após a entrega.                                                                                        |
| Fronteiras de segurança | Metadados internos filtrados nas respostas/eventos, origem de Socket.IO validada, limites de requisição compartilhados, CSP/Google e hosts Vite corrigidos.                                                                  |
| Estoque                 | Devolver estoque não reativa um produto bloqueado manualmente.                                                                                                                                                               |
| Notificações            | Fila persistente com conteúdo cifrado, reserva por worker, deduplicação, timeout e tentativas limitadas. Reavalia consentimento antes do envio.                                                                              |
| Recuperação de senha    | Telefone serve para localizar a conta; o código vai ao e-mail cadastrado. Números ambíguos não selecionam uma conta arbitrária. Não há envio de SMS implementado.                                                            |
| Interface               | Ações flutuantes agrupadas no celular, cards acessíveis por teclado, storage bloqueado tratado e diálogos com portal, Escape e restauração de foco.                                                                          |
| Múltiplas instâncias    | Relay de eventos e rate limit no PostgreSQL, duas APIs no Compose, pool limitado e roteamento por DNS atualizado no Caddy. Recuperação de falha de escrita do relay independe de novo tráfego HTTP.                          |

### Contratos e limites que precisam ser preservados

- Idempotência exige os headers do [contrato de criação](order-creation-reliability.md). Clientes antigos sem chave continuam aceitos e não recebem essa garantia. Uma nova chave representa uma nova tentativa.
- Checkout repetido devolve `PAYMENT_CREATION_UNCERTAIN` com o ID existente para consulta/conciliação. Não reconstrói automaticamente a URL ou QR do checkout anterior. Não considerar esse retorno uma confirmação de pagamento.
- Eventos Socket.IO não constituem um registro financeiro durável. A consulta à API é a fonte canônica, especialmente após reconexão.
- A fila de notificações garante retomada **depois de persistida**. Ainda há uma janela entre o commit do domínio e seu enfileiramento: uma queda nesse intervalo pode perder o aviso. Fechar essa janela exige integrar o enfileiramento às transações de domínio ou adicionar reconciliação.
- A entrega da notificação pode se repetir após perda da resposta do receptor. O receptor deve deduplicar pelo header `Idempotency-Key`; não há promessa de entrega exatamente uma vez.
- RLS foi testado nos modelos cobertos pelas 21 políticas existentes. Isso não significa que todas as 71 tabelas possuem RLS; as demais também dependem das verificações de tenant da aplicação.

A proteção da `main` foi ativada e confirmada em 09/09/2026: [ruleset ativo no GitHub](https://github.com/samuelggds/Projeto-Restaurants/rules/22624473), [evidência local](../artifacts/main-protection-verification.json). Exige PR, CI `Full Root CI Validation`, resolução das conversas e bloqueia exclusão/force-push, sem bypass. Mantém zero aprovações humanas para manutenção individual.

## Evidências executadas

| Verificação                              | Resultado observado                                                                                                                                | Evidência                                                                                                                                          |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Suítes unitárias                         | Backend: 1.004 aprovados na última suíte completa; frontend: 875; impressão: 15. Regressões adicionadas depois também passaram nos lotes abaixo.   | [backend](../artifacts/security-scale-backend-final-verified.log), [suíte anterior de todos os pacotes](../artifacts/security-scale-all-tests.log) |
| Retry de checkout e recuperação do relay | 23 testes direcionados aprovados                                                                                                                   | [log](../artifacts/security-scale-online-retry-tests.log)                                                                                          |
| Checkout, visitante e entregador         | 28 testes frontend aprovados                                                                                                                       | [log](../artifacts/security-scale-final-ui-tests.log)                                                                                              |
| PostgreSQL multi-tenant                  | 79 aprovados, um teste de carga opcional separado; inclui concorrência de checkout PIX/cartão com efeito externo simulado único                    | [log](../artifacts/security-scale-tenant-checkout-final.log)                                                                                       |
| Navegador Chrome                         | 54 cenários críticos validados: 45 na execução ampla e nove na reexecução de mesa/garçom após corrigir as três falhas encontradas. APIs simuladas. | [execução ampla](../artifacts/security-scale-critical-browser.log), [mesa/garçom](../artifacts/security-scale-table-browser.log)                   |
| Checkouts, QR e relatórios               | 31 testes frontend e 18 backend aprovados; inclui proteção do token em links de QR e preservação do PIX quando a imagem opcional falha             | [frontend](../artifacts/security-scale-final-payment-ui.log), [backend](../artifacts/security-scale-payment-timeout-tests.log)                     |
| RLS com role restrita                    | 21 aprovados                                                                                                                                       | [log](../artifacts/security-scale-rls.log)                                                                                                         |
| Carga de 120 restaurantes                | 600 pedidos únicos, 1.200 leituras, 600 eventos observados, zero erros                                                                             | [resultado JSON](../artifacts/runtime-scale-120-restaurants.json)                                                                                  |
| Restauração                              | 71 tabelas, 106 registros, 147 chaves estrangeiras e 21 políticas preservados                                                                      | [resultado JSON](../artifacts/restore-drill-result.json)                                                                                           |
| Build e orçamento do bundle              | Backend, frontend e agente de impressão compilados; orçamento aprovado                                                                             | [build final](../artifacts/security-scale-build-final.log)                                                                                         |
| Deploy local                             | Configuração do Compose e Caddy validada                                                                                                           | [Compose](../artifacts/security-scale-compose.log), [Caddy](../artifacts/security-scale-caddy.log)                                                 |

A carga usou PostgreSQL descartável, role runtime `NOSUPERUSER/NOBYPASSRLS`, dois processos Node, pools de dez conexões e 120 clientes Socket.IO. Host Windows x64, Node 24.11.1, 12 CPUs lógicas e 32 GB de RAM. Durante 60 segundos: dez criações e vinte leituras por segundo. Pedido com um produto, retirada e dinheiro registrado pelo administrador; nenhum gateway externo.

Última execução, em 09/09/2026: criação p95 **57 ms**, p99 **87 ms**; leitura p95 **28 ms**; evento p95 **288 ms** desde o envio da criação. Os sete testes de runtime/carga passaram, incluindo recuperação de escrita com a role restrita. A medição correlaciona eventos que chegam antes da resposta HTTP. Veja o [log final da carga](../artifacts/security-scale-load-final.log). Esse ensaio curto não comprova comportamento por horas, picos de reconexão, gateway lento, impressão física nem o dimensionamento de outra máquina.

Typecheck e lint finais passaram nos três pacotes: [tipagem](../artifacts/security-scale-final-typecheck.log), [lint](../artifacts/security-scale-final-lint.log). A interface de conta da mesa foi inspecionada na captura real de 390 px; as jornadas também verificam 360 e 430 px.

A auditoria de dependências foi reexecutada em 09/09/2026 após atualizar Nodemailer para 9.1.1 e Vitest/coverage para 4.1.11: nenhum alerta conhecido retornado nos três pacotes. Evidências: [backend](../artifacts/publication-audit-backend.json), [frontend](../artifacts/publication-audit-frontend.json) e [impressão](../artifacts/publication-audit-print-agent.json). Os 23 testes direcionados de recuperação de senha e MFA passaram após a atualização do Nodemailer. A auditoria depende dos avisos disponíveis na data da consulta e não comprova ausência de vulnerabilidades.

A restauração criou uma segunda base vazia no mesmo container, comparou contagem e digest dos registros, FKs e políticas, reprovisionou a role restrita e comprovou bloqueio RLS sem contexto. Não utilizou um backup de produção nem armazenamento remoto.

Para reproduzir os ensaios de banco a partir da raiz, com Docker disponível:

```powershell
npm --prefix backend run test:scale
npm run test:e2e:tenant
npm run test:e2e:rls
npm --prefix backend run test:e2e:tenant -- --restore-check
```

O runner cria e remove seu próprio PostgreSQL. A opção de restauração exige que a instância pertença ao runner e recusa uma base externa.

## Implantação

1. Faça backup do ambiente e valide o plano de retorno. Aplique as migrations com a credencial de migração, antes de iniciar as APIs e o worker atualizados. As adições desta etapa são:
   - `20260908150000_distributed_runtime_state`;
   - `20260908160000_password_recovery_phone_lookup`;
   - `20260908170000_notification_outbox`.
     A base também precisa conter as migrations anteriores de idempotência/RLS.
2. Use a role restrita em `DATABASE_URL` das APIs e do worker. A credencial administrativa de migração não deve entrar nesses processos. Valide o provisionamento de permissões após as migrations.
3. Para duas APIs, mantenha `DISTRIBUTED_STATE=postgres`, `API_REPLICA_COUNT=2` e `DATABASE_CONNECTION_LIMIT=10`. Some pools de todas as APIs, worker e ferramentas ao reservar conexões no PostgreSQL. Um `connection_limit` explícito na URL prevalece.
4. Mantenha o worker em execução. Configure as mesmas chaves de cifragem em API/worker. Em rotação, conserve a chave anterior enquanto houver conteúdo pendente cifrado com ela.
5. Configure domínio, TLS, CORS, origem de Socket.IO, roteamento e providers reais. Valide `/ready` de cada réplica e uma jornada que crie em uma e receba o evento em outra.
6. Ajuste a capacidade operacional por restaurante: o padrão de 20 pedidos simultâneos é uma regra de atendimento, não um limite do banco. Com cinco pedidos/minuto e dez minutos de preparo, haverá aproximadamente 50 pedidos em andamento. O limite deve refletir a capacidade real da cozinha.
7. Homologue os fluxos reais e acompanhe latência, erros, saturação de conexões e atraso das filas antes de ampliar o tráfego.

O relay retém eventos por cinco minutos e começa no ponto atual ao reiniciar; clientes precisam consultar o estado após reconexão. A fila de WhatsApp faz até oito tentativas, descarta conteúdo com mais de 24 horas ou consentimento desativado, apaga payload concluído e mantém metadados por até 30 dias.

## Pendências para homologação completa

- Fechar a janela entre commit e publicação/enfileiramento; a entrega dos eventos ainda não participa atomicamente da transação do pedido.
- Executar carga prolongada e jornadas com frontend, API e banco reais no ambiente de homologação. Os testes Playwright atuais usam API simulada; os E2Es PostgreSQL testam HTTP/Socket reais separadamente.
- Testar pagamentos/webhooks no sandbox de cada gateway, entrega de e-mail/WhatsApp, impressora física e falha/reconexão do spooler. As chaves externas já são uma configuração conhecida pelo responsável, não um defeito de código.
- Testar restauração do backup remoto real e estabelecer RPO/RTO, retenção, cifragem e recuperação das chaves.
- Manter auditoria periódica de dependências e validar observabilidade no ambiente final. As bibliotecas existentes de e-mail e testes receberam atualizações de segurança nesta etapa.
- Continuar a separação dos serviços extensos com testes de comportamento. Passar o verificador de arquitetura não significa que toda oportunidade de refatoração foi eliminada.

Não houve implantação em produção, cobrança real, envio real de mensagem ou alteração de dados de produção nesta execução. O projeto tem melhorias verificadas, mas ainda não está homologado integralmente para operação.
