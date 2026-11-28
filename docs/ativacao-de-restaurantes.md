# Ativação de restaurantes no site oficial da GastroNexa

As quatro vitrines demonstram um pedido completo com dados fictícios. O botão **Ativar meu restaurante** leva ao cadastro do proprietário. O mesmo cadastro abre diretamente pela landing. A vitrine visitada contextualiza a tela. O dono escolhe explicitamente o ramo da sua loja entre as onze categorias disponíveis.

## Cadastro e abertura da loja

- O Super Admin controla o acesso em **Configurações → Assinaturas**. Para oferecer ativação imediata, habilite **Permitir auto cadastro** e desmarque **Exigir aprovação manual**. Com aprovação manual ou cadastro desabilitado, o site oferece contato com a equipe.
- O proprietário confirma o e-mail com um código enviado pelo SMTP da plataforma. A criação ocorre em uma transação, inclui um administrador da própria loja e um período de teste sem débito inicial. A entrada posterior usa o portal privado e respeita a política de autenticação em duas etapas.
- O plano fornece o valor e a duração do teste. O cadastro conta dias de segunda a sexta no fuso de São Paulo. A tolerância após uma fatura vencer segue a política de cobrança separada.
- Cada loja recebe suas próprias categorias, produtos, fotos e preços sugeridos. As fotos iniciais são ilustrativas. O dono pode editar valores e descrições e ocultar itens antes de abrir.
- No próprio site, o dono autenticado pode fotografar os produtos ou o cardápio impresso. A análise usa os créditos disponíveis e apresenta um rascunho. A foto de produto é aproveitada diretamente. Em uma página de cardápio, cada foto é recortada quando a IA identifica sua associação ao prato. O dono pode trocar a imagem, completar campos e confirmar o que entra no catálogo.
- A loja começa fechada. O dono confere o endereço, a retirada, a entrega e a taxa antes de autorizar a abertura para pedidos. O cardápio público é o do novo restaurante.

## Verificações do fluxo

- Exercitar a chamada da landing e das quatro vitrines em tela pequena e grande, incluindo a alternativa quando a demonstração abre em outra aba.
- No cadastro, visitar a pizzaria e escolher hamburgueria. Conferir que o tipo é obrigatório, que a loja criada tem o catálogo correspondente e que repetir a ativação retorna a mesma loja.
- Verificar autenticação do proprietário, comportamento com aprovação manual, limites de tentativas e separação entre restaurantes.
- Testar fotos de produto e cardápio com vários pratos. Rever nome, descrição, preço e imagem. Um preço ausente exige preenchimento antes da publicação.
- Executar os testes HTTP e PostgreSQL do cadastro e o cenário Playwright em `frontend/e2e/restaurant-trial.spec.ts`. O teste de navegador usa respostas de serviços substituídas. O teste PostgreSQL usa o servidor e o fluxo de login com o transporte SMTP substituído.
