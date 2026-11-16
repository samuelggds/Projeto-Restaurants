# GastroNexa — política de qualidade e melhoria incremental

## Objetivo

Entregar alterações verificáveis e seguras sem alterar o fluxo comercial de
restaurantes, a semântica de pagamento, a autorização por tenant ou o formato
persistido de dados durante uma refatoração de engenharia.

## Baseline observado

- O backend e o frontend principais usam `strict: false` em seus `tsconfig.json`.
- Existem testes legados com `@ts-nocheck` e módulos longos; isso exige migração
  por fronteira de domínio, e não uma ativação global sem diagnóstico.
- A suíte principal já inclui lint, typecheck, testes de backend, cobertura de
  frontend, E2E multi-tenant e verificação real de RLS do PostgreSQL.
- Há limite de tamanho padrão de 1.200 linhas no CI e teto congelado para arquivos
  legados maiores. A meta de design para novos módulos é 500 linhas.
- A migração estrita começa pelo cálculo de alocação financeira e por utilitários
  de apresentação. Nenhum deles pode adicionar supressões globais de tipos.

## Comandos de validação

Execute na raiz do repositório após instalar as dependências:

```bash
npm --prefix backend run typecheck
npm --prefix backend run typecheck:strict:finance
npm --prefix frontend run typecheck
npm --prefix frontend run typecheck:strict:utils
npm --prefix backend run test:table-account
npm --prefix frontend run test
npm run lint
```

No CI, confira também as jobs de E2E multi-tenant e PostgreSQL RLS. Testes com
mocks provam contratos de código sob os cenários simulados; eles não substituem
uma execução concorrente real, uma auditoria de segurança ou a análise de logs.

## Critérios para cada extração ou refatoração

1. Registrar a responsabilidade e a invariante que não pode mudar.
2. Extrair uma pequena fronteira por vez, preservando API e comportamento.
3. Tipar entradas e saídas, evitando `any` e supressões como `@ts-nocheck`.
4. Adicionar um teste no nível adequado ao risco, com casos de falha relevantes.
5. Passar nos typechecks geral e estrito, no lint e nas suítes proporcionais
   ao risco da alteração; para pagamentos e tenant, incluir integração e E2E.
6. Examinar o diff e as execuções GitHub Actions **antes** de fazer merge.

## Próximas frentes, em PRs separados

- **Pagamentos e concorrência:** eliminar gradualmente `@ts-nocheck` dos testes
  legados e consolidar fixtures tipadas, sem simular como integração real.
- **Serviços e repositórios extensos:** extrair consultas e políticas por caso
  de uso com regressões antes/depois e sem reescrita em massa.
- **Frontend:** migrar hooks e fluxos de formulários para tipagem estrita por
  funcionalidade; integrar acessibilidade e estados de erro testáveis.
- **Evidência para recrutadores:** demonstrar um fluxo de pedido e uma falha
  de autorização bloqueada, com links de código e resultados reproduzíveis.

O status de conclusão deve vir das verificações executadas, não da presença
isolada de um teste ou workflow no repositório.

## Segunda etapa: autorização operacional tipada

Os testes dos middlewares `waiterMiddleware` e `attendantMiddleware` deixam
de utilizar `@ts-nocheck` e passam por uma aplicação Express com HTTP local.
As identidades são injetadas na requisição apenas para testar a camada de
autorização, sem simular que houve validação real de JWT.

- `npm --prefix backend run typecheck:strict:roles` verifica guardas, testes
  e harness com `strict: true`.
- A job de CI executa a verificação estrita adicional e o lint proíbe
  supressão de tipos nos arquivos migrados.
- Casos cobertos: autenticação ausente, perfis autorizados, perfis proibidos
  e ausência de restaurante válido.
- Os middlewares de produção permanecem intocados. Os testes não substituem
  o E2E multi-tenant nem o teste de autenticação real.
