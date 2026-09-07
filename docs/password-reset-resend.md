# GastroNexa: reenvio do codigo de recuperacao

## Escopo

O e-mail de recuperacao usa GastroNexa no assunto e no texto. O endereco/remetente
configurado por ALERT_EMAIL_FROM e as credenciais SMTP existentes sao preservados.
Isto nao e uma troca global da marca nas telas ou nos outros modelos de e-mail.

A tela exige 30 segundos entre tentativas de envio e mostra Reenviar em 30s,
29s, etc. A redefinicao com o codigo recebido continua disponivel durante a
contagem. Um novo envio bem-sucedido limpa apenas o codigo digitado anteriormente.

## Protecao

- A contagem comeca antes da requisicao e e renovada apos a resposta. Falhas de
  rede mantem a espera, pois a API pode ter enviado o codigo antes de a rede cair.
- sessionStorage guarda apenas o prazo, sem e-mail, telefone, senha ou codigo.
  Recarregar a mesma aba ou usar Alterar contato nao remove a espera da tela.
- A autoridade e o backend. Para cada conta com codigo pendente, uma atualizacao
  condicional no PostgreSQL exige 30 segundos desde a emissao anterior, o mesmo
  authVersion, o mesmo hash anterior e ausencia de bloqueio de recuperacao.
- Somente a requisicao que gravou o novo codigo pode envia-lo. Reenvios antes do
  prazo e requisicoes concorrentes perdedoras nao trocam nem invalidam o codigo.
- A resposta publica generica permanece igual para conta inexistente, bloqueada
  ou em intervalo de reenvio. O limite HTTP geral de autenticacao continua ativo.

## Banco e compatibilidade

Nao ha nova migration, dependencia ou chave de ambiente. O codigo existente tem
validade fixa de 15 minutos. A emissao anterior e calculada pelo campo persistido
resetPasswordCodeExpiresAt menos esse TTL. Os dois valores ficam centralizados em
passwordResetCooldown.ts. Se o TTL mudar, revisar a representacao persistida e
os testes de fronteira juntos. Concluir a recuperacao consome o codigo; uma
solicitacao posterior inicia um novo ciclo, ainda sujeito ao limite HTTP geral.

## Verificacao

Testes backend: regras no limite de 29.999s/30s, contrato da atualizacao condicional,
respostas genericas, preservacao das tentativas, identificacao por telefone e
apenas o vencedor da gravacao podendo enviar. A concorrencia do servico usa um
repositorio simulado; nao equivale a um teste de carga ou concorrencia com banco real.

Testes de tela: bloqueio inicial, liberacao/reinicio, alterar contato, remontagem,
aba em segundo plano, redefinicao durante a espera, submissao duplicada, erro de
rede e armazenamento bloqueado. Os testes usam relogio simulado para nao esperar
30 segundos reais a cada cenario.

Para aceitar no servidor de desenvolvimento:

1. Instalar a branch mantendo os arquivos .env locais e reiniciar o backend/frontend.
2. Solicitar recuperacao para uma conta de testes. Verificar GastroNexa no novo
   e-mail do Ethereal; mensagens antigas nao sao reescritas.
3. Conferir o contador de 30 segundos; cliques antes do prazo nao podem reenviar.
4. Recarregar a aba e conferir que o prazo restante ainda existe.
5. Apos o prazo, reenviar uma vez e conferir a nova mensagem e o reinicio da contagem.
6. Usar o codigo mais recente para redefinir a senha e entrar novamente.

Nao apagar o banco, executar seed, trocar chaves ou inserir segredos no repositorio.
