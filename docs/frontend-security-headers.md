# Cabeçalhos das prévias e da demonstração

O Caddy mantém `frame-ancestors 'none'` nas páginas normais da aplicação. Somente os caminhos exatos `/demo-admin.html` e `/help-preview.html` permitem incorporação pela própria origem (`frame-ancestors 'self'`). Isso permite abrir o administrador fictício e os manuais visuais sem liberar a incorporação do painel real por outros sites.

Os dois documentos isolados recebem `connect-src 'none'`, `form-action 'none'` e `base-uri 'none'` também pelo cabeçalho HTTP. O administrador demonstrativo permite subframes da própria origem para carregar o manual; o documento do manual usa `frame-src 'none'`. As políticas nos próprios arquivos HTML continuam valendo em conjunto com esses cabeçalhos.

Os matchers usam caminhos exatos, sem curingas. Parâmetros de consulta, como `?area=settings-brand`, mantêm a exceção no documento correspondente. Prefixos e sufixos diferentes, como `/other/help-preview.html` ou `/demo-admin.html.bak`, recebem a proteção normal. A sintaxe segue a documentação oficial de [matchers](https://caddyserver.com/docs/caddyfile/matchers) e de [cabeçalhos](https://caddyserver.com/docs/caddyfile/directives/header) do Caddy.

O `frontend/nginx.conf` continua responsável pelos arquivos estáticos atrás do Caddy e não adiciona uma segunda política conflitante. No deploy de produção definido pelo projeto, os cabeçalhos de entrada são responsabilidade do Caddy; uma hospedagem diferente precisa preservar essas mesmas restrições.

## Validação

Execute na raiz do repositório, com o executável do Caddy disponível:

```sh
CADDY_BIN=/caminho/para/caddy node scripts/verifyFrontendHeaders.mjs
```

O teste adapta o `deploy/Caddyfile` com domínios fictícios, substitui apenas os upstreams por uma resposta estática e inicia o Caddy em uma porta aleatória de `127.0.0.1`. Faz 12 requisições HTTP, verifica a política efetivamente enviada para cada caminho e encerra o processo ao terminar. Não inicia a aplicação, não lê credenciais do ambiente de produção, não solicita certificados e não depende de banco de dados.

A CI executa essa verificação usando o binário da mesma imagem `caddy:2.11.4-alpine` definida no Compose de produção. A validação local desta alteração passou com Caddy v2.11.4. O teste cobre seleção de cabeçalhos no Caddy; a renderização e o isolamento das telas são verificados separadamente pelos testes do frontend.
