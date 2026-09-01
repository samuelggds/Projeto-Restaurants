# Impressão operacional da cozinha

Esta integração envia **comandas operacionais** para uma impressora térmica instalada no
computador do restaurante. Ela não emite cupom fiscal, NFC-e, SAT nem qualquer documento
tributário.

O recurso é opcional e nasce desativado para todos os restaurantes existentes. A tela da cozinha,
os pedidos e os pagamentos continuam funcionando normalmente sem impressora ou Print Agent.

## Arquitetura

```text
pedido liberado / pagamento confirmado
                  │
                  ▼
      KitchenPrintingService
       configuração do tenant
                  │
                  ▼
       KitchenPrintJob (PostgreSQL)
           PENDING / FAILED
                  │ claim atômico + lease
                  ▼
         Print Agent no Windows
                  │ spooler do sistema
                  ▼
        impressora térmica escolhida
                  │ ACK idempotente
                  ▼
               PRINTED
```

O backend na nuvem nunca tenta acessar USB ou a rede local. O agente consulta a fila por HTTPS,
renderiza o snapshot versionado da comanda e usa o spooler do Windows sem abrir popup ou
`window.print()`.

### Componentes

- `RestaurantPrinterSettings`: configuração privada, uma por restaurante;
- `PrinterAgentDevice`: identidade revogável do agente local;
- `KitchenPrintJob`: fila durável, payload imutável, claim, lease, tentativas e ACK;
- `KitchenPrintPayloadV1`: snapshot mínimo necessário à cozinha;
- `print-agent/`: processo local TypeScript com transporte Windows e transporte mock;
- painel Admin em **Configurações → Impressora da cozinha**;
- ação **Reimprimir comanda** no painel da cozinha.

## Quando um job é criado

### `NEW_ORDER`

O job nasce no mesmo momento semântico em que o pedido é liberado para a operação/cozinha.
Pedidos com pagamento na entrega entram imediatamente. PIX ou cartão online que a regra atual
retém até a aprovação só entram quando são efetivamente liberados. A integração não altera
`deferRealtimeUntilPaid` nem usa Socket.IO como fonte de verdade.

### `PAYMENT_CONFIRMED`

O job nasce somente na transição persistida de `paid = false` para `paid = true`. PIX, cartão,
confirmação administrativa, PIN, conta de mesa e callbacks dos gateways convergem para os pontos
centrais de confirmação. A criação do job participa da mesma transação de banco; nenhum I/O com a
impressora ocorre dentro dela.

Pedidos com pagamento na entrega ou contas de mesa podem chegar tarde à impressora com este
gatilho. O painel explica esse efeito e recomenda `NEW_ORDER` quando a cozinha deve começar antes
do pagamento.

### Deduplicação e reimpressão

A impressão automática usa uma chave global única no PostgreSQL:

```text
AUTO:KITCHEN:ORDER:<orderId>
```

O trigger não faz parte da chave. Assim, webhook repetido, reconexão, repetição do serviço e troca
de `NEW_ORDER` para `PAYMENT_CONFIRMED` não criam uma segunda impressão automática para o mesmo
pedido.

Reimpressões manuais são intencionais e recebem uma chave por solicitação. O job registra pedido,
tenant, origem `MANUAL`, solicitante e horário. ADMIN e funcionário COZINHA só podem solicitar
pedidos do próprio restaurante.

## Segurança e isolamento multi-tenant

- `RestaurantPrinterSettings` e `KitchenPrintJob` usam `ENABLE ROW LEVEL SECURITY`, `FORCE ROW
LEVEL SECURITY`, `USING` e `WITH CHECK`;
- a aplicação também mantém `restaurantId` em cada consulta e escrita como defesa em profundidade;
- o contexto RLS é definido com `set_config('app.restaurant_id', ..., true)` dentro da transação;
- a role runtime deve permanecer sem `SUPERUSER` e sem `BYPASSRLS`;
- o protocolo do agente nunca aceita `restaurantId` do body, query ou URL como autoridade;
- somente comandas `DELIVERY` incluem o endereço de entrega persistido no próprio pedido; o
  endereço atual do cadastro do cliente nunca é consultado para reconstruir o snapshot;
- comandas `MESA` e `RETIRADA` não carregam endereço; CPF, token, segredo, hash, credencial de
  gateway e dados de cartão também são sempre excluídos;
- logs estruturados registram IDs operacionais e estados, nunca o payload completo ou o token.

### Exceção consciente de bootstrap

`PrinterAgentDevice` fica fora do RLS porque o tenant ainda é desconhecido antes da autenticação.
O token tem o formato `pa_<publicId>.<segredo-aleatório>`. O backend consulta somente o mínimo do
registro indicado pelo `publicId`, compara o SHA-256 do segredo com segurança e então deriva o
`restaurantId` persistido. Toda operação de fila posterior entra no contexto RLS desse tenant.

O segredo possui 32 bytes aleatórios, é exibido uma única vez e somente o hash fica no banco. Uma
rotação invalida a chave anterior; revogar o dispositivo bloqueia heartbeat, claim e ACK.

### Endereço em comandas DELIVERY

O backend copia para `KitchenPrintPayloadV1` exclusivamente os campos `address`, `number`,
`complement`, `district`, `city`, `state` e `zipCode` persistidos no `Order` no momento da compra.
Ele não consulta o endereço atual do usuário. Campos vazios são omitidos, e o agente só renderiza
esse bloco quando `order.type` é `DELIVERY`.

O cabeçalho contém somente `Restaurant.name`. Endereço do restaurante, razão social, CNPJ,
telefone, WhatsApp, e-mail, slogan, logo e nome da plataforma não fazem parte do snapshot. Para
`MESA`, a comanda destaca a mesa; para `RETIRADA`, mostra **RETIRADA NO LOCAL**.

## Claim, lease, ACK e retry

- o claim usa uma transação e `FOR UPDATE SKIP LOCKED`, então dois agentes não recebem o mesmo job
  simultaneamente;
- o lease padrão dura 60 segundos;
- se o agente cair antes do ACK, o job volta a ser elegível quando o lease expira;
- o ACK `PRINTED` é idempotente e vinculado ao dispositivo que possui o lease;
- falhas ficam sanitizadas e voltam com backoff de 5, 10, 20 segundos e assim por diante, limitado
  a 300 segundos;
- após cinco claims sem sucesso, o job fica `FAILED` e pode ser devolvido manualmente à fila pelo
  Admin;
- sem agente online, o job permanece `PENDING` e o pedido continua disponível na tela da cozinha.

Impressoras e spoolers comuns não oferecem uma transação distribuída com o SaaS. Portanto existe
uma janela inevitável de entrega **pelo menos uma vez** se o processo cair exatamente depois de o
spooler aceitar a impressão e antes do ACK chegar ao servidor. A chave única impede jobs
automáticos duplicados no banco; a validação em impressora real deve incluir o comportamento do
driver diante dessa janela.

## Configuração pelo Admin

1. Entre em **Configurações → Impressora da cozinha**.
2. Ative **Usar impressora da cozinha**.
3. Ative ou desative a impressão automática.
4. Escolha `Ao entrar na cozinha` ou `Após pagamento confirmado`.
5. Selecione papel de 58 mm ou 80 mm e de 1 a 5 cópias.
6. Salve a configuração.
7. Informe um nome para o computador e gere a chave do agente.
8. Copie a chave imediatamente; ela não será exibida novamente.

O painel mostra heartbeat, impressora reportada, último contato, jobs recentes, falhas e retry.
**Imprimir teste** cria um job durável do tipo `TEST`; não usa pedido real nem afeta métricas.

## Instalação do Print Agent no Windows

Pré-requisitos:

- Windows com a impressora já instalada e imprimindo uma página de teste pelo sistema;
- PowerShell com os comandos `Get-Printer` e `Out-Printer`;
- Node.js 22 ou superior;
- acesso HTTPS ao backend do Pizza IA Delivery.

No PowerShell, a partir do repositório:

```powershell
cd print-agent
npm ci
npm run build
```

Defina a chave fora do histórico do shell e faça o pareamento. A URL deve apontar diretamente para
a origem da API, sem barra final:

```powershell
$env:PRINT_AGENT_CREDENTIAL='pa_UUID.SEGREDO'
node dist/cli.js pair --url https://api.seu-dominio.com
Remove-Item Env:PRINT_AGENT_CREDENTIAL
```

Para desenvolvimento local, HTTP é aceito somente em `localhost`, `127.0.0.1` ou `::1`:

```powershell
$env:PRINT_AGENT_CREDENTIAL='pa_UUID.SEGREDO'
node dist/cli.js pair --url http://localhost:3000
Remove-Item Env:PRINT_AGENT_CREDENTIAL
```

A configuração fica em `%APPDATA%\PizzaIADelivery\print-agent.json`, com escrita atômica e
permissão restritiva quando suportada pelo sistema. Esse arquivo contém a credencial e nunca deve
ser enviado ao Git, suporte ou logs.

## Escolher ou trocar a impressora

```powershell
node dist/cli.js printers
node dist/cli.js select --printer "EPSON TM-T20"
node dist/cli.js config
node dist/cli.js status
```

O nome em `select` deve ser exatamente o retornado por `printers`. Para trocar, execute `select`
novamente. O heartbeat seguinte atualizará o nome exibido no Admin.

## Testes de impressão

Teste somente o spooler local, sem consumir a fila:

```powershell
node dist/cli.js test
```

Teste o fluxo completo SaaS → fila → agente → spooler:

1. execute o agente com `node dist/cli.js run`;
2. no Admin, clique em **Imprimir teste**;
3. acompanhe **Atividade recente** até o estado `Impresso`.

Para validar sem hardware:

```powershell
$env:PRINT_AGENT_CREDENTIAL='pa_UUID.SEGREDO'
node dist/cli.js pair --url http://localhost:3000 --mock
Remove-Item Env:PRINT_AGENT_CREDENTIAL
node dist/cli.js select --printer "Mock Thermal Printer"
node dist/cli.js run
```

O transporte mock é usado pela CI e não envia nada ao spooler físico.

## Inicialização automática

O agente atual é um processo CLI leve. No Agendador de Tarefas do Windows, crie uma tarefa para o
usuário operacional:

- gatilho: **Ao fazer logon**;
- programa: caminho completo de `node.exe`;
- argumentos: caminho completo de `print-agent\dist\cli.js run`;
- iniciar em: diretório `print-agent`;
- habilitar reinício em caso de falha e evitar duas instâncias simultâneas.

Use a conta Windows que configurou a impressora e o arquivo local. Não execute como administrador
sem necessidade. Depois, confirme `Agente conectado` no painel.

## Runbook: pedido não imprimiu

1. **Pedido:** confirme que o pedido entrou na cozinha ou ficou pago, conforme o gatilho.
2. **Job:** no Admin, confira se existe atividade `Aguardando`, `Imprimindo` ou `Falhou`.
3. **Agente:** confira heartbeat e execute `node dist/cli.js status`.
4. **Impressora:** execute `node dist/cli.js printers` e confirme a impressora selecionada.
5. **Hardware:** confira energia, cabo/rede, papel, tampa, fila do Windows e driver.
6. **Recuperação:** em `FAILED`, use **Tentar novamente**; para urgência, use **Reimprimir
   comanda** conscientemente.
7. **Logs:** procure eventos `PRINT_JOB_*` e `PRINT_AGENT_*`; nunca cole token ou payload completo
   em chamados.

Se a chave vazou, rotacione-a no Admin e repareie o agente. Se o computador foi desativado,
revogue o acesso.

## Migration e rollback emergencial

A migration `20260831200000_add_kitchen_printing` cria apenas tabelas, enums, índices, constraints,
FKs e policies novas, com defaults desativados. Ela não altera migrations históricas.

Em emergência, primeiro desative `enabled` e `autoPrintEnabled` para interromper novos jobs sem
perder a fila. O rollback destrutivo das tabelas/enums deve ser executado somente com backup,
janela de manutenção e confirmação de que os dados de auditoria podem ser descartados. Não edite a
migration já aplicada; publique uma migration compensatória revisada.

## Limitações desta etapa

- uma impressora principal de cozinha por configuração local;
- sem roteamento por categoria, bar, caixa ou múltiplas estações;
- sem GUI/tray installer; operação atual via CLI e Agendador de Tarefas;
- transporte real validado por abstração e APIs do Windows, mas não por impressora física neste
  ambiente;
- não é impressão fiscal;
- o resultado visual e corte de papel dependem do driver/modelo e precisam de homologação em 58 e
  80 mm reais.
