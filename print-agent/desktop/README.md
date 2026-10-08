# GastroNexa Cozinha — aplicativo Windows (pré-lançamento)

Aplicativo de impressão local para Windows 10/11 (x64), com GUI e empacotamento NSIS.
O instalador incorpora o Print Agent já existente, preservando filas de impressão,
ACKs, RLS e autenticação multi-tenant do backend. Não instala drivers de terceiros.

## Para testar no Windows

1. Abra o PR que contém esta pasta e execute o workflow **GastroNexa Kitchen Windows Installer**.
2. Depois que o workflow passar, baixe o artefato **gastronexa-kitchen-windows-test** na página do GitHub Actions.
3. Extraia o ZIP e execute **GastroNexa-Cozinha-Setup-1.0.0.exe**.
4. Instale com sua conta Windows normal (não é preciso executar como administrador).
5. Garanta que a impressora está instalada e imprime pelo Windows.
6. No painel **Configurações → Impressora da cozinha**, salve papel 58 mm (ou 80 mm), gere o código e copie-o uma única vez.
7. No aplicativo, cole o código, selecione a impressora e faça **Imprimir teste local**.
8. Marque **Iniciar automaticamente com o Windows** para receber pedidos após o próximo login.
9. No painel, pressione **Imprimir página de teste** para validar o fluxo SaaS → fila → Windows.

O instalador de teste ainda não é assinado digitalmente. **Não distribua para clientes finais**
até executar a homologação em equipamentos reais, adicionar assinatura de código, verificar
o pacote e publicar artefatos por um canal autenticado. Não desative verificações de
segurança do Windows ou do SmartScreen.

## Segurança

- API fixa: https://api.gastronexa.com.br; não aceita URL arbitrária;
- token validado pelo backend antes do pareamento e armazenado cifrado por Electron safeStorage
  no perfil do usuário do Windows; não deve ser colocado em comandos, mensagens ou logs;
- token nunca é enviado ao renderer depois de salvo; o IPC expõe apenas ações limitadas;
- a interface carrega exclusivamente conteúdo local com CSP, context isolation, sandbox
  e NodeIntegration desativado;
- isolamento entre restaurantes e autorização por dispositivo são responsabilidade do backend;
- desconectar remove a credencial local. Para bloquear um computador comprometido, também
  **revogue o dispositivo no painel administrativo**;
- sem download automático de drivers, atualização remota ou execução arbitrária de scripts;
- Windows deve permanecer desbloqueado e sessão do usuário aberta para impressão via spooler.

## Desenvolvimento

Na raiz do repositório:

```powershell
npm --prefix print-agent ci
npm --prefix print-agent run build
node --test print-agent/desktop/tests/*.test.cjs
cd print-agent/desktop
npm install --no-save --package-lock=false --ignore-scripts
npm run package:win
```

O artefato é produzido em `print-agent/desktop/dist/`. Rode este fluxo no Windows,
não no servidor Linux de produção.

## Limitações e próximos passos

- O instalador de teste é unsigned e ainda necessita testes com a Atomo MO-5812 e
  outras impressoras 58/80 mm, inclusive acentuação, corte e múltiplas cópias.
- Aplicativo é iniciado junto ao login se habilitado; ele não é serviço do Windows.
- Fechar a janela encerra a impressão. Suporte a ícone na bandeja e execução oculta
  pode ser adicionado após validação da operação.
- Empacotamento usa versões especificadas em package.json; antes de distribuição
  final, gere e versiona package-lock.json e adote atualizações verificadas.
- Não misture testes deste instalador com o deploy do backend na AWS.
