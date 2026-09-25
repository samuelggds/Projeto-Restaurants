# Validação comercial e segurança — setembro/2026

Este documento acompanha a revisão de 21/09/2026. CI aprovado é evidência dos cenários automatizados; não certifica segurança absoluta nem homologação financeira real.

## Situação informada pelo responsável

| Serviço                 | Situação                                                                                                   | Critério para venda                                                                   |
| ----------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Mercado Pago            | Integração ativa para Pix QR Code e cartão                                                                 | Comprovar fluxo completo no estabelecimento piloto e na cobrança da plataforma        |
| Efí Open Finance        | Implementado no código; ativação depende de configuração e homologação                                     | Manter desabilitado até validar pagamento, retorno, webhook, expiração e devolução     |
| Asaas                   | Temporariamente desativado; cadastro empresarial pendente                                                  | Manter desativado; não preencher credenciais falsas para passar CI                    |
| Backup externo          | Configurado e restauração testada pelo responsável                                                         | Preservar rotina, alertas e evidências; testar também o novo dump pré-deploy          |
| MFA em produção         | Funcionamento confirmado pelo responsável                                                                  | Preservar obrigatoriedade e entrega de códigos                                        |
| Criptografia pré-deploy | `age` instalado e chave pública copiada com sucesso de `/etc/gastronexa/backup.env` para `.env.production` | Entra em uso após implantação desta versão; validar um novo dump criptografado        |
| Site                    | Somente `https://www.gastronexa.com.br`                                                                    | HTTPS válido, origens e callbacks coerentes; domínio sem www não é exigido            |

## Antes de mesclar e implantar

1. O responsável confirmou que o MFA funciona em produção. Após a atualização, conferir ADMIN e SUPER_ADMIN: o papel obrigatório não pode mais ignorar MFA por preferência individual. Preservar SMTP/canal configurado; não reduzir `MFA_REQUIRED_ROLES` para contornar falha de entrega. Segredos e códigos não devem aparecer em logs.
2. No Lightsail, confirmar `age --version`. O deploy precisa da **chave pública** de recuperação `BACKUP_AGE_RECIPIENT=age1...` em `.env.production`, sem aspas, ou no ambiente do processo. Reutilizar o destinatário do backup externo cujo restauro já foi testado. A chave privada permanece fora do servidor/repositório. Instalar `age` pelo gerenciador de pacotes do servidor caso ausente.
3. Proteger `.env.production` e o diretório de aplicação para leitura somente do operador autorizado. Não compartilhar seu conteúdo em chats, PRs ou logs. O deploy recusa continuar quando existe banco ativo sem chave/ferramenta de criptografia.
4. Revisar os checks obrigatórios no **commit final**. Migration Compatibility inclui atualização real a partir da versão anterior com dados preservados. Não aceitar job ignorado/cancelado como aprovação nem contornar o gate para implantar.

A cópia da chave pública foi confirmada pelo responsável em 21/09/2026, com validação pelo `age` e preservação das demais credenciais. Para futuras instalações, `sudo bash scripts/configure-predeploy-backup-key.sh` faz essa cópia entre os caminhos padrão acima, sem executar os arquivos de configuração nem imprimir seu conteúdo. A operação recusa arquivos simbólicos, destinatários duplicados/inválidos e alterações concorrentes detectadas no arquivo de destino.

## Backup pré-deploy

O dump novo usa formato custom do PostgreSQL e é criptografado em fluxo com `age`, sem arquivo intermediário em texto aberto. Diretório `backups/predeploy` recebe modo 700 e arquivo `.dump.age` modo 600. Falha no dump/criptografia interrompe antes da migration; arquivo parcial é removido. O rollback automático troca somente imagens da aplicação, nunca restaura banco sobre vendas novas.

Os dumps legados `.sql.gz` existentes não são considerados criptografados. O deploy restringe suas permissões. O operador deve inventariá-los, migrar os que precisam ser retidos para armazenamento criptografado e descartar as cópias antigas somente após verificar a restauração e a política de retenção. Não apagar backups indiscriminadamente.

Para testar o novo formato, copiar um `.dump.age` para ambiente de recuperação isolado. Usar `age --decrypt -i ARQUIVO_DE_CHAVE_PRIVADA` para gerar o dump apenas nesse ambiente protegido e `pg_restore --list` para conferir o catálogo; depois restaurar numa base vazia descartável e verificar dados, constraints e RLS. Nunca apontar o ensaio para a base de produção. Registrar data, operador, tamanho, checksum, resultado e tempo de recuperação sem incluir conteúdo dos clientes.

## Evidência financeira necessária

Registrar IDs internos, referência do provedor, horário, resultado esperado/observado e versão implantada. Não registrar CVV, PAN, tokens, CPF, payloads completos nem capturas de cartão.

- Venda piloto com cartão e Pix, incluindo cliente visitante e autenticado: valor, restaurante recebedor, confirmação por webhook autenticado e acompanhamento do pedido correto.
- Assinatura da plataforma: trial, prazo de cobrança, geração manual de Pix, expiração em 30 minutos, indisponibilidade do código expirado, confirmação e liberação de acesso. O pagamento da plataforma e o pagamento ao restaurante são contas distintas.
- Estorno: devolução confirmada no provedor e no sistema; estado pendente não cancela como se houvesse devolução. Evento repetido/fora de ordem não duplica crédito nem devolução. Executar cenários destrutivos somente em sandbox; qualquer cobrança real exige combinação prévia de valor e pagador.
- Recarga de IA: aprovação, estorno/contestação e reentrega de evento; saldo e ledger devem refletir apenas crédito comprovado. Créditos já consumidos ou reservados não podem ser recriados por reenvio de webhook.

O workflow **Payment Sandbox Preflight** valida somente autenticação/consulta do provedor escolhido. Falta de configuração nesse provedor falha explicitamente. Configurar segredos de teste no environment `payment-sandbox` do GitHub; nunca copiar os segredos de produção. Asaas/Pagar.me permanecem integrações futuras e não são tratados como homologados. Este preflight não substitui a lista de cenários acima.

Para Mercado Pago, cadastrar o segredo `MERCADO_PAGO_SANDBOX_TOKEN`. Credenciais de teste de Orders podem começar com `APP_USR`; nesse caso, cadastrar também a variável `MERCADO_PAGO_SANDBOX_USER_ID` com o ID do vendedor de teste. O preflight exige que a consulta da conta confirme esse ID e a identificação `test_user`; uma resposta sem essa confirmação falha e exige revisão, nunca habilita cobranças. O prefixo sozinho não comprova ambiente de teste. Ver [teste de pagamentos automáticos Orders](https://www.mercadopago.com.br/developers/pt/docs/automatic-payments-orders/integration-test).

## Conciliação e dados antigos

Observação escrita pelo cliente não decide se o pagamento é na entrega. O campo estruturado `payOnDelivery` é a fonte de verdade. Não transformar automaticamente pedidos antigos em pagamento na entrega com base no texto `PAY_ON_DELIVERY:`. Se houver registros legados inconsistentes, revisar evidência financeira do pedido antes de correção administrativa auditada.

No Asaas, `PROCESSING` permanece pendente até consulta autenticada ao pagamento do restaurante comprovar a devolução integral por itens `refunds` com `status=DONE`. Valor parcial ou tentativa cancelada não é devolução integral. Repetir a ação de cancelamento consulta o estado; não envia novo POST de estorno. Notificações de estorno também conciliam pela API. Referência/valor divergentes ou tentativa sem confirmação exigem investigação; não alterar o banco para `SUCCEEDED` manualmente sem evidência.

As correções de recarga se aplicam aos eventos conciliados após implantação. Identificar contestações/estornos históricos no relatório financeiro do Mercado Pago e solicitar reentrega segura do evento correspondente; confirmar o resultado do ledger. Não assumir que uma migration, sozinha, consultou o histórico do provedor.

Reversões confirmadas debitam o valor cumulativo uma única vez. Valores já usados ficam como dívida compensada por recargas futuras; reservas em andamento são preservadas. Contestação sem decisão ou estorno sem valor confiável bloqueia novas operações de IA até conciliação. Uma aprovação antiga não remove esse bloqueio nem recria crédito estornado. No painel de pedidos, **Consultar estorno** consulta uma tentativa existente, sem criar outra devolução.

## Verificação manual da infraestrutura

Não foi declarada auditoria da conta AWS completa. Conferir no console e registrar evidência sanitizada:

- MFA dos operadores AWS/GitHub/provedores; usuários e chaves antigas revogados, permissões mínimas de IAM e deploy.
- Firewall Lightsail: 80/443 públicos; SSH restrito à origem administrativa; PostgreSQL/Redis/serviços internos sem exposição pública. Validar também a configuração IPv6.
- Acesso SSH por chave, sem senha/root remoto; atualizações de segurança e acesso de recuperação testado antes de mudar regras.
- Alertas de indisponibilidade, erro de pagamento/webhook, falha de backup, expiração de certificado e disco com destinatário que recebe o teste.
- Backups de uploads e recuperação das chaves de criptografia além do banco; retenção e restauração periódica.
- Consulta autenticada entre dois restaurantes piloto não expõe pedidos, clientes, credenciais, arquivos ou eventos do outro. Monitoramento não armazena payloads financeiros sensíveis.

Referências: [estornos Asaas](https://docs.asaas.com/docs/refunds), [estados de pagamentos Mercado Pago](https://www.mercadopago.com.br/developers/pt/docs/checkout-api-payments/response-handling/query-results).
