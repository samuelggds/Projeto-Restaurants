import { expect, test } from '@playwright/test';

test('cliente monta o produto antes de adicioná-lo à sacola', async ({ page }) => {
  const product = {
    id: 101,
    name: 'Produto artesanal',
    description: 'Monte exatamente como preferir.',
    price: 30,
    active: true,
    stock: null,
    category: { name: 'Principais' },
    optionGroups: [
      {
        id: 10,
        name: 'Escolha a base',
        description: 'Selecione uma opção obrigatória.',
        required: true,
        selectionType: 'SINGLE',
        minSelections: 1,
        maxSelections: 1,
        options: [
          { id: 1001, ingredientId: 1, active: true, ingredient: { id: 1, name: 'Base fina', price: 0, active: true } },
          { id: 1002, ingredientId: 2, active: true, ingredient: { id: 2, name: 'Base grossa', price: 3, active: true } },
        ],
      },
      {
        id: 20,
        name: 'Adicionais',
        required: false,
        selectionType: 'MULTIPLE',
        minSelections: 0,
        maxSelections: 2,
        options: [
          { id: 2001, ingredientId: 3, active: true, ingredient: { id: 3, name: 'Queijo especial', price: 5, active: true } },
        ],
      },
    ],
  };

  await page.route('http://127.0.0.1:3000/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === '/settings/public/slug/restaurante-teste') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ restaurantId: 9, restaurantName: 'Restaurante Teste', primaryColor: '#d64d08', isOpenForOrders: true, restaurant: { id: 9, name: 'Restaurante Teste' } }) });
      return;
    }
    if (pathname === '/settings/public/9') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ restaurantId: 9, restaurantName: 'Restaurante Teste', primaryColor: '#d64d08', isOpenForOrders: true, restaurant: { id: 9, name: 'Restaurante Teste' } }) });
      return;
    }
    if (pathname === '/products') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ products: [product] }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/restaurante-teste');

  await expect(page.getByText('Produto artesanal').first()).toBeVisible();
  await page.getByRole('button', { name: 'Ver detalhes de Produto artesanal' }).click();
  await expect(page.getByRole('dialog', { name: 'Montar Produto artesanal' })).toBeVisible();

  await page.getByRole('button', { name: 'Adicionar à sacola' }).click();
  await expect(page.getByText(/Escolha 1 opção/).last()).toBeVisible();
  await page.getByText('Base grossa').click();
  await page.getByText('Queijo especial').click();
  await page.getByPlaceholder(/cortar ao meio/).fill('Embalagem separada');
  await expect(page.getByText('R$ 38,00').last()).toBeVisible();
  await page.getByRole('button', { name: 'Adicionar à sacola' }).click();

  await expect(page.getByRole('heading', { name: 'Minha sacola' })).toBeVisible();
  await expect(page.getByText('Base grossa')).toBeVisible();
  await expect(page.getByText('Queijo especial')).toBeVisible();
  await expect(page.getByText('Embalagem separada')).toBeVisible();
});
