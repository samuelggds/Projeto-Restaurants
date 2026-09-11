# Demonstração interativa GastroNexa

A rota /demonstracao apresenta um restaurante fictício com seis perfis preparados: cliente, administrador, atendente, cozinha, garçom e motoqueiro. A senha dos acessos demonstrativos é demo1234; a própria tela preenche as contas.

## Como apresentar

1. Abra /demonstracao e escolha **Cliente · Home / delivery** ou **Cliente · Cardápio da mesa (QR Code)**. A Home apresenta a loja e as opções de entrega/retirada. O QR entra diretamente na Mesa 08, usando o mesmo cardápio de mesa do projeto.
2. Use o controle **Demonstração**, no canto inferior esquerdo, para selecionar Cozinha. Inicie o preparo e marque o pedido como pronto.
3. Selecione o funcionário responsável pelo canal do pedido, conforme a tabela abaixo.
4. Volte ao cliente. Na Home, abra **Meus pedidos · acompanhar**. No QR, acompanhe o aviso do pedido e abra **Ver conta**: a conta usa o painel real, com itens, saldo e pagamentos simulados. **Pedir a conta** avisa o garçom; novos pedidos durante o encerramento seguem a configuração demonstrativa da conta de mesa.
5. Entre no Administrador para demonstrar a gestão e as configurações. Alterações de formulário seguem a confirmação de salvamento do painel real ao mudar de seção. **Ver loja** retorna ao cardápio fictício.
6. **Reiniciar cenário** restaura pedidos, catálogo e configurações iniciais da demonstração.

| Canal    | Preparo | Entrega ao cliente                                                | Pagamento                                                                   |
| -------- | ------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Delivery | Cozinha | Motoqueiro retira, inicia a rota e informa o código fictício 1234 | Deve estar confirmado antes da conclusão; dinheiro tem recebimento simulado |
| Mesa     | Cozinha | Garçom leva à mesa                                                | A conta pode continuar aberta após levar os itens                           |
| Retirada | Cozinha | Atendente confirma a retirada no balcão                           | Precisa estar confirmado antes da entrega                                   |

É como uma maquete em funcionamento: as comandas percorrem os setores, mas nenhum cliente recebe cobrança nem uma entrega real.

## O que mudou

### Atualização de 11/09/2026

- O assistente de ingredientes permite concluir o cadastro no painel demonstrativo. Foram incluídos seis ingredientes com fotos específicas, categorias e preços fictícios. Nome, imagem enviada/escolhida, disponibilidade e preço editados pelo visitante são preservados ao trocar de tela e recarregar. Fotos e seed se aplicam somente à demonstração; veja [arquivos e geração das fotos](demo-ingredient-images.md).
- Personalizações do produto (adicionais, remoções e observação) acompanham a sacola e a comanda da cozinha. Variantes são separadas e o checkout verifica preço, versão da configuração e estoque agregado das variantes.
- O painel simula modelos de configuração de produtos, importação de catálogo com exemplos explícitos, terminais, planos, suporte, reimpressão e operações administrativas de remuneração. Registros fictícios são persistidos; importação não consulta o iFood nem reconhece uma foto por IA, e reimpressão não aciona impressoras.
- Funcionários criados no painel geram acessos fictícios do papel correspondente; desativar um funcionário impede usar aquele acesso. Relatos de problemas e respostas acompanham os pedidos entre as telas.
- Conta de mesa respeita os meios de pagamento, divisão e taxa de serviço configurados no cenário. Confirmação manual e fechamento no painel atualizam os mesmos registros demonstrativos.
- O pagamento antecipado da mesa também é simulado: saldo pendente mais novo pedido precisa ultrapassar o limite, ou o pedido precisa ocorrer em um período configurado. Igualdade com o limite permite adicionar à conta; limite vazio desativa a regra de valor e zero exige antecipação para pedidos positivos. Horários seguem o fuso da conta e podem terminar no dia seguinte. O caminho de pagamento imediato permanece disponível após uma tentativa recusada de adicionar à conta, se estiver habilitado.
- A configuração explica essas regras com um exemplo calculado a partir do limite informado e avisa quando o pagamento online está desativado. Os campos de valor em reais e de 1 a 5 cópias da impressora permitem apagar e redigitar sem converter o valor a cada tecla. São componentes compartilhados pelo painel real e pelo demonstrativo.
- Centrais de ajuda existentes de administrador, cozinha, garçom e motoqueiro usam as telas atuais do projeto em prévias isoladas, somente para consulta. As instruções acompanham as seções atuais. A mudança atende tanto o sistema real quanto a demonstração.
- A prévia de celular da ajuda tem altura limitada. No cardápio administrativo móvel, os produtos usam linhas compactas com foto pequena e menu de ações; cabeçalho e ingredientes acomodam telas estreitas. São estilos compartilhados pelo sistema real e pela demonstração.
- As prévias da ajuda permitem rolagem por toque, roda do mouse e teclado, inclusive nas telas com rolagem interna. Apenas os controles ficam inativos: o bloqueio de interação não é mais aplicado à tela inteira. A prévia mantém dados fictícios, armazenamento isolado e conexões bloqueadas.
- Exemplos de mensagens do WhatsApp usam `https://gastronexa.com.br/` e o caminho de acompanhamento do pedido.

### Atualizações anteriores

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

Validação da atualização de 11/09/2026:

- A suíte completa do frontend passou com 191 arquivos e 1.011 testes. Após os ajustes finais de fotos e layout, passaram novamente os 32 testes focados de catálogo demonstrativo, assistente de ingredientes e guias.
- Os oito cenários de navegador de `demo-ingredients-help.spec.ts` e `admin-ingredient-categories.spec.ts` passaram nas execuções finais de cada cenário. Cobrem cadastro/edição/remoção de foto, preservação após recarga, personalização até a cozinha, reimpressão fictícia, prévias de todas as áreas e layout móvel real/demonstrativo.
- A correção posterior de rolagem passou em seis cenários de navegador: mouse e teclado no painel real e no demonstrativo, gestos nativos de toque com celular emulado nas duas versões e rolagem interna do motoqueiro em 390 e 1280 px. Outros 22 testes verificam o bloqueio das ações sem cancelar a navegação nativa. Essa validação usou Chrome; não foi executada em um aparelho físico.
- A revisão posterior dos campos de impressora e pagamento antecipado passou em 18 testes dos componentes administrativos e 38 testes do checkout e da demonstração. Dois cenários no Chrome verificaram digitação e layout em celular emulado nos painéis real e demonstrativo. Build, TypeScript, lint e limites de arquitetura/bundle aprovados; capturas e logs têm prefixos `settings-`, `printing-copies-` e `table-prepayment-` na pasta local de evidências.
- Build, TypeScript, ESLint sem avisos, formatação, limites de arquitetura e orçamento dos bundles aprovados. Catálogo dos scripts operacionais e validação do Compose de produção aprovados.
- A política de segurança do frontend foi verificada por HTTP com Caddy isolado em 12 rotas; a CI executará essa verificação e os novos cenários de navegador.
- Capturas e logs locais desta revisão estão em `artifacts/demo-functional-completeness/`, excluídos do versionamento. A execução não publicou o projeto nem acessou dados reais de restaurantes.

Registros de validações anteriores (não somar às contagens acima):

- Suíte completa do frontend: 954 testes aprovados antes dos últimos ajustes de carregamento e persistência; esses ajustes receberam regressão focada adicional.
- Jornadas de navegador: três tipos de pedido, código de entrega e recebimento, separação por função, sincronização entre abas, salvamento do admin, isolamento de API e visual móvel.
- Validação final: 67 testes de navegador aprovados, abrangendo a demonstração, áreas reais dos funcionários, administrador, superadministrador, perfil, login, Home e QR. Mais 52 testes focados dos componentes e da lógica da demonstração passaram; esses números não devem ser somados à suíte anterior.
- Regressão do recolhimento dos menus e do fluxo QR: seis testes de navegador aprovados; registros em artifacts/layout-regression-browser.log.
- Logs em artifacts/demo-*.log; imagens em artifacts/demo-screenshots/. Galeria: artifacts/demo-review.html.
- Os testes da demonstração foram incluídos no comando test:e2e:critical para execução no CI.

O build inclui `index.html`, `demo-admin.html` e `help-preview.html`; os três documentos precisam ser publicados junto com `assets/` e os arquivos públicos. As prévias requerem incorporação pela mesma origem; a configuração de deploy mantém essa permissão restrita aos documentos demonstrativos. Não houve mudança de banco nem necessidade de cadastrar contas reais para a demonstração.
