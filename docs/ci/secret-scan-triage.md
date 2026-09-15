# Triagem da varredura histórica de segredos

## Evidência revisada

A execução agendada `Security Hardening` nº `34929332633` analisou todo o histórico com Gitleaks em modo redigido e reportou 45 ocorrências da regra `generic-api-key`. Os valores não são reproduzidos aqui e não devem ser copiados para issues, PRs ou documentação.

A revisão dos metadados do SARIF mostrou que as 45 ocorrências estão limitadas a três categorias deliberadamente sintéticas: fixtures de CI descartável, arquivos de teste/E2E e arquivos `.env.*.example`. Não foi criada exceção por diretório, extensão, arquivo `.env` ou faixa do histórico.

Cada ocorrência aceita está registrada em `.gitleaksignore` pelo fingerprint exato `commit:path:rule:line`. Assim, uma ocorrência nova, mesmo no mesmo arquivo, continua bloqueando o gate. A lista deve ser revista até 2026-12-15 e sempre que o scanner mudar de versão ou regra.

## Política de classificação

- **Fixture/teste sintético:** pode receber exceção somente após confirmar que pertence a teste, E2E ou CI descartável e não corresponde a credencial emitida por um provedor.
- **Exemplo de configuração:** pode receber exceção somente quando o valor é explicitamente demonstrativo e o arquivo não é fonte de configuração de produção.
- **Indeterminado ou potencialmente real:** não recebe exceção. Deve ser tratado como incidente, com revogação/rotação no provedor apropriado e registro da pendência. A rotação não é feita por automação deste repositório.
- **Histórico Git:** não deve ser reescrito sem autorização específica. Uma exceção histórica não declara uma credencial real como segura; ela só registra uma classificação fundamentada para um finding já revisado.

## Controles preservados

A varredura de PRs, pushes e a varredura histórica agendada continuam ativas. `fetch-depth: 0` é preservado para a execução histórica. O CI também executa um canário isolado que cria um repositório temporário fora do projeto e exige que o Gitleaks detecte um segredo sintético conhecido. O canário nunca é commitado no histórico do GastroNexa.

## Procedimento para um finding novo

1. Não publique o valor em logs adicionais, comentários ou documentação.
2. Registre regra, arquivo, commit e fingerprint redigido.
3. Determine se é fixture comprovadamente sintética, exemplo ou credencial potencialmente real.
4. Para credencial potencialmente real, revogue/rotacione no provedor antes de considerar qualquer exceção.
5. Somente findings comprovadamente sintéticos podem ser adicionados à `.gitleaksignore`, sempre por fingerprint exato e com revisão futura definida.
