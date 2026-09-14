# CI/CD e promoção para produção

Este documento descreve o fluxo endurecido e as pendências externas que precisam ser concluídas antes de habilitar a promoção para produção.

## Estado real encontrado antes desta mudança

O ruleset ativo do GitHub (`main-reviewed-and-tested`, id `22624473`) protegia `refs/heads/main`, mas exigia apenas o check `Full Root CI Validation`. `Security Hardening` e `Isolated Stack Smoke` existiam como workflows separados e não eram requisitos reais do ruleset. O deploy antigo era disparado após o workflow `CI` e recompilava backend/frontend no servidor de produção, portanto a imagem implantada não era o mesmo artefato previamente analisado.

A configuração desejada do ruleset está versionada em `.github/main-ruleset-required-checks.json`. Esse arquivo é apenas a configuração preparada: ele **não ativa** a proteção no GitHub. A conexão utilizada para esta alteração não possui permissão administrativa para atualizar rulesets.

## Checks que precisam ser obrigatórios na main

Configure o ruleset `main-reviewed-and-tested` para exigir, com `strict_required_status_checks_policy=true`, os seguintes contextos:

- `Full Root CI Validation`
- `Security Hardening Validation`
- `Isolated Stack Smoke Validation`
- `Cross-browser Critical Validation`
- `Migration Compatibility Validation`

Falha, cancelamento, ausência ou execução pendente de qualquer um desses checks bloqueia a criação de uma release. O workflow `Release Production Images` repete essa verificação contra o **mesmo SHA** antes de publicar imagens.

## Artefato imutável

`Release Production Images` é manual e só aceita o SHA atual da `main`. Ele:

1. confirma os checks obrigatórios no mesmo commit;
2. resolve as variáveis públicas incorporadas ao frontend durante o build;
3. constrói backend e frontend uma única vez;
4. analisa as imagens com Trivy;
5. publica no GHCR com tag por commit;
6. resolve os digests `sha256` e grava um manifesto que relaciona commit, configuração do frontend e imagens.

`Deploy Production` consome apenas esse manifesto e chama `scripts/deploy-production.sh` com digests imutáveis. O servidor usa `--no-build`, portanto não reconstrói a aplicação.

## Prevenção de deploy antigo e recuperação

Antes do deploy o controlador confirma novamente que o SHA da release é a ponta atual da `main`. Reexecuções de releases antigas são recusadas.

A migration é executada antes de substituir os processos da aplicação. Se ela falhar, a versão antiga continua em execução. Se a aplicação nova falhar em readiness depois da migration, o controlador tenta voltar **somente os digests da aplicação** para a release anterior registrada. Um backup pré-deploy é criado para recuperação manual quando o banco já existe, mas o pipeline nunca restaura automaticamente um banco antigo sobre dados recentes.

O check `Migration Compatibility Validation` rejeita operações destrutivas comuns em migrations alteradas no caminho de deploy automático, forçando estratégia expand/contract. Isso reduz o risco de rollback da aplicação após uma migration, mas não é prova de compatibilidade absoluta; mudanças complexas ainda exigem revisão humana.

## Banco e worker no CI integrado

O stack descartável usa `ci_owner` apenas para migrations/provisionamento e `ci_runtime` para backend/worker. O workflow verifica que a role runtime não é superuser, não possui `BYPASSRLS`, `CREATEDB` ou `CREATEROLE`.

Além de verificar processos, o stack executa uma jornada real navegador -> API -> PostgreSQL para login, autorização multi-tenant, criação e avanço de pedido. O worker precisa registrar início e conclusão de uma tarefa agendada real em `ScheduledJobState`; processo apenas `running` não é considerado validação suficiente.

Os testes existentes de isolamento multi-tenant e RLS permanecem intactos.

## Navegadores

Nos PRs, `Cross-browser Critical` executa uma seleção portátil em Chromium, Firefox e WebKit. APIs exclusivas do Chromium, como CDP e `page.pdf()`, permanecem cobertas no Chromium e não são tratadas como falhas dos demais engines. O workflow agendado `Deep Validation` mantém a suíte crítica completa no Chromium e equivalentes compatíveis nos demais navegadores.

Os diagnósticos anteriores mostraram duas causas concretas: o teste de gesto usava CDP fora do Chromium e o teste de PDF usava `page.pdf()`; também havia um bug real de CSS que escondia os controles da demonstração quando um modal estava aberto. Esse CSS foi corrigido, não mascarado por retry ou timeout.

## Segurança e exceções

`Security Hardening Validation` agrega detecção de segredos, auditoria de dependências, regressões de segurança, CodeQL e análise das imagens. O CodeQL separa a conclusão técnica da análise da política de achados: SARIF de severidade de segurança >= 7 ou nível `error` bloqueia o gate.

O Trivy atual continua configurado para ignorar vulnerabilidades sem correção disponível durante a análise obrigatória. Isso é uma exceção explícita herdada do fluxo anterior; antes de habilitar produção, qualquer ocorrência HIGH/CRITICAL sem correção deve ser registrada com CVE, imagem/pacote afetado, justificativa, mitigação e prazo de revisão. Vulnerabilidades com correção disponível continuam bloqueantes. Não trate essa política como garantia de segurança absoluta.

## Pagamentos

Os testes locais de contrato continuam cobrindo os fluxos de refund/billing e não fazem cobranças reais. A homologação contra Mercado Pago, PagBank e Asaas é separada; uma credencial presente não equivale a integração homologada. Quando os segredos de sandbox não estiverem configurados, o status deve permanecer `NÃO EXECUTADO / PENDENTE`.

Nunca use credenciais de produção para esses ensaios.

## Carga

`Load Validation` agenda o teste sintético multi-tenant existente e também permite execução manual. Ele mantém PRs rápidos e preserva relatório/diagnósticos por 14 dias. O baseline já medido no repositório registra 600 criações, 1200 leituras, zero erros, p95 de criação 57 ms, p95 de leitura 28 ms e p95 de eventos 288 ms no ambiente da medição. Os limites existentes devem ser revisados quando houver novas medições representativas; não devem ser reduzidos apenas para deixar o CI verde.

## Configuração externa pendente antes de habilitar produção

1. Atualizar o ruleset real da `main` com os cinco checks acima. Verificar novamente via GitHub API/UI depois da alteração.
2. Configurar as variables públicas usadas no build: `PRODUCTION_APP_URL`, `PRODUCTION_API_URL`, `PRODUCTION_VITE_MAP_TILE_URL` e, quando aplicável, attribution/Google/Sentry.
3. Garantir permissão `packages:write` do workflow de release e acesso ao GHCR para o repositório.
4. Criar credenciais **somente de leitura de packages** para o host: `GHCR_READ_USERNAME` e `GHCR_READ_TOKEN`, além dos segredos SSH já usados.
5. Revisar o environment `production` e adicionar aprovação manual se essa for a política operacional desejada.
6. Manter `PRODUCTION_DEPLOY_ENABLED=false` até os itens acima estarem confirmados.
7. Configurar credenciais oficiais de sandbox somente no environment/workflow de homologação de pagamentos; nunca reutilizar credenciais reais.

Nenhuma dessas configurações administrativas ou de infraestrutura é ativada apenas por este PR.
