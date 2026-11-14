import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { adminSidebarNavigationGroups } from '../src/pages/admin/config/adminSidebarItems';
import { settingItems, sectionTitle } from '../src/pages/admin/config/adminNavigation';
import { mockAdminVisuals } from './helpers/adminVisualFixtures';

const output = process.env.README_SCREENSHOT_OUTPUT_DIR;
test.use({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });

test('all admin areas and settings remain accessible on desktop and mobile', async ({ page }) => {
  test.setTimeout(360_000);
  const errors: string[] = [];
  const screens: { id: string; label: string; group: string; desktop: string; mobile: string }[] =
    [];
  page.on('pageerror', (error) => errors.push(error.message));
  const writes = await mockAdminVisuals(page);
  await page.goto('/admin');
  await expect(
    page.getByRole('heading', { name: 'Visão geral', exact: true, level: 1 }),
  ).toBeVisible();
  const navigation = page.getByRole('navigation', { name: 'Navegação principal do painel' });
  async function capture(id: string, label: string, group: string) {
    await expect(
      page.getByText(
        /^(Carregando painel|Carregando equipe|Carregando pagamentos|Carregando clientes|Carregando atendimentos)/,
      ),
    ).toHaveCount(0);
    await page.evaluate(() => document.fonts.ready);
    for (const [device, width, height] of [
      ['desktop', 1440, 1000],
      ['mobile', 390, 844],
    ] as const) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => {
        scrollTo(0, 0);
        document.querySelectorAll('*').forEach((element) => {
          if (element.scrollTop) element.scrollTop = 0;
        });
      });
      await expect(page.locator('main').first()).toBeVisible();
      const overflowing = await page.evaluate(() => {
        if (document.documentElement.scrollWidth <= innerWidth + 1) return [];
        return [...document.querySelectorAll('body *')]
          .filter(
            (e) =>
              e.getBoundingClientRect().right > innerWidth + 1 &&
              getComputedStyle(e).position !== 'fixed',
          )
          .slice(0, 8)
          .map((e) => ({ tag: e.tagName, text: e.textContent?.slice(0, 80), class: e.className }));
      });
      expect.soft(overflowing, `${id} ${device}: horizontal overflow`).toEqual([]);
      if (output) {
        await mkdir(output, { recursive: true });
        await page.screenshot({
          path: path.join(output, `${id}-${device}.png`),
          fullPage: true,
          animations: 'disabled',
        });
      }
    }
    screens.push({ id, label, group, desktop: `${id}-desktop.png`, mobile: `${id}-mobile.png` });
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
  for (const group of adminSidebarNavigationGroups)
    for (const item of group.items) {
      if (item.area === 'settings') continue;
      await navigation.getByRole('button', { name: item.label, exact: true }).click();
      await expect(page.locator('[data-admin-root]')).toHaveAttribute('data-admin-area', item.area);
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      if (item.area === 'customers')
        await expect(
          page.getByRole('heading', { name: 'Conheça quem compra no seu restaurante' }),
        ).toBeVisible();
      await capture(`area-${item.area}`, item.label, 'Abas do painel');
      if (item.area === 'coupons') {
        await page.getByRole('tab', { name: 'Cupons de Fidelidade' }).click();
        await capture('coupons-loyalty', 'Cupons de fidelidade', 'Abas e cadastros');
      }
      if (item.area === 'subscriptions') {
        for (const label of ['Planos', 'Cobranças']) {
          await page.getByRole('tab', { name: new RegExp(`^${label}`) }).click();
          await capture(
            `billing-${label === 'Planos' ? 'plans' : 'invoices'}`,
            `Assinatura · ${label}`,
            'Abas e cadastros',
          );
        }
      }
      if (item.area === 'employees') {
        await page.getByRole('button', { name: 'Novo funcionário', exact: true }).click();
        await capture('employee-new', 'Cadastro de funcionário', 'Abas e cadastros');
        await page.getByRole('button', { name: 'Fechar cadastro de funcionário' }).click();
      }
      if (item.area === 'catalog') {
        for (const [id, label] of [
          ['categories', 'Categorias'],
          ['ingredients', 'Ingredientes (1)'],
          ['combos', 'Combos'],
        ]) {
          await page.getByRole('button', { name: label, exact: true }).click();
          await capture(
            `catalog-${id}`,
            `Cardápio · ${label.replace(' (1)', '')}`,
            'Abas e cadastros',
          );
          if (id === 'ingredients') {
            await page.getByRole('button', { name: 'Novo ingrediente' }).click();
            await capture('ingredient-new', 'Cadastro de ingrediente', 'Abas e cadastros');
            await page.getByRole('button', { name: 'Fechar cadastro de ingrediente' }).click();
          }
          if (id === 'combos') {
            await page.getByRole('button', { name: 'Novo combo' }).click();
            await capture('combo-new', 'Cadastro de combo', 'Abas e cadastros');
            await page
              .getByRole('dialog')
              .getByRole('button', { name: 'Fechar', exact: true })
              .click();
          }
        }
        await page.getByRole('button', { name: 'Importar cardápio', exact: true }).click();
        await capture('catalog-import-link', 'Importar cardápio · link', 'Abas e cadastros');
        await page.getByRole('tab', { name: 'Foto do cardápio' }).click();
        await capture('catalog-import-photo', 'Importar cardápio · foto', 'Abas e cadastros');
        await page.getByRole('button', { name: 'Voltar ao cardápio' }).click();
      }
    }
  await page.getByRole('button', { name: 'Central de ajuda', exact: true }).first().click();
  await capture('area-help', 'Central de ajuda', 'Abas do painel');
  await navigation.getByRole('button', { name: 'Configurações', exact: true }).click();
  for (const [section, label] of settingItems) {
    await page
      .locator('aside')
      .filter({ has: page.getByRole('textbox', { name: 'Buscar configuração' }) })
      .getByRole('button', { name: label, exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: sectionTitle[section], level: 1, exact: true }),
    ).toBeVisible();
    if (section !== 'brand')
      await expect(page.locator(`[data-settings-section="${section}"]`)).toBeVisible();
    await capture(`settings-${section}`, sectionTitle[section], 'Configurações');
    if (section === 'employee-payments') {
      for (const [id, label] of [
        ['hours', 'Horas'],
        ['settlements', 'Acertos'],
        ['ledger', 'Ledger'],
      ]) {
        await page.getByRole('tab', { name: label, exact: true }).click();
        await capture(`employee-${id}`, `Pagamento da equipe · ${label}`, 'Abas e cadastros');
      }
    }
    if (section === 'courier-payments') {
      await page.getByRole('tab', { name: 'Acertos e conferência' }).click();
      await capture(
        'courier-settlements',
        'Motoqueiros · Acertos e conferência',
        'Abas e cadastros',
      );
    }
    if (section === 'nfc-registration') {
      const tabs = page.getByRole('navigation', { name: 'Áreas do atendimento NFC' });
      for (const [id, label] of [
        ['registry', 'Cadastro de clientes'],
        ['linked', 'Clientes vinculados'],
        ['cards', 'Cartões'],
      ]) {
        await tabs.getByRole('button', { name: label, exact: true }).click();
        await capture(`nfc-${id}`, `NFC · ${label}`, 'Abas e cadastros');
      }
    }
  }
  // A narrow phone still exposes the navigation and instructional controls.
  await page.setViewportSize({ width: 320, height: 760 });
  await page.locator('[data-admin-screen-guide] summary').click();
  await expect(page.locator('[data-admin-screen-guide] ol')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await navigation.getByRole('button', { name: 'Cardápio', exact: true }).click();
  await page.getByRole('button', { name: 'Produtos', exact: true }).click();
  await page.getByRole('button', { name: 'Novo produto', exact: true }).first().click();
  await capture('product-type', 'Produto · Tipo de venda', 'Cadastro de produto');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('textbox', { name: /Nome do produto/ }).fill('Pizza da casa');
  await page.getByRole('combobox', { name: /Categoria/ }).selectOption('1');
  await capture('product-basics', 'Produto · Informações básicas', 'Cadastro de produto');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('spinbutton').first().fill('49.90');
  await capture('product-price', 'Produto · Preço', 'Cadastro de produto');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await capture('product-appearance', 'Produto · Foto e descrição', 'Cadastro de produto');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await capture(
    'product-availability',
    'Produto · Disponibilidade e estoque',
    'Cadastro de produto',
  );
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await capture('product-review', 'Produto · Revisão antes de salvar', 'Cadastro de produto');
  // Review the alternate product type without persisting the draft.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Visão geral', level: 1 })).toBeVisible();
  await navigation.getByRole('button', { name: 'Cardápio', exact: true }).click();
  await page.getByRole('button', { name: 'Novo produto', exact: true }).first().click();
  await page.getByRole('radio', { name: /Produto personalizável/ }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('textbox', { name: /Nome do produto/ }).fill('Pizza personalizada');
  await page.getByRole('combobox', { name: /Categoria/ }).selectOption('1');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('spinbutton').first().fill('49.90');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Como o cliente poderá personalizar?' }),
  ).toBeVisible();
  await capture('product-customization', 'Produto · Personalização', 'Cadastro de produto');
  await page.getByRole('button', { name: /Uma única opção/ }).click();
  await capture('product-options', 'Produto · Etapas e opções', 'Cadastro de produto');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Visão geral', level: 1 })).toBeVisible();
  await navigation.getByRole('button', { name: 'Configurações', exact: true }).click();
  const guide = page.locator('[data-admin-screen-guide]');
  await guide.locator('summary').click();
  await capture('settings-guide', 'Guia de configuração expandido', 'Orientações');
  await page
    .getByRole('textbox', { name: /Nome do restaurante/ })
    .fill('Restaurante Exemplo • revisão');
  await guide.getByRole('button', { name: /Próxima/ }).click();
  await expect(page.getByRole('dialog', { name: 'Você tem alterações pendentes' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Marca e identidade', level: 1 })).toBeVisible();
  await capture('settings-unsaved', 'Confirmação de alterações pendentes', 'Orientações');
  await page.getByRole('button', { name: 'Não salvar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Dados do negócio', level: 1 })).toBeVisible({
    timeout: 10000,
  });
  await page
    .getByRole('button', { name: 'Abrir GastroNexa IA', exact: true })
    .filter({ visible: true })
    .click();
  await capture('assistant', 'Assistente GastroNexa IA', 'Orientações');
  await page.getByRole('button', { name: 'Tour guiado', exact: true }).click();
  await capture('assistant-tour', 'Áreas do tour guiado', 'Orientações');
  await page.getByRole('button', { name: 'Fechar GastroNexa IA' }).click();
  await page.goto('/admin/profile');
  await expect(page.getByRole('heading', { name: 'Seu perfil de administrador' })).toBeVisible();
  for (const [id, label] of [
    ['data', 'Meus dados'],
    ['security', 'Segurança'],
    ['notifications', 'Notificações'],
  ]) {
    await page
      .getByRole('navigation', { name: 'Navegação do perfil administrativo' })
      .getByRole('button', { name: new RegExp(`^${label}`) })
      .click();
    await capture(`profile-${id}`, `Minha conta · ${label}`, 'Perfil do administrador');
  }
  // The visual walkthrough must never create or change restaurant records.
  if (output) await writeFile(path.join(output, 'screens.json'), JSON.stringify(screens, null, 2));
  expect(writes).toEqual([]);
  expect(errors).toEqual([]);
});
