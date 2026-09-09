# Paginação e jornadas verificadas — 8 de setembro de 2026

Foram corrigidos os consumidores dos pedidos e os contratos de teste, mantendo filas ativas separadas do histórico paginado. As consultas financeiras e de clientes do administrador usam agregados do servidor; a primeira página não representa mais os totais do restaurante.

## Correções concluídas

- Filas operacionais percorrem páginas de até 100 pedidos ativos, sem consultar todo o histórico. Há proteção contra cursor repetido e resposta sem metadados.
- Histórico de cozinha, motoqueiro, perfil do cliente e atendimentos encerrados tem navegação por cursor. Atendimentos abertos são consultados independentemente do status do pedido.
- Indicadores e diretório de clientes do administrador usam `/orders/reports/overview` e `/orders/reports/customers`; busca e ordenação são enviadas ao servidor.
- Atualizações do painel preservam as páginas já abertas. O botão “Voltar aos 10” reinicia explicitamente a paginação.
- A jornada de navegador revelou uma regressão real: concluir a entrega atualizava a fila local, mas não renovava o histórico. O histórico do motoqueiro agora acompanha alterações na lista de pedidos, inclusive confirmações e eventos.
- Fixtures Playwright agora simulam envelopes, filtros, cursores, totais e agregados. Falhas simuladas da fila ativa não são consumidas pela consulta paralela de histórico.
- Playwright usa `127.0.0.1:4181`, porta estrita e `reuseExistingServer: false`. A permissão de GPS usa a mesma origem.
- Mocks específicos de notificações do motoqueiro e terminais de pagamento retiraram chamadas de rede acidentais dos testes unitários.

## Evidências

| Verificação | Resultado | Registro |
| --- | --- | --- |
| Serviço de paginação + 4 componentes administrativos/operacionais | 22 testes aprovados, sem warnings de rede | `pagination-focused-tests.log` |
| Regressão do histórico após entrega + serviço de paginação | 12 testes aprovados após a última correção | `pagination-history-regression-tests.log` |
| Typecheck e lint do frontend | Aprovados | `pagination-typecheck.log`, `pagination-lint.log` |
| Navegador, lote principal | 21 casos aprovados; 1 falha real corrigida e reexecutada abaixo | `pagination-browser-verified.log` |
| Navegador, regressões finais | 2 casos aprovados: entrega completa do motoqueiro e visitante mobile/teclado | `pagination-browser-final-regressions.log` |

São **23 jornadas distintas de navegador aprovadas entre os dois últimos lotes**: administrador (5), atendente (3), motoqueiro/rastreamento (5), cozinha (4), perfil do cliente (1), garçom (4) e visitante no celular (1). A execução inicial com fixtures antigas foi mantida em `pagination-browser-tests.log` como diagnóstico, e não como resultado final.

Os testes reproduzem uma fila com 125 pedidos ativos e histórico pessoal acima de uma página. No navegador, um restaurante com 126 pedidos exibe R$ 1.275,00 nos indicadores, mantém a listagem em 10 linhas e encontra o pedido antigo em preparo ao selecionar a fila ativa.

O teste mobile verifica o agrupamento das ações, expansão e recolhimento, contenção na viewport de 390 × 844, abertura de produto com Enter, ausência de botões interativos aninhados e ausência de envio de pedido durante essa navegação.

## Limites da evidência

As jornadas usam frontend real no Chrome e APIs simuladas com contratos paginados. Não substituem testes de integração com banco/provedores reais. Não foi executado Docker por este agente. Após todos os casos terminarem, o encerramento automático do servidor Playwright ficou pendurado neste host Windows; o runner próprio foi interrompido na fase de limpeza, sem interromper casos em execução. Por isso, os resultados acima são os resultados individuais registrados pelo Playwright, e não uma alegação de saída zero dos lotes.
