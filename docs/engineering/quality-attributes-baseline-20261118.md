# Engenharia de Software — atributos de qualidade (auditoria inicial)

Data: 2026-11-18. Escopo: leitura da branch `main` do projeto GastroNexa e teste de regressao adicionado em branch de revisao. **Este documento nao e uma auditoria conclusiva de producao.**

## Evidencia observada no repositorio

| Atributo | Evidencia no codigo | Status e limite |
| --- | --- | --- |
| Arquitetura / modificabilidade | `ARCHITECTURE.md` descreve limites de modulos e estrategia incremental; CI executa `check:architecture` | Convencoes e verificacao configuradas; nao comprova qualidade de todas as dependencias |
| Confiabilidade e seguranca | `.github/workflows/ci.yml` define testes de backend, tenant E2E e RLS E2E; `backend/src/app.ts` configura middlewares de seguranca | Jobs presentes; aprovacao no commit final requer checagem separada |
| Disponibilidade | `backend/src/app.ts` publica `/health` e `/ready`; `backend/src/health/readiness.ts` verifica banco com timeout e cache curto | Instrumentacao implementada; nao mede uptime de producao |
| Observabilidade | `backend/src/middlewares/security/requestTimingMiddleware.ts` registra respostas lentas ou 5xx com ID de requisicao e rota sanitizada; Sentry configuravel | Requer configuracao e monitoramento externos para observacao continua |
| Desempenho | `backend/src/e2e/multiTenant/runtimeScale.e2e.ts` e `backend/scripts/loadTestOrders.ts` contem testes e calculos de p95/p99; `docs/operations/ci-production-hardening.md` documenta baseline historico | Resultado historico de laboratorio nao e capacidade comprovada da producao |
| Recuperacao | `.github/workflows/ci.yml` verifica scripts de backup/restauracao; issue #331 lista restauracao de backup externo e alertas ainda pendentes | Nao afirmar recuperacao homologada sem restauracao real e evidencia de RPO/RTO |

## Mudanca proposta neste PR

Adicionar teste de regressao para `requestTimingMiddleware` que verifica simultaneamente:
- HTTP 200 rapido nao emite aviso;
- HTTP 200 lento (limiar de 100 ms no processo de teste) produz um unico aviso com `requestId`, metodo, status e duracao;
- rota parametrizada, ID privado e query com token nao aparecem no log.

Nao altera a logica de producao, filtros de tenant, pagamentos, webhooks, rate limits nem deploy.

## Proximas verificacoes prioritarias (separadas deste PR)

1. Confirmar status real de checks de CI no SHA final, incluindo testes, security, tenant e RLS.
2. Configurar e **testar** alertas reais de 5xx, p95/p99, falha de worker, fila/outbox e indisponibilidade de banco em ambiente autorizado; acompanhar a issue #331.
3. Restaurar backup externo cifrado em ambiente isolado e registrar RPO/RTO, integridade, roles e politicas RLS.
4. Executar teste de carga representativo em homologacao, nao em producao, com pedidos, catalogo, fallback de cozinha e recursos compartilhados; acompanhar issues #330 e #333.
5. Revisar modulos com `strict: false` e supressoes antigas de forma incremental, seguindo `QUALITY.md`.

## Criterios de aceite deste PR

- Teste novo e testes anteriores do middleware passam;
- Typecheck e lint de backend passam;
- CI do commit final passa nos checks exigidos pelo repositorio;
- Revisao confirma que nenhum dado privado aparece nos novos logs.

Nenhuma dessas validacoes foi executada neste documento; sua realizacao deve ser registrada no PR antes de merge.

## Fontes internas ao repositorio

`ARCHITECTURE.md`, `QUALITY.md`, `.github/workflows/ci.yml`, `backend/src/app.ts`, `backend/src/health/readiness.ts`, `backend/src/config/sentry.ts`, `backend/src/middlewares/security/requestTimingMiddleware.ts`, `docs/operations/ci-production-hardening.md` e issues #330, #331 e #333.
