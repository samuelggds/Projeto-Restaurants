# Demonstração interativa GastroNexa

A rota /demonstracao apresenta um restaurante fictício com seis perfis preparados: cliente, administrador, atendente, cozinha, garçom e motoqueiro. A senha dos acessos demonstrativos é demo1234; a própria tela preenche as contas.

## Como apresentar

1. Abra /demonstracao e escolha **Cliente · Home / delivery** ou **Cliente · Cardápio da mesa (QR Code)**. A Home apresenta a loja e as opções de entrega/retirada. O QR entra diretamente na Mesa 08, usando o mesmo cardápio de mesa do projeto.
2. Use o controle **Demonstração**, no canto inferior esquerdo, para selecionar Cozinha. Inicie o preparo e marque o pedido como pronto.
3. Selecione o funcionário responsável pelo canal do pedido, conforme a tabela abaixo.
4. Volte ao cliente. Na Home, abra **Meus pedidos · acompanhar**. No QR, acompanhe o aviso do pedido e abra **Ver conta**: a conta usa o painel real, com itens, saldo e pagamentos simulados. **Pedir a conta** avisa o garçom e bloqueia novos pedidos enquanto a mesa está encerrando.
5. Entre no Administrador para demonstrar a gestão e as configurações. Alterações de formulário seguem a confirmação de salvamento do painel real ao mudar de seção. **Ver loja** retorna ao cardápio fictício.
6. **Reiniciar cenário** restaura pedidos, catálogo e configurações iniciais da demonstração.

| Canal    | Preparo | Entrega ao cliente                                                | Pagamento                                                                   |
| -------- | ------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Delivery | Cozinha | Motoqueiro retira, inicia a rota e informa o código fictício 1234 | Deve estar confirmado antes da conclusão; dinheiro tem recebimento simulado |
| Mesa     | Cozinha | Garçom leva à mesa                                                | A conta pode continuar aberta após levar os itens                           |
| Retirada | Cozinha | Atendente confirma a retirada no balcão                           | Precisa estar confirmado antes da entrega                                   |

É como uma maquete em funcionamento: as comandas percorrem os setores, mas nenhum cliente recebe cobrança nem uma entrega real.

## O que mudou

- A home usa HomePage e os estilos da loja real: cabeçalho, carrossel fotográfico, ofertas, categorias, pesquisa, favoritos e sacola. Os produtos e endereços permanecem fictícios.
- O cardápio QR usa HomePage em modo mesa, TableOrderContinuationModal, TableAccountPanel e os atalhos de atendimento do projeto. Permite adicionar à conta ou simular pagamento online. Pagamentos parciais e divisão igual reservam o valor correto; dinheiro/maquininha aguardam confirmação do garçom.
- As áreas dos funcionários reutilizam os módulos e componentes operacionais do projeto, incluindo navegação móvel, filtros, detalhes dos pedidos e conta da mesa.
- O administrador usa o próprio AdminPage, incluindo as seções de configuração, gestão de catálogo e equipe. Ajuda, gestão e mensalidades são carregadas separadamente para respeitar o orçamento do bundle.
- Nome, cor e catálogo editados no admin aparecem nas demais áreas. O checkout verifica loja fechada, canais e pagamentos desativados, pedido mínimo, disponibilidade, estoque e preço alterado.
- Configurações e registros simulados de impressão e remuneração administrativa são preservados ao trocar de perfil.
- O controle da demonstração acomoda o nome completo do perfil QR e mantém os campos dentro da caixa em telas pequenas.
- O recolhimento dos menus foi corrigido nos componentes compartilhados de cozinha, garçom, motoqueiro e admin. A área de trabalho continua ocupando a largura disponível tanto na demonstração quanto no projeto real.
- A logo GX fornecida foi adicionada à landing page, à identificação da demonstração e ao favicon da plataforma.
- Pedidos são compartilhados entre abas da mesma origem no mesmo navegador; cada aba mantém seu próprio perfil. Isso permite apresentar cliente e cozinha lado a lado. Navegadores ou dispositivos diferentes têm cenários separados.

## Isolamento e limites

O estado usa chaves próprias de armazenamento da demonstração. O administrador roda em documento separado, com armazenamento em memória, um adaptador de API local e política que bloqueia conexões. Ele recebe somente o cenário fictício. Os testes verificam que a sessão real do navegador continua preservada.

Pix e cartão simulam confirmação; dinheiro tem confirmação local. Trajetos e código de entrega são fictícios, sem acesso ao GPS. Impressão, integrações de pagamento, WhatsApp e solicitações de suporte não acionam serviços reais. Ações que exigem integração externa não implementada, como estorno com provedor e processamento de imagem por IA, exibem uma mensagem explicando a limitação da demonstração. Não se deve usar credenciais ou dados de clientes reais; os campos de tokens de pagamento são descartados antes da persistência.

O cenário reproduz os fluxos de pedido descritos acima. Não constitui teste de carga, validação do banco de produção, cobrança real ou comprovação de todas as integrações administrativas. Configurações financeiras avançadas e cálculos de remuneração do cenário usam dados de exemplo.

## Evidências

- Suíte completa do frontend: 954 testes aprovados antes dos últimos ajustes de carregamento e persistência; esses ajustes receberam regressão focada adicional.
- Jornadas de navegador: três tipos de pedido, código de entrega e recebimento, separação por função, sincronização entre abas, salvamento do admin, isolamento de API e visual móvel.
- Os 22 testes de navegador das quatro áreas reais dos funcionários também passaram com os componentes compartilhados.
- Regressão do recolhimento dos menus e do fluxo QR: seis testes de navegador aprovados; registros em artifacts/layout-regression-browser.log.
- Logs em artifacts/demo-*.log; imagens em artifacts/demo-screenshots/. Galeria: artifacts/demo-review.html.
- Os testes da demonstração foram incluídos no comando test:e2e:critical para execução no CI.

O build inclui index.html e demo-admin.html; ambos precisam ser publicados junto com assets/ e os arquivos públicos. Não houve mudança de banco nem necessidade de cadastrar contas reais para a demonstração.
