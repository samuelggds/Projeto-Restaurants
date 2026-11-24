# Cabeçalhos das prévias da GastroNexa

O Caddy mantém `frame-ancestors 'none'` nas páginas normais da aplicação. A ajuda interna e as quatro vitrines da landing usam a mesma entrada de prévias, `/help-preview.html`, com incorporação restrita à própria origem (`frame-ancestors 'self'`). O parâmetro `?area=settings-brand`, por exemplo, abre um manual. Já `?view=storefront#forno-alto` abre o cardápio fictício da pizzaria.

O documento isolado recebe `connect-src 'none'`, `form-action 'none'`, `base-uri 'none'` e `frame-src 'none'`. Ele não pode acessar APIs, enviar formulários ou carregar subframes.

Os links diretos já divulgados, como `/vitrine-demo.html#forno-alto`, continuam disponíveis. A configuração atual do repositório também permite a incorporação desse caminho exato. A landing usa a entrada compartilhada para funcionar com gateways que já permitem incorporar a ajuda. Prefixos e sufixos diferentes recebem a política normal da aplicação.

O `frontend/nginx.conf` continua responsável pelos arquivos estáticos atrás do Caddy. No deploy de produção, os cabeçalhos de entrada são responsabilidade do Caddy.

## Validação

Execute na raiz:

```sh
CADDY_BIN=/caminho/para/caddy node scripts/verifyFrontendHeaders.mjs
```

A validação usa Caddy isolado em `127.0.0.1`, não lê credenciais de produção e não depende de banco de dados.
