# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: login-mobile-responsive.spec.ts >> login mobile responsivo em 320x568
- Location: e2e\login-mobile-responsive.spec.ts:105:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('login-layout')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByTestId('login-layout')

```

```yaml
- main:
  - heading "Restaurante não informado" [level=1]
  - paragraph: "Use o link do seu restaurante, por exemplo: /north-pizza."
```

# Test source

```ts
  15  |   { name: '440x956', width: 440, height: 956 },
  16  | ];
  17  | 
  18  | async function mockLoginBranding(page) {
  19  |   await page.route('**/settings/public/default**', async (route) => {
  20  |     await route.fulfill({
  21  |       status: 200,
  22  |       contentType: 'application/json',
  23  |       body: JSON.stringify({
  24  |         restaurantId: 3,
  25  |         primaryColor: '#d35d3c',
  26  |         restaurant: {
  27  |           name: 'North Pizza',
  28  |           description: 'Sabor que acolhe. Experiência que fica.',
  29  |           coverImage: LOGIN_COVER_URL,
  30  |           logo: null,
  31  |           category: 'PIZZARIA',
  32  |         },
  33  |       }),
  34  |     });
  35  |   });
  36  | 
  37  |   await page.route(LOGIN_COVER_URL, async (route) => {
  38  |     await route.fulfill({
  39  |       status: 200,
  40  |       contentType: 'image/jpeg',
  41  |       body: await readFile(LOGIN_COVER_FILE),
  42  |     });
  43  |   });
  44  | 
  45  |   await page.route('**/auth/google/client-id**', async (route) => {
  46  |     await route.fulfill({
  47  |       status: 200,
  48  |       contentType: 'application/json',
  49  |       body: JSON.stringify({ clientId: 'readme-client.apps.googleusercontent.com' }),
  50  |     });
  51  |   });
  52  | 
  53  |   await page.route('https://accounts.google.com/gsi/client', async (route) => {
  54  |     await route.fulfill({
  55  |       status: 200,
  56  |       contentType: 'text/javascript',
  57  |       body: `
  58  |         window.google = {
  59  |           accounts: {
  60  |             id: {
  61  |               initialize: function () {},
  62  |               renderButton: function (container) {
  63  |                 container.style.width = '100%';
  64  |                 container.innerHTML = '<button type="button" aria-label="Continuar com Google" style="width:100%;height:46px;border:1px solid #ded5cc;border-radius:999px;background:#fff;color:#2c241f;font:600 14px Arial,sans-serif;cursor:pointer">Continuar com Google</button>';
  65  |               }
  66  |             }
  67  |           }
  68  |         };
  69  |       `,
  70  |     });
  71  |   });
  72  | }
  73  | 
  74  | test('login desktop preserva identidade e hierarquia visual', async ({ page }) => {
  75  |   await page.setViewportSize({ width: 1440, height: 960 });
  76  |   await mockLoginBranding(page);
  77  |   await page.goto('/login');
  78  | 
  79  |   await expect(page.getByTestId('login-cover')).toBeVisible();
  80  |   await expect(page.getByTestId('login-card')).toBeVisible();
  81  |   await expect(page.getByText('North Pizza', { exact: true })).toBeVisible();
  82  |   await expect(page.getByText('Pizzaria', { exact: true })).toBeVisible();
  83  |   await expect(page.getByRole('button', { name: 'Entrar no Sistema' })).toBeVisible();
  84  | 
  85  |   const heroStyle = await page.getByTestId('login-hero-content').evaluate((element) => {
  86  |     const style = getComputedStyle(element);
  87  |     return { backgroundColor: style.backgroundColor, borderWidth: style.borderWidth };
  88  |   });
  89  |   expect(heroStyle).toEqual({ backgroundColor: 'rgba(0, 0, 0, 0)', borderWidth: '0px' });
  90  | 
  91  |   const categoryIconBackground = await page
  92  |     .getByTestId('login-category-icon')
  93  |     .evaluate((element) => getComputedStyle(element).backgroundColor);
  94  |   expect(categoryIconBackground).toBe('rgba(0, 0, 0, 0)');
  95  |   await captureReadmeScreenshot(page, 'login-desktop.png', { fullPage: true });
  96  | 
  97  |   const layout = await page.evaluate(() => ({
  98  |     viewportWidth: window.innerWidth,
  99  |     documentWidth: document.documentElement.scrollWidth,
  100 |   }));
  101 |   expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);
  102 | });
  103 | 
  104 | for (const viewport of MOBILE_VIEWPORTS) {
  105 |   test(`login mobile responsivo em ${viewport.name}`, async ({ page }) => {
  106 |     await page.setViewportSize({ width: viewport.width, height: viewport.height });
  107 |     await mockLoginBranding(page);
  108 |     await page.goto('/login');
  109 | 
  110 |     const layout = page.getByTestId('login-layout');
  111 |     const cover = page.getByTestId('login-cover');
  112 |     const coverImage = page.getByTestId('login-cover-image');
  113 |     const card = page.getByTestId('login-card');
  114 | 
> 115 |     await expect(layout).toBeVisible();
      |                          ^ Error: expect(locator).toBeVisible() failed
  116 |     await expect(cover).toBeVisible();
  117 |     await expect(coverImage).toBeVisible();
  118 |     await expect(card).toBeVisible();
  119 |     await expect(page.getByText('North Pizza', { exact: true })).toBeVisible();
  120 |     await expect(
  121 |       page.getByText('Acesse pedidos, cardápio e atendimento em poucos segundos.'),
  122 |     ).toBeVisible();
  123 | 
  124 |     if (viewport.name === '390x844') {
  125 |       await captureReadmeScreenshot(page, 'login-mobile.png', { fullPage: true });
  126 |     }
  127 | 
  128 |     const [coverBox, imageBox, cardBox] = await Promise.all([
  129 |       cover.boundingBox(),
  130 |       coverImage.boundingBox(),
  131 |       card.boundingBox(),
  132 |     ]);
  133 | 
  134 |     expect(coverBox).not.toBeNull();
  135 |     expect(imageBox).not.toBeNull();
  136 |     expect(cardBox).not.toBeNull();
  137 | 
  138 |     const expectedCoverHeight = Math.min(330, Math.max(230, viewport.height * 0.34));
  139 |     expect(Math.abs((coverBox?.height || 0) - expectedCoverHeight)).toBeLessThanOrEqual(4);
  140 |     expect(Math.abs((imageBox?.height || 0) - (coverBox?.height || 0))).toBeLessThanOrEqual(1);
  141 |     expect(Math.abs((imageBox?.width || 0) - (coverBox?.width || 0))).toBeLessThanOrEqual(1);
  142 | 
  143 |     const imageFit = await coverImage.evaluate((element) => getComputedStyle(element).objectFit);
  144 |     expect(imageFit).toBe('cover');
  145 | 
  146 |     expect(coverBox?.x || 0).toBeGreaterThanOrEqual(0);
  147 |     expect(coverBox?.width || 0).toBeGreaterThanOrEqual(viewport.width - 1);
  148 |     expect(cardBox?.left || 0).toBeGreaterThanOrEqual(0);
  149 |     expect(cardBox?.right || 0).toBeLessThanOrEqual(viewport.width + 1);
  150 | 
  151 |     const cardOffsetFromCover = (cardBox?.top || 0) - (coverBox?.bottom || 0);
  152 |     expect(cardOffsetFromCover).toBeGreaterThanOrEqual(-4);
  153 |     expect(cardOffsetFromCover).toBeLessThanOrEqual(48);
  154 | 
  155 |     const documentMetrics = await page.evaluate(() => ({
  156 |       innerWidth: window.innerWidth,
  157 |       innerHeight: window.innerHeight,
  158 |       scrollWidth: document.documentElement.scrollWidth,
  159 |       scrollHeight: document.documentElement.scrollHeight,
  160 |     }));
  161 | 
  162 |     expect(documentMetrics.scrollWidth).toBeLessThanOrEqual(documentMetrics.innerWidth);
  163 |     expect(documentMetrics.scrollHeight).toBeGreaterThanOrEqual(documentMetrics.innerHeight);
  164 | 
  165 |     const password = page.locator('#password');
  166 |     await expect(password).toHaveAttribute('type', 'password');
  167 |     await page.getByRole('button', { name: 'Mostrar senha' }).click();
  168 |     await expect(password).toHaveAttribute('type', 'text');
  169 |     await page.getByRole('button', { name: 'Ocultar senha' }).click();
  170 |     await expect(password).toHaveAttribute('type', 'password');
  171 | 
  172 |     const cardBackgroundBefore = await card.evaluate(
  173 |       (element) => getComputedStyle(element).backgroundColor,
  174 |     );
  175 |     await page.getByRole('button', { name: 'Ativar modo escuro' }).click();
  176 |     const cardBackgroundAfter = await card.evaluate(
  177 |       (element) => getComputedStyle(element).backgroundColor,
  178 |     );
  179 |     expect(cardBackgroundAfter).not.toBe(cardBackgroundBefore);
  180 |   });
  181 | }
  182 | 
```