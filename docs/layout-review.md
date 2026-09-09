# Revisão dos layouts — 9 de setembro de 2026

## Causa e correção

Cozinha e garçom mantinham uma coluna de largura zero no grid quando o menu era recolhido. Como o menu era removido e o conteúdo tinha posicionamento automático, a área principal ocupava essa coluna vazia. O administrador apresentava o mesmo problema; nas configurações havia ainda uma terceira coluna a preservar.

A área principal agora tem coluna e linha explícitas, independentemente de o menu existir. O administrador mantém o menu secundário de configurações na posição correta. No motoqueiro, o menu recolhido é removido também da navegação por teclado, e o conteúdo mantém sua coluna.

Esses ajustes estão nos componentes do projeto real. A demonstração os reutiliza, portanto recebe a mesma correção.

## Telas revisadas

| Área                             | Ajuste ou verificação                                                                                                               |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Cozinha                          | Largura da área principal ao recolher/expandir; todas as abas; rolagem do menu em janelas baixas                                    |
| Garçom                           | Largura da área principal ao recolher/expandir; todas as abas; rolagem do menu em janelas baixas                                    |
| Motoqueiro                       | Posicionamento explícito do conteúdo; remoção do menu recolhido; rolagem e abas                                                     |
| Administrador                    | Operação, cardápio, clientes, equipe, cobranças, configurações e ajuda com menu aberto/fechado; coluna secundária das configurações |
| Atendente                        | Menu com rolagem e todas as áreas em desktop, largura intermediária e celular; não há recolhimento manual no desktop                |
| Superadministrador               | Rolagem do menu em janela baixa e formulários ajustados ao espaço disponível entre os menus                                         |
| Perfil do cliente                | Pedido ativo, histórico, conta, endereços e cartões passam para uma coluna conforme a largura real do conteúdo                      |
| Home, QR, login e acompanhamento | Regressões dos fluxos e dos layouts existentes no navegador; sem a estrutura de menu recolhível que originou o defeito              |
| Controle da demonstração         | Caixa mais larga ao abrir, campos com largura limitada e seletor QR contido inclusive em320px                                       |

## Como os testes verificam o problema

Os testes verificam posição e largura do conteúdo, além de ausência de rolagem horizontal. Apenas verificar a rolagem não detectaria o conteúdo comprimido em uma coluna de zero pixels. Eles recolhem e expandem os menus em cada aba e alternam entre desktop e celular com o menu fechado. Também verificam acesso às últimas opções em janelas de480px de altura.

A interface real é exercitada com dados e respostas de API controlados. Não são feitas alterações em contas, pedidos ou banco de produção. A revisão cobre os cenários descritos e não equivale a testar todas as combinações possíveis de dados e dispositivos.

Evidências: artifacts/layout-regression-browser.log, artifacts/layout-complete-browser.log e artifacts/layout-focused-unit.log. As capturas ficam em artifacts/demo-screenshots/; a galeria está em artifacts/demo-review.html.
