# Revisão das áreas de funcionários — 09/09/2026

As quatro áreas já tinham uma boa base operacional: funções separadas, pedidos organizados por etapa, atualização de dados e ações específicas de cada funcionário. Esta revisão melhora a identificação da próxima tarefa, a recuperação de falhas e o uso no celular. As mudanças estão no workspace local.

## O que já estava bom

| Área | Base preservada |
| --- | --- |
| Garçom | Pedidos prontos para levar à mesa, chamados, abertura e fechamento de mesas, consulta da conta e confirmação de pagamentos presenciais. |
| Cozinha | Separação por status e canal, montagem dos produtos e observações, prioridade por espera, histórico e solicitação de reimpressão. |
| Motoqueiro | Retirada e entrega por funcionário, localização opcional, acompanhamento da rota, código de entrega, financeiro e conversas. |
| Atendente | Central de pedidos, registro manual, atendimento ao cliente, acompanhamento de entregas, mesas e chamados. |

## O que foi alterado

### Garçom

- A busca reconhece zeros à esquerda: `07`, `7` e `Mesa 07` localizam a mesa 7. A mesma normalização atende à pesquisa dos pedidos prontos e chamados.
- Filtros de pedidos, mesas e chamados têm a ação **Limpar filtros**. A busca de chamados permite digitação normal de texto no celular.
- Mensagens distinguem ausência de resultados da busca, salão vazio confirmado e falha no carregamento.
- Se a primeira consulta falhar, a tela oferece nova tentativa e não apresenta indicadores operacionais como se o salão tivesse sido consultado. Se uma atualização posterior falhar, os dados anteriores continuam visíveis com indicação de atualização incompleta.
- O menu móvel tem botão de fechar, foco inicial, navegação por Tab, fechamento por Escape e retorno do foco ao botão de origem. O fundo fica bloqueado enquanto ele está aberto.

É como procurar uma comanda pelo número que está escrito na mesa, sem precisar adivinhar como o sistema armazenou esse número.

### Motoqueiro

- A entrega em andamento aparece no começo da visão geral, com cliente, endereço e botão **Continuar entrega**. Quando existem várias, há acesso à lista completa.
- O atalho abre o pedido selecionado. Ele não inicia outra retirada nem conclui a entrega.
- Na entrega ativa, o botão **Ligar para cliente** dispensa a abertura dos detalhes. O endereço `tel:` usa somente dígitos e, quando presente, o `+` inicial. Contatos inválidos não recebem esse atalho.
- Durante carregamento ou erro, os contadores operacionais não exibem zero como resultado confirmado e a lista não anuncia “Tudo certo por aqui”.
- O menu móvel ganhou controle de foco, Escape e bloqueio de rolagem. Ele fica acima do botão flutuante de conversa.
- A lista de próximas retiradas foi extraída para um componente próprio, mantendo o arquivo principal dentro do limite arquitetural existente.

É como deixar a entrega que já está na mochila em cima da bancada: ela vira a primeira coisa que o funcionário vê ao voltar para a tela.

### Cozinha

- Os filtros mostram quantos pedidos ativos correspondem à seleção e oferecem **Limpar filtros**.
- A fila vazia recebeu uma mensagem única. Uma busca sem correspondência explica que os filtros estão escondendo pedidos.
- Ao selecionar somente um status, a coluna ocupa o espaço disponível; o painel continua com três etapas quando todas estão selecionadas.
- Depois da confirmação da atualização, aparece uma mensagem de preparo iniciado ou pedido pronto durante oito segundos. Ela permanece mesmo quando o cartão sai do filtro atual.
- Rejeições da atualização continuam como erro, sem mensagem de sucesso. A proteção contra clique duplicado foi preservada.
- O menu móvel ganhou botão de fechar, foco controlado, Escape, retorno de foco e bloqueio do fundo.

É como mudar a comanda de “pendente” para “preparando” e ouvir a confirmação do colega: o cartão pode sair daquela coluna sem deixar dúvida sobre o resultado.

### Atendente

- Cada pedido da fila prioritária pode ser aberto diretamente, inclusive pelo teclado.
- O painel informa carregamento, atualização pendente e horário da última consulta bem-sucedida. A falha inicial não é apresentada como fila tranquila.
- Respostas incompletas da consulta operacional são rejeitadas. A falha de atualização preserva os dados anteriores e exibe um alerta.
- Os detalhes do pedido validam identificação, total e estado de pagamento. Se a consulta falhar, aparece **Tentar carregar novamente**; valores e pagamento não são apresentados como se tivessem sido obtidos.
- O painel de detalhes gerencia foco, Tab, Escape e retorno ao pedido de origem. A ação de concluir retirada exige dados carregados, pedido pronto e pagamento confirmado, mantendo também a validação do servidor.
- No celular, a barra mostra **Visão geral, Pedidos, Novo pedido, Chamados e Mais**. O menu **Mais** oferece Atendimento, Entregas, Mesas e **Sair da conta**, sem depender de descobrir uma rolagem horizontal.

É como transformar o quadro de pendências em uma bancada de trabalho: tocar na comanda já abre o que é necessário para atendê-la.

## Backend, banco e regras operacionais

Os endpoints existentes já forneciam os dados necessários a este conjunto de melhorias. Não foi necessária alteração de schema, migration ou regra de negócio no backend. A validação adicional das respostas está no cliente da API do atendente.

Os cenários de regressão continuam cobrindo pedido manual, pagamento presencial, retirada paga, impedimento de fechar mesa com pendências, transição de preparo, rejeição de atualização, código de entrega e filtragem de dados por restaurante/funcionário no frontend.

## Validação e limites das evidências

- Suíte completa do frontend: **910 testes aprovados**, antes dos últimos ajustes de navegação e dos cenários adicionais de telefone internacional e total inválido.
- Verificação final das quatro áreas: **90 testes aprovados em 13 arquivos**, incluindo os últimos ajustes. Esses testes se sobrepõem à suíte completa; os números não devem ser somados.
- **20 jornadas Playwright aprovadas** nas quatro áreas, incluindo navegação, menus e todas as abas. Após o último ajuste da camada visual do menu do motoqueiro, sua jornada móvel passou novamente (**1 cenário**).
- Layout verificado em celular de 390 px para garçom, cozinha e motoqueiro; 360 e 430 px para atendente. Há verificações de largura, foco e ações reais no navegador, além de inspeção das capturas.
- Verificação de tipos, lint sem avisos, build do frontend, limite dos bundles e restrições arquiteturais aprovados.

Os testes Playwright usam a interface real com respostas de API e eventos controlados pelo teste. Eles comprovam o comportamento da interface nesses cenários; não representam uma nova validação de banco real, impressão física, ligação telefônica efetuada, rede móvel em campo ou carga de produção. Este trabalho também não substitui um teste de invasão.

Evidências locais em `artifacts/employee-ux-*.log` e `artifacts/employee-ux-screenshots/`. A galeria está em `artifacts/employee-ux-review.html`.

## Continuação implementada

- Cozinha: modo de leitura ampliada, com produtos e observações maiores, ações mais altas e preferência restaurada ao voltar à tela.
- Motoqueiro: recuperação de pedidos após queda da conexão, retorno ao aplicativo e reconexão, sem ligar o GPS automaticamente.
- Atendente: central separada em componentes menores, preservando as ações, e filtros coerentes para pendências antigas, pedidos demorando e itens prontos.
- Regressão das quatro áreas: 22 jornadas de navegador aprovadas, incluindo esses três cenários adicionais. A demonstração reutiliza os componentes operacionais com fontes de dados locais.

## Próximas melhorias a avaliar com os funcionários

1. Observar um turno real para ajustar a ordem das ações, o tamanho das informações e os limites de espera por tipo de pedido.
2. Avaliar divisão por estação de preparo, conforme a organização física do restaurante.
3. Continuar a revisão dos demais componentes grandes em mudanças próprias com regressão de comportamento.

Esses itens são propostas para outra etapa; não foram apresentados como funcionalidades implementadas nesta revisão.
