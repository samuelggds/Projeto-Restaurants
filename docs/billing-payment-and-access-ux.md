# Pagamento e identidade no acesso

Em Cobranças e assinaturas, a aba Pagamento abre primeiro e reúne o cadastro da renovação automática. Planos e Cobranças continuam separados; no acesso restrito por cobrança, as faturas continuam sendo a primeira informação.

O cartão recebe destaque, mas a cobrança recorrente só é solicitada depois da autorização explícita no formulário. O Pix fica em uma seção expansível e sua abertura não altera a forma de pagamento. Desativar a renovação exige a ação identificada no botão. Número e código de segurança continuam nos campos hospedados do Mercado Pago; o backend recebe o token e dados mascarados.

O cadastro é carregado sob demanda, tem recuperação de falhas, limite de espera do SDK e gerenciamento de foco. Erros técnicos do provedor e do banco não são exibidos ao usuário. Isso não substitui a configuração de credenciais e a aplicação das migrações já existentes no ambiente de implantação.

Na demonstração, a mesma interface utiliza somente o cartão fictício 4242, sem carregar o Mercado Pago ou pedir dados financeiros. A escolha permanece no cenário local e pode ser reiniciada com a demonstração.

A apresentação de acesso da GastroNexa usa SVG com contornos vetoriais suavizados da marca original, Nexa em laranja e composição responsiva. O GX e as linhas são traçados uma vez por carregamento do documento. Os textos são digitados caractere por caractere; Gastro segue da esquerda para a direita e Nexa segue da direita para a esquerda. Navegar pela aplicação não repete a introdução. A preferência por movimento reduzido mantém o conteúdo completo e estático.

## Verificação

- Testes de digitação verificam as duas direções, conclusão sem letras ocultas e movimento reduzido.
- O teste de navegador de cobrança cobre consentimento, Pix explícito, falhas amigáveis, teclado, planos, faturas e persistência fictícia.
- A verificação do acesso cobre oito dimensões entre 320 e 1920 pixels, ausência de imagens rasterizadas e repetição apenas depois de recarregar.
- As regras de assinatura, autenticação e autorização existentes foram preservadas.
