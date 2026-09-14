# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin-orders-refund.spec.ts >> central de pedidos mantém hierarquia e ações acessíveis em desktop e mobile
- Location: e2e\admin-orders-refund.spec.ts:151:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Acompanhe cada pedido sem perder o ritmo' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('heading', { name: 'Acompanhe cada pedido sem perder o ritmo' })

```

```yaml
- complementary "Menu administrativo":
  - button "Recolher menu lateral"
  - text: RT Restaurante Teste Painel administrativo
  - navigation "Navegação principal do painel":
    - button "Visão geral"
    - button "Pedidos"
    - button "Cardápio"
    - button "Clientes"
    - button "Funcionários"
    - button "Cobranças e assinaturas"
    - button "Configurações"
  - button "Central de ajuda"
  - text: RT Administrador Gestão da loja
  - button "Sair"
- main:
  - text: PAINEL / ORDERS
  - heading "Pedidos" [level=1]
  - paragraph: Acompanhe e gerencie a operação em um só lugar.
  - text: Atendimento ao cliente
  - strong: Suporte dos pedidos
  - paragraph: Converse com clientes e visitantes sem misturar o atendimento com a operação do pedido.
  - text: 0 casos abertos
  - button "Abrir atendimentos"
  - region "Sua fila está sob controle":
    - text: Central de pedidos
    - heading "Sua fila está sob controle" [level=2]
    - paragraph: Pagamentos, preparo e entregas organizados para sua equipe agir com segurança e rapidez.
    - text: 0 ativos 0 em andamento 0 entregues
    - complementary:
      - text: Prioridade agora
      - strong: Nenhuma pendência operacional
      - paragraph: Continue acompanhando o histórico e aguarde novos pedidos.
      - button "Ver todos os pedidos"
      - text: Restaurante Teste
  - region "Resumo dos pedidos":
    - button "Mostrar pedidos ativos":
      - text: Pedidos ativos
      - strong: "0"
      - emphasis: Precisam de acompanhamento
    - button "Mostrar pedidos aguardando pagamento":
      - text: Aguardando pagamento
      - strong: "0"
      - emphasis: Confirme somente após receber
    - button "Mostrar pedidos em andamento":
      - text: Em andamento
      - strong: "0"
      - emphasis: Preparo, pronto ou em rota
    - button "Mostrar pedidos entregues":
      - text: Entregues
      - strong: "0"
      - emphasis: Pedidos concluídos
  - text: OPERAÇÃO EM TEMPO REAL
  - heading "Fila de atendimento" [level=2]
  - paragraph: Encontre o pedido certo e veja exatamente qual ação precisa ser tomada.
  - text: A atualização está pendente
  - navigation "Visualizações rápidas da fila":
    - button "Todos 0" [pressed]
    - button "Ativos 0"
    - button "Pagamento 0"
    - button "Em andamento 0"
    - button "Entregues 0"
  - text: Buscar pedido
  - textbox "Buscar pedido por número ou cliente":
    - /placeholder: Número do pedido ou nome do cliente
  - text: Status específico
  - combobox "Filtrar pedidos por status":
    - option "Todos os status" [selected]
    - option "Pendente"
    - option "Em preparo"
    - option "Pronto"
    - option "Saiu para entrega"
    - option "Entregue"
    - option "Cancelado"
  - status:
    - strong: "0"
    - text: pedidos encontrados
  - alert:
    - paragraph: Não foi possível carregar os pedidos. Tente novamente.
    - button "Tentar novamente"
  - text: Nenhum pedido para exibir
```

# Test source

```ts
  62  | 
  63  | async function mockAdminApi(page: Page, state: TestState) {
  64  |   await page.route(/^http:\/\/(127\.0\.0\.1|localhost):3000\/.*$/, async (route) => {
  65  |     const request = route.request();
  66  |     const pathname = new URL(request.url()).pathname;
  67  |     const method = request.method();
  68  | 
  69  |     if (pathname === '/auth/me') {
  70  |       await route.fulfill({
  71  |         status: 200,
  72  |         contentType: 'application/json',
  73  |         body: JSON.stringify({
  74  |           user: {
  75  |             id: 9,
  76  |             name: 'Admin Teste',
  77  |             role: 'ADMIN',
  78  |             restaurantId: RESTAURANT_ID,
  79  |           },
  80  |         }),
  81  |       });
  82  |       return;
  83  |     }
  84  | 
  85  |     if (pathname === '/orders' && method === 'GET') {
  86  |       await route.fulfill({
  87  |         status: 200,
  88  |         contentType: 'application/json',
  89  |         body: JSON.stringify({ orders: state.orders }),
  90  |       });
  91  |       return;
  92  |     }
  93  | 
  94  |     if (pathname === '/orders/701/refund' && method === 'PATCH') {
  95  |       state.refundRequests += 1;
  96  |       state.orders = state.orders.map((order) =>
  97  |         order.id === 701
  98  |           ? {
  99  |               ...order,
  100 |               status: 'CANCELADO',
  101 |               refundStatus: 'SUCCEEDED',
  102 |             }
  103 |           : order,
  104 |       );
  105 |       await route.fulfill({
  106 |         status: 200,
  107 |         contentType: 'application/json',
  108 |         body: JSON.stringify({
  109 |           order: state.orders.find((order) => order.id === 701),
  110 |           refunded: true,
  111 |         }),
  112 |       });
  113 |       return;
  114 |     }
  115 | 
  116 |     const responses: Record<string, unknown> = {
  117 |       '/products': { products: [] },
  118 |       '/ingredients': { ingredients: [] },
  119 |       '/categories': { categories: [] },
  120 |       '/coupons': { coupons: [] },
  121 |       '/settings': { id: 1, restaurant: { id: RESTAURANT_ID, name: 'Restaurante Teste' } },
  122 |       '/billing/invoices': { invoices: [] },
  123 |       '/banners': [],
  124 |       '/employees': { employees: [] },
  125 |       '/ai-support/messages': { messages: [] },
  126 |     };
  127 | 
  128 |     await route.fulfill({
  129 |       status: 200,
  130 |       contentType: 'application/json',
  131 |       body: JSON.stringify(responses[pathname] ?? {}),
  132 |     });
  133 |   });
  134 | 
  135 |   await page.addInitScript(() => {
  136 |     localStorage.clear();
  137 |     sessionStorage.clear();
  138 |     localStorage.setItem(
  139 |       'user',
  140 |       JSON.stringify({
  141 |         id: 9,
  142 |         name: 'Admin Teste',
  143 |         role: 'ADMIN',
  144 |         restaurantId: 9,
  145 |       }),
  146 |     );
  147 |   });
  148 |   await mockAuthRefresh(page, 9, 'e2e-admin-token');
  149 | }
  150 | 
  151 | test('central de pedidos mantém hierarquia e ações acessíveis em desktop e mobile', async ({
  152 |   page,
  153 | }) => {
  154 |   const state = createState();
  155 |   await page.setViewportSize({ width: 1440, height: 960 });
  156 |   await mockAdminApi(page, state);
  157 |   await page.goto('/admin');
  158 |   await page.getByRole('button', { name: 'Pedidos', exact: true }).click();
  159 | 
  160 |   await expect(
  161 |     page.getByRole('heading', { name: 'Acompanhe cada pedido sem perder o ritmo' }),
> 162 |   ).toBeVisible();
      |     ^ Error: expect(locator).toBeVisible() failed
  163 |   await expect(page.getByText('Prioridade agora')).toBeVisible();
  164 |   await expect(
  165 |     page.getByRole('navigation', { name: 'Visualizações rápidas da fila' }),
  166 |   ).toBeVisible();
  167 |   await expect(page.getByRole('button', { name: 'Mostrar pedidos ativos' })).toBeVisible();
  168 | 
  169 |   const assertNoHorizontalOverflow = async () => {
  170 |     const dimensions = await page.evaluate(() => ({
  171 |       viewportWidth: window.innerWidth,
  172 |       documentWidth: document.documentElement.scrollWidth,
  173 |     }));
  174 |     expect(dimensions.documentWidth - dimensions.viewportWidth).toBeLessThanOrEqual(1);
  175 |   };
  176 | 
  177 |   await assertNoHorizontalOverflow();
  178 |   await page.setViewportSize({ width: 390, height: 844 });
  179 |   await expect(page.getByRole('button', { name: 'Mostrar pedidos ativos' })).toBeVisible();
  180 |   await expect(page.getByLabel('Buscar pedido por número ou cliente')).toBeVisible();
  181 |   await assertNoHorizontalOverflow();
  182 | });
  183 | 
  184 | test('admin cancela Pix online com estorno único e distingue pagamento na entrega', async ({
  185 |   page,
  186 | }) => {
  187 |   const state = createState();
  188 |   await mockAdminApi(page, state);
  189 |   await page.goto('/admin');
  190 | 
  191 |   await page.getByRole('button', { name: 'Pedidos', exact: true }).click();
  192 | 
  193 |   const onlinePixOrder = page.locator('article.order-card').filter({ hasText: '#701' });
  194 |   await expect(onlinePixOrder).toContainText('Cliente Pix Online');
  195 |   await expect(onlinePixOrder).toContainText('Pago online');
  196 |   await expect(onlinePixOrder).toContainText(
  197 |     'Ao cancelar, o estorno online será solicitado automaticamente',
  198 |   );
  199 | 
  200 |   const payOnDeliveryOrder = page.locator('article.order-card').filter({ hasText: '#702' });
  201 |   await expect(payOnDeliveryOrder).toContainText('Pago na entrega');
  202 |   await expect(payOnDeliveryOrder).toContainText('Pagamento na entrega exige devolução manual');
  203 |   await expect(payOnDeliveryOrder).not.toContainText('estorno automático ao cancelar');
  204 |   await expect(
  205 |     payOnDeliveryOrder.getByRole('button', { name: 'Cancelar e estornar o pedido #702' }),
  206 |   ).toHaveCount(0);
  207 | 
  208 |   await onlinePixOrder.getByRole('button', { name: 'Cancelar e estornar o pedido #701' }).click();
  209 | 
  210 |   const confirmation = page.getByRole('dialog');
  211 |   await expect(confirmation).toContainText('Cancelar pedido e solicitar estorno?');
  212 |   await expect(confirmation).toContainText(
  213 |     'o estorno de R$ 72,50 será solicitado automaticamente no Pix',
  214 |   );
  215 |   await confirmation.getByRole('button', { name: 'Cancelar e estornar', exact: true }).click();
  216 | 
  217 |   await expect.poll(() => state.refundRequests).toBe(1);
  218 |   await expect(page.getByText('Pedido #701 cancelado e estorno solicitado.')).toBeVisible();
  219 |   await expect(onlinePixOrder).toContainText('Cancelado');
  220 |   await expect(onlinePixOrder).toContainText('Estorno concluído no mesmo meio de pagamento');
  221 |   expect(state.refundRequests).toBe(1);
  222 | });
  223 | 
```